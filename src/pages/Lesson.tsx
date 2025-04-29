import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, MessageSquare, ArrowLeft, Mic, X, Send } from 'lucide-react';
import { useLesson } from '../contexts/LessonContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { speak, stopSpeaking, startListening, ListeningState } from '../services/voiceService';
import geminiService from '../services/geminiService';

const Lesson: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();
  
  // State
  const [tutorialContent, setTutorialContent] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [listeningState, setListeningState] = useState<ListeningState>(ListeningState.INACTIVE);
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // Load initial content
  useEffect(() => {
    loadTutorialContent();
  }, [preferences]);
  
  const loadTutorialContent = async () => {
    if (!preferences?.subject || !preferences?.knowledgeLevel) return;
    
    setIsLoading(true);
    try {
      const content = await geminiService.generateTutorialContent(
        preferences.subject,
        preferences.knowledgeLevel
      );
      setTutorialContent(content);
      setCurrentSection(content);
    } catch (error) {
      console.error('Error loading tutorial:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle text-to-speech
  useEffect(() => {
    if (!currentSection || !isSpeaking || isPaused) {
      stopSpeaking();
      return;
    }
    
    const utterance = speak(currentSection, () => {
      // When current section finishes, load next section
      loadNextSection();
    });
    
    return () => {
      stopSpeaking();
    };
  }, [currentSection, isSpeaking, isPaused]);
  
  // Load next section of content
  const loadNextSection = async () => {
    if (!preferences?.subject || !preferences?.knowledgeLevel) return;
    
    try {
      const nextContent = await geminiService.generateNextSection(
        tutorialContent,
        preferences.subject,
        preferences.knowledgeLevel
      );
      setTutorialContent(prev => `${prev}\n\n${nextContent}`);
      setCurrentSection(nextContent);
    } catch (error) {
      console.error('Error loading next section:', error);
    }
  };
  
  // Handle voice recognition
  useEffect(() => {
    if (!isListening) return;
    
    const recognition = startListening(
      (text) => {
        if (text.toLowerCase().includes('pause')) {
          setIsPaused(true);
        } else if (text.toLowerCase().includes('continue')) {
          setIsPaused(false);
        } else {
          setCurrentQuestion(text);
          handleAskQuestion(text);
        }
      },
      setListeningState,
      (error) => console.error('Speech recognition error:', error)
    );
    
    return () => {
      recognition.stop();
    };
  }, [isListening]);
  
  // Handle asking questions
  const handleAskQuestion = async (question: string) => {
    if (!question.trim() || !preferences?.subject || !preferences?.knowledgeLevel) return;
    
    setIsPaused(true);
    setCurrentQuestion(question);
    setCurrentAnswer(null);
    
    try {
      const answer = await geminiService.answerQuestion(
        question,
        preferences.subject,
        preferences.knowledgeLevel
      );
      setCurrentAnswer(answer);
      
      // Speak the answer if voice is enabled
      if (isSpeaking) {
        await new Promise(resolve => {
          speak(answer, resolve);
        });
      }
    } catch (error) {
      console.error('Error getting answer:', error);
      setCurrentAnswer('Sorry, I couldn\'t process that question. Please try again.');
    }
  };
  
  // Playback controls
  const togglePlayback = () => {
    setIsPaused(!isPaused);
  };
  
  const toggleVoice = () => {
    setIsSpeaking(!isSpeaking);
  };
  
  const toggleListening = () => {
    setIsListening(!isListening);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-semibold text-neutral-800">Preparing your personalized tutorial...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-neutral-700 hover:text-primary-600"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlayback}
              className={`p-2 rounded-full ${isPaused ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            
            <button
              onClick={toggleVoice}
              className={`p-2 rounded-full ${isSpeaking ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
            >
              {isSpeaking ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            
            <button
              onClick={toggleListening}
              className={`p-2 rounded-full ${isListening ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
            >
              <Mic className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-full ${showChat ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'} hover:bg-primary-200`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex">
        <div className="flex-1 p-6 overflow-y-auto" ref={contentRef}>
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-lg">
              {tutorialContent.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-96 bg-white border-l border-neutral-200 flex flex-col"
            >
              <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Questions & Answers</h2>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {currentQuestion && (
                  <div className="mb-4">
                    <div className="bg-neutral-100 rounded-lg p-3 mb-2">
                      <p className="text-neutral-800">{currentQuestion}</p>
                    </div>
                    {currentAnswer ? (
                      <div className="bg-primary-50 rounded-lg p-3 ml-4">
                        <p className="text-primary-800">{currentAnswer}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-neutral-200">
                <div className="flex space-x-2">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAskQuestion(currentQuestion);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAskQuestion(currentQuestion)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Recognition Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="bg-primary-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75"></div>
                <div className="relative h-3 w-3 bg-white rounded-full"></div>
              </div>
              <span>Listening... Ask a question or say "pause"/"continue"</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lesson;