// Voice service for text-to-speech and speech-to-text functionality

let currentUtterance: SpeechSynthesisUtterance | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;
let lastSpeakPosition = 0;
let currentText = '';
let wordTimings: { word: string; start: number; end: number }[] = [];
let speechStartTime: number;
let isIntentionalStop = false;

export const speak = (
  text: string, 
  onEnd?: () => void, 
  rate = 1,
  startPosition = 0
): SpeechSynthesisUtterance | null => {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported in this browser');
    return null;
  }

  // Reset retry count and intentional stop flag for new speech
  retryCount = 0;
  isIntentionalStop = false;
  currentText = text;

  // Calculate word timings
  const words = text.split(' ');
  const totalDuration = (text.length / rate) * 50; // Approximate duration based on text length
  const timePerWord = totalDuration / words.length;
  
  wordTimings = words.map((word, index) => ({
    word,
    start: index * timePerWord,
    end: (index + 1) * timePerWord
  }));

  // Cancel any ongoing speech
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;
  lastSpeakPosition = startPosition;
  
  // If resuming from a position, skip to that part of the text
  if (startPosition > 0) {
    const wordsToSkip = wordTimings.filter(timing => timing.start < startPosition);
    const remainingText = words.slice(wordsToSkip.length).join(' ');
    utterance.text = remainingText;
  }
  
  // Wait for voices to be loaded
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a voice in the user's preferred language
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
      
      if (currentUtterance !== utterance || isIntentionalStop) {
        return;
      }

      // Don't retry if the error was due to an intentional interruption
      if (event.error === 'interrupted') {
        currentUtterance = null;
        retryCount = 0;
        if (onEnd) onEnd();
        return;
      }

      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retrying speech synthesis (attempt ${retryCount}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          try {
            if (!window.speechSynthesis.speaking && currentUtterance === utterance) {
              window.speechSynthesis.speak(utterance);
            }
          } catch (error) {
            console.error('Failed to retry speech:', error);
          }
        }, RETRY_DELAY * retryCount);
      } else {
        console.error('Max retries reached for speech synthesis');
        currentUtterance = null;
        retryCount = 0;
        if (onEnd) onEnd();
      }
    };
    
    try {
      if (!window.speechSynthesis.speaking) {
        speechStartTime = Date.now();
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Failed to start speech:', error);
      currentUtterance = null;
      if (onEnd) onEnd();
    }
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    loadVoices();
  } else {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  
  return utterance;
};

export const stopSpeaking = (): void => {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    try {
      isIntentionalStop = true;
      if (currentUtterance) {
        // Store the current position before stopping
        const elapsedTime = (Date.now() - speechStartTime) / 1000;
        lastSpeakPosition = elapsedTime;
      }
      window.speechSynthesis.cancel();
      currentUtterance = null;
      retryCount = 0;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }
};

export const resumeSpeaking = (
  onEnd?: () => void,
  rate = 1
): SpeechSynthesisUtterance | null => {
  isIntentionalStop = false;
  return speak(currentText, onEnd, rate, lastSpeakPosition);
};

export const getCurrentWordTiming = (currentTime: number): number => {
  const timing = wordTimings.findIndex(
    timing => currentTime >= timing.start && currentTime < timing.end
  );
  return timing >= 0 ? timing : wordTimings.length;
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