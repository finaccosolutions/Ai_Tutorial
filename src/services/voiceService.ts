// Voice service for text-to-speech and speech-to-text functionality

let currentUtterance: SpeechSynthesisUtterance | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

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

  // Reset retry count for new speech
  retryCount = 0;

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
      if (currentUtterance === utterance) {
        currentUtterance = null;
        retryCount = 0;
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      
      // Only handle error if this is still the current utterance
      if (currentUtterance !== utterance) {
        return;
      }

      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retrying speech synthesis (attempt ${retryCount}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          try {
            // Ensure we're not already speaking and this is still the current utterance
            if (!window.speechSynthesis.speaking && currentUtterance === utterance) {
              window.speechSynthesis.cancel(); // Clear any pending speech
              window.speechSynthesis.resume(); // Ensure synthesis isn't paused
              window.speechSynthesis.speak(utterance);
            }
          } catch (error) {
            console.error('Failed to retry speech:', error);
          }
        }, RETRY_DELAY * retryCount); // Increase delay with each retry
      } else {
        // Max retries reached, reset state
        console.error('Max retries reached for speech synthesis');
        currentUtterance = null;
        retryCount = 0;
        if (onEnd) onEnd(); // Call onEnd to allow presentation to continue
      }
    };
    
    // Start speaking
    try {
      // Ensure we're not already speaking
      if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); // Clear any pending speech
        window.speechSynthesis.resume(); // Ensure synthesis isn't paused
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Failed to start speech:', error);
      currentUtterance = null;
      if (onEnd) onEnd(); // Call onEnd to allow presentation to continue
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
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume(); // Ensure synthesis isn't paused
      currentUtterance = null;
      retryCount = 0;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
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