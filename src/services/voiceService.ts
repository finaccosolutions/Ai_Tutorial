// Voice service for text-to-speech and speech-to-text functionality

let currentUtterance: SpeechSynthesisUtterance | null = null;

// Text-to-speech function
export const speak = (text: string, onEnd?: () => void, rate = 1, pitch = 1): SpeechSynthesisUtterance | null => {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported in this browser');
    return null;
  }

  // Only stop if there's an ongoing utterance
  if (currentUtterance) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;
  
  // Wait for voices to be loaded
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const englishVoices = voices.filter(voice => voice.lang.includes('en'));
      const femaleVoices = englishVoices.filter(voice => voice.name.includes('Female') || voice.name.includes('female'));
      
      if (femaleVoices.length > 0) {
        utterance.voice = femaleVoices[0];
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
      
      // Set properties
      utterance.rate = rate;
      utterance.pitch = pitch;
      
      // Event handlers
      utterance.onend = () => {
        currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        // Only reset if this is the current utterance
        if (currentUtterance === utterance) {
          currentUtterance = null;
        }
        // Attempt to resume speaking if interrupted
        if (event.error === 'interrupted' && currentUtterance === utterance) {
          setTimeout(() => speak(text, onEnd, rate, pitch), 100);
        }
      };
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
    } else {
      // If voices aren't loaded yet, wait and try again
      setTimeout(loadVoices, 50);
    }
  };

  loadVoices();
  return utterance;
};

// Stop speaking
export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
};

// Speech recognition states
export enum ListeningState {
  INACTIVE,
  LISTENING,
  PROCESSING
}

// Speech recognition function
export const startListening = (
  onResult: (text: string) => void,
  onStateChange: (state: ListeningState) => void,
  onError: (error: string) => void
): { stop: () => void } => {
  // Check if browser supports SpeechRecognition
  const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Speech recognition not supported in this browser');
    return { stop: () => {} };
  }
  
  // Create recognition instance
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US'; // Default to English
  
  // Set state to listening
  onStateChange(ListeningState.LISTENING);
  
  // Event handlers
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    if (event.results[0].isFinal) {
      onStateChange(ListeningState.PROCESSING);
      onResult(transcript);
    }
  };
  
  recognition.onerror = (event) => {
    onError(`Error: ${event.error}`);
    onStateChange(ListeningState.INACTIVE);
  };
  
  recognition.onend = () => {
    onStateChange(ListeningState.INACTIVE);
  };
  
  // Start listening
  recognition.start();
  
  // Return stop function
  return {
    stop: () => {
      recognition.stop();
      onStateChange(ListeningState.INACTIVE);
    }
  };
};