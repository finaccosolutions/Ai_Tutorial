// Voice service for text-to-speech and speech-to-text functionality

// Text-to-speech function
export const speak = (text: string, onEnd?: () => void, rate = 1, pitch = 1): SpeechSynthesisUtterance | null => {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported in this browser');
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Select voice (English female voice if available)
  const voices = window.speechSynthesis.getVoices();
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
    if (onEnd) onEnd();
  };
  
  // Start speaking
  window.speechSynthesis.speak(utterance);
  
  return utterance;
};

// Stop speaking
export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Speech recognition states
export enum ListeningState {
  INACTIVE,
  LISTENING,
  PROCESSING
}

// Mock speech recognition function (in a real app, use Web Speech API or a library)
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