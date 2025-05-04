import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ArrowLeft, Volume2, VolumeX, X, AlertCircle } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService from '../services/geminiService';
import slideService from '../services/slideService';
import SlidePresentation from '../components/tutorial/SlidePresentation';
import Transcript from '../components/tutorial/Transcript';
import Quiz from '../components/tutorial/Quiz';
import type { SlidePresentation as SlidePresentationType } from '../services/slideService';

interface Caption {
  start: number;
  end: number;
  text: string;
}

const Lesson: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { preferences } = useUserPreferences();
  const { geminiApiKey } = useAuth();
  const navigate = useNavigate();
  
  const [presentation, setPresentation] = useState<SlidePresentationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);

  // Load presentation content
  useEffect(() => {
    const loadPresentation = async () => {
      if (!lessonId || !preferences?.subject || !preferences?.knowledgeLevel || !geminiApiKey) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        slideService.initialize(geminiApiKey);
        const generatedPresentation = await slideService.generateSlidePresentation(
          preferences.subject,
          preferences.knowledgeLevel
        );
        setPresentation(generatedPresentation);

        // Generate captions
        const generatedCaptions = generatedPresentation.slides.reduce<Caption[]>((acc, slide, index) => {
          const startTime = acc.length > 0 ? acc[acc.length - 1].end : 0;
          return [...acc, {
            start: startTime,
            end: startTime + slide.duration,
            text: slide.narration
          }];
        }, []);
        setCaptions(generatedCaptions);
      } catch (error: any) {
        console.error('Error loading presentation:', error);
        setError(error.message || 'Failed to load presentation content');
      } finally {
        setIsLoading(false);
      }
    };

    loadPresentation();
  }, [lessonId, preferences, geminiApiKey]);

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    
    // Show quiz every 5 minutes
    if (Math.floor(time) % 300 === 0) {
      setShowQuiz(true);
    }
  };

  const handleQuizComplete = (correct: boolean) => {
    setShowQuiz(false);
    // You could track progress here
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !preferences?.subject) return;
    
    setIsAnswering(true);
    setAnswer(null);

    try {
      const response = await geminiService.answerQuestion(
        question,
        preferences.subject,
        preferences.knowledgeLevel
      );
      setAnswer(response);
    } catch (error: any) {
      console.error('Error getting answer:', error);
      setAnswer('Sorry, I couldn\'t process your question. Please try again.');
    } finally {
      setIsAnswering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-semibold text-neutral-800">Preparing your lesson...</h2>
          <p className="mt-2 text-neutral-600">This may take a few moments</p>
        </motion.div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-neutral-200">
            <div className="flex items-center justify-center mb-6">
              <AlertCircle className="h-12 w-12 text-error-500" />
            </div>
            <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Unable to Load Lesson</h2>
            <p className="text-neutral-600 mb-6">{error}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary flex items-center"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-neutral-700 hover:text-primary-600"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
              className={`p-2 rounded-full ${
                isSpeakingEnabled ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'
              } hover:bg-primary-200`}
              title={isSpeakingEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {isSpeakingEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-full ${
                showChat ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'
              } hover:bg-primary-200`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-neutral-800 mb-8">{presentation.title}</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Slide Presentation */}
              <SlidePresentation
                presentation={presentation}
                isSpeakingEnabled={isSpeakingEnabled}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>

            {/* Transcript */}
            <div className="lg:col-span-1">
              <Transcript
                captions={captions}
                currentTime={currentTime}
                onTimestampClick={(time) => {
                  // Handle seeking to specific time
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: 384, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 384, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l border-neutral-200 z-40"
          >
            <div className="flex flex-col h-full">
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
                {answer && (
                  <div className="mb-4">
                    <div className="bg-neutral-100 rounded-lg p-3 mb-2">
                      <p className="text-neutral-800">{question}</p>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-3 ml-4">
                      <p className="text-primary-800">{answer}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-neutral-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="input flex-grow"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAskQuestion();
                      }
                    }}
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={isAnswering || !question.trim()}
                    className="btn btn-primary"
                  >
                    {isAnswering ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lesson;