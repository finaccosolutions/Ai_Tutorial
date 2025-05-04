// Voice service for text-to-speech and speech-to-text functionality

let currentUtterance: SpeechSynthesisUtterance | null = null;

// Text-to-speech function
export const speak = (
  text: string, 
  onEnd?: () => void, 
  rate = 1
): SpeechSynthesisUtterance | null => {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported in this browser');
    return null;
  }

  // Cancel any ongoing speech
  stopSpeaking();

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;
  
  // Wait for voices to be loaded
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(voice => voice.lang.includes('en'));
    const femaleVoices = englishVoices.filter(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.includes('Samantha') ||
      voice.name.includes('Victoria')
    );
    
    if (femaleVoices.length > 0) {
      utterance.voice = femaleVoices[0];
    } else if (englishVoices.length > 0) {
      utterance.voice = englishVoices[0];
    }
    
    // Set properties
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Event handlers
    utterance.onend = () => {
      currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      currentUtterance = null;
    };
    
    // Start speaking
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to start speech:', error);
      currentUtterance = null;
    }
  };

  // Check if voices are already loaded
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    loadVoices();
  } else {
    // Wait for voices to be loaded
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  
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
  const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Speech recognition not supported in this browser');
    return { stop: () => {} };
  }
  
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  onStateChange(ListeningState.LISTENING);
  
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
  
  recognition.start();
  
  return {
    stop: () => {
      recognition.stop();
      onStateChange(ListeningState.INACTIVE);
    }
  };
};