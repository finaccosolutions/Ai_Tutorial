import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, MessageSquare, ArrowLeft, Mic, X, Send } from 'lucide-react';
import { useLesson } from '../contexts/LessonContext';
import { speak, stopSpeaking, startListening, ListeningState } from '../services/voiceService';

const Lesson: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { 
    currentLesson, 
    loadLesson, 
    isLoading,
    isPaused,
    isSpeaking,
    isListening,
    currentQuestion,
    currentAnswer,
    togglePause,
    toggleSpeaking,
    toggleListening,
    askQuestion
  } = useLesson();
  const navigate = useNavigate();
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState('');
  const [listeningState, setListeningState] = useState<ListeningState>(ListeningState.INACTIVE);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [subtitles, setSubtitles] = useState('');
  const [showSubtitles, setShowSubtitles] = useState(true);
  
  // Load lesson data
  useEffect(() => {
    if (lessonId) {
      loadLesson(lessonId);
    }
  }, [lessonId, loadLesson]);
  
  // Text-to-speech control
  useEffect(() => {
    if (!currentLesson || !contentRef.current) return;
    
    let speechInstance: SpeechSynthesisUtterance | null = null;
    let currentIndex = 0;
    const textElements = Array.from(contentRef.current.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
    
    const speakNext = () => {
      if (currentIndex >= textElements.length) {
        // End of content
        return;
      }
      
      const element = textElements[currentIndex];
      setHighlightedElement(element);
      setSubtitles(element.textContent || '');
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Speak the content
      speechInstance = speak(element.textContent || '', () => {
        currentIndex++;
        speakNext();
      });
      
      // Add highlight class
      element.classList.add('bg-primary-100', 'rounded', 'px-1');
    };
    
    // Start or stop speaking based on isSpeaking state
    if (isSpeaking && !isPaused) {
      speakNext();
    } else {
      stopSpeaking();
      
      // Remove highlights
      if (highlightedElement) {
        highlightedElement.classList.remove('bg-primary-100', 'rounded', 'px-1');
        setHighlightedElement(null);
        setSubtitles('');
      }
    }
    
    // Cleanup
    return () => {
      stopSpeaking();
      textElements.forEach(el => {
        el.classList.remove('bg-primary-100', 'rounded', 'px-1');
      });
      setHighlightedElement(null);
      setSubtitles('');
    };
  }, [isSpeaking, isPaused, currentLesson]);
  
  // Voice recognition
  useEffect(() => {
    if (!isListening) return;
    
    let recognitionInstance: { stop: () => void } | null = null;
    
    const handleResult = (text: string) => {
      // Process the transcribed text
      setMessage(text);
      
      // If the text starts with a trigger phrase like "Hey Tutor"
      if (text.toLowerCase().includes('hey tutor') || text.toLowerCase().includes('i have a question')) {
        // Extract the question part
        const questionPart = text.toLowerCase().replace(/hey tutor|i have a question/gi, '').trim();
        if (questionPart) {
          askQuestion(questionPart);
        }
      }
    };
    
    recognitionInstance = startListening(
      handleResult,
      setListeningState,
      (error) => console.error('Speech recognition error:', error)
    );
    
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [isListening, askQuestion]);
  
  // Send a text question
  const handleSendMessage = () => {
    if (message.trim()) {
      askQuestion(message);
      setMessage('');
    }
  };
  
  // Submit on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Toggle chat panel
  const toggleChat = () => {
    setShowChat(!showChat);
    
    // Focus the input when opening chat
    if (!showChat && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 300);
    }
  };
  
  // Navigate back to dashboard
  const goToDashboard = () => {
    stopSpeaking();
    navigate('/dashboard');
  };
  
  // Loading state
  if (isLoading || !currentLesson) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-semibold text-neutral-800 mb-2">Loading lesson...</h2>
          <p className="text-neutral-600">Preparing your personalized content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Lesson Header */}
      <div className="bg-white border-b border-neutral-200 py-3 px-4">
        <div className="container mx-auto max-w-6xl flex justify-between items-center">
          <button 
            onClick={goToDashboard}
            className="flex items-center text-neutral-700 hover:text-primary-600"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-lg md:text-xl font-semibold text-neutral-800">{currentLesson.title}</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePause}
              className={`p-2 rounded-full ${isPaused ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
              aria-label={isPaused ? 'Resume lesson' : 'Pause lesson'}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            
            <button
              onClick={toggleSpeaking}
              className={`p-2 rounded-full ${isSpeaking ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
              aria-label={isSpeaking ? 'Mute audio' : 'Enable audio'}
            >
              {isSpeaking ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            
            <button
              onClick={toggleListening}
              className={`p-2 rounded-full ${isListening ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
              aria-label={isListening ? 'Disable voice input' : 'Enable voice input'}
            >
              <Mic className="h-5 w-5" />
            </button>
            
            <button
              onClick={toggleChat}
              className={`p-2 rounded-full ${showChat ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
              aria-label={showChat ? 'Close chat' : 'Open chat'}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Voice listening indicator */}
      <AnimatePresence>
        {isListening && listeningState !== ListeningState.INACTIVE && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center">
              {listeningState === ListeningState.LISTENING ? (
                <>
                  <div className="relative mr-2">
                    <div className="h-3 w-3 bg-white rounded-full animate-ping absolute opacity-75"></div>
                    <div className="h-3 w-3 bg-white rounded-full relative"></div>
                  </div>
                  <span>Listening... Say "Hey Tutor" to ask a question</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 bg-white rounded-full mr-2"></div>
                  <span>Processing...</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Subtitles */}
      <AnimatePresence>
        {showSubtitles && subtitles && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4"
          >
            <div className="bg-neutral-900/80 backdrop-blur-sm text-white px-6 py-4 rounded-lg shadow-lg">
              <p className="text-center">{subtitles}</p>
              <button
                onClick={() => setShowSubtitles(false)}
                className="absolute top-2 right-2 text-neutral-300 hover:text-white"
                aria-label="Close subtitles"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col md:flex-row">
        {/* Lesson content */}
        <div className="flex-grow md:w-1/2 md:border-r border-neutral-200 overflow-y-auto">
          <div className="container mx-auto max-w-3xl px-6 py-8">
            <div 
              ref={contentRef}
              className="prose max-w-none prose-primary"
              dangerouslySetInnerHTML={{ __html: currentLesson.content }}
            ></div>
          </div>
        </div>
        
        {/* Visual content */}
        <div className="md:w-1/2 p-6 bg-white flex items-center justify-center">
          <div className="max-w-md mx-auto">
            <img 
              src={currentLesson.visualContent} 
              alt="Lesson visual aid" 
              className="rounded-lg shadow-md max-h-[500px] object-cover mx-auto"
            />
          </div>
        </div>
      </div>
      
      {/* Q&A Panel (Slide in from right) */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed top-[61px] right-0 bottom-0 w-full sm:w-[400px] bg-white shadow-xl border-l border-neutral-200 z-40 flex flex-col"
          >
            <div className="p-4 border-b border-neutral-200">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-lg">Questions & Answers</h2>
                <button 
                  onClick={toggleChat}
                  className="p-1 rounded-full hover:bg-neutral-100"
                >
                  <X className="h-5 w-5 text-neutral-500" />
                </button>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {currentLesson.questions.length > 0 ? (
                currentLesson.questions.map((qa) => (
                  <div key={qa.id} className="space-y-2">
                    <div className="bg-neutral-100 p-3 rounded-tl-lg rounded-tr-lg rounded-br-lg">
                      <p className="text-neutral-800">{qa.question}</p>
                    </div>
                    <div className="bg-primary-100 p-3 rounded-tl-lg rounded-tr-lg rounded-bl-lg ml-4">
                      <p className="text-primary-800">{qa.answer}</p>
                    </div>
                  </div>
                ))
              ) : currentQuestion ? (
                <div className="space-y-2">
                  <div className="bg-neutral-100 p-3 rounded-tl-lg rounded-tr-lg rounded-br-lg">
                    <p className="text-neutral-800">{currentQuestion}</p>
                  </div>
                  {currentAnswer ? (
                    <div className="bg-primary-100 p-3 rounded-tl-lg rounded-tr-lg rounded-bl-lg ml-4">
                      <p className="text-primary-800">{currentAnswer}</p>
                    </div>
                  ) : (
                    <div className="bg-primary-50 p-3 rounded-tl-lg rounded-tr-lg rounded-bl-lg ml-4 flex items-center">
                      <div className="h-3 w-3 bg-primary-400 rounded-full mr-2 animate-pulse"></div>
                      <p className="text-primary-600">Generating answer...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">Ask a question about the lesson</p>
                  <p className="text-sm text-neutral-400 mt-1">Type below or use voice command "Hey Tutor, [your question]"</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-neutral-200">
              <div className="flex space-x-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  className="input flex-grow"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className={`btn btn-primary ${!message.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lesson;