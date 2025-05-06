let currentUtterance: SpeechSynthesisUtterance | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

export const speak = (
  text: string, 
  onEnd?: () => void, 
  rate = 1,
  onBoundary?: (event: SpeechSynthesisEvent) => void
): SpeechSynthesisUtterance | null => {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported in this browser');
    if (onEnd) onEnd();
    return null;
  }

  // Stop any existing speech before starting new one
  stopSpeaking();

  retryCount = 0;
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;
  
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    
    const preferredVoices = voices.filter(voice => 
      voice.lang.toLowerCase().includes('en') || 
      voice.lang.toLowerCase().includes('hi') ||
      voice.lang.toLowerCase().includes('ml') ||
      voice.lang.toLowerCase().includes('ta') ||
      voice.lang.toLowerCase().includes('kn') ||
      voice.lang.toLowerCase().includes('te') ||
      voice.lang.toLowerCase().includes('mr')
    );
    
    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0];
    } else if (voices.length > 0) {
      utterance.voice = voices[0];
    }
    
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
        retryCount = 0;
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      
      // If this utterance is no longer current, ignore the error
      if (currentUtterance !== utterance) {
        return;
      }

      // Always clean up the current utterance
      currentUtterance = null;

      // Handle interrupted speech or other errors
      if (event.error === 'interrupted' || retryCount >= MAX_RETRIES) {
        retryCount = 0;
        if (onEnd) onEnd();
        return;
      }

      // For other errors, attempt retries
      retryCount++;
      console.log(`Retrying speech synthesis (attempt ${retryCount}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel(); // Clear any pending speech
          window.speechSynthesis.speak(utterance);
        } catch (error) {
          console.error('Failed to retry speech:', error);
          currentUtterance = null;
          if (onEnd) onEnd();
        }
      }, RETRY_DELAY * retryCount);
    };

    if (onBoundary) {
      utterance.onboundary = onBoundary;
    }
    
    try {
      window.speechSynthesis.cancel(); // Clear any pending speech
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to start speech:', error);
      currentUtterance = null;
      if (onEnd) onEnd();
    }
  };

  // Handle voice loading
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    loadVoices();
  } else {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  
  return utterance;
};

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      if (currentUtterance) {
        currentUtterance = null;
        retryCount = 0;
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }
};

export enum ListeningState {
  INACTIVE,
  LISTENING,
  PROCESSING
}

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