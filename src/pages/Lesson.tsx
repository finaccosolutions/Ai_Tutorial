import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, MessageSquare, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { supabase } from '../lib/supabase';
import geminiService from '../services/geminiService';
import slideService from '../services/slideService';
import SlidePresentation from '../components/tutorial/SlidePresentation';
import Quiz from '../components/tutorial/Quiz';
import type { SlidePresentation as SlidePresentationType } from '../services/slideService';

const Lesson: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { preferences } = useUserPreferences();
  const { geminiApiKey, user } = useAuth();
  const navigate = useNavigate();
  
  const [presentation, setPresentation] = useState<SlidePresentationType | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [quizData, setQuizData] = useState({
    question: "What is the main concept covered in this section?",
    options: [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    correctAnswer: 0
  });

  useEffect(() => {
    const storedTopic = localStorage.getItem('selectedTopic');
    if (storedTopic) {
      setSelectedTopic(JSON.parse(storedTopic));
    } else {
      navigate('/dashboard');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const loadPresentation = async () => {
      if (!selectedTopic || !preferences?.subject || !preferences?.knowledgeLevel || !geminiApiKey || !user) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: presentations } = await supabase
          .from('presentation_cache')
          .select('presentation_data')
          .eq('user_id', user.id)
          .eq('topic_id', selectedTopic.id);

        if (presentations && presentations.length > 0) {
          setPresentation(presentations[0].presentation_data as SlidePresentationType);
          setIsLoading(false);
          return;
        }

        slideService.initialize(geminiApiKey);
        const generatedPresentation = await slideService.generateSlidePresentation(
          selectedTopic.title,
          preferences.knowledgeLevel,
          preferences.language,
          selectedTopic.learningObjectives
        );

        const { error: insertError } = await supabase
          .from('presentation_cache')
          .upsert({
            user_id: user.id,
            topic_id: selectedTopic.id,
            presentation_data: generatedPresentation
          });

        if (insertError) {
          console.error('Error caching presentation:', insertError);
        }

        setPresentation(generatedPresentation);
      } catch (error: any) {
        console.error('Error loading presentation:', error);
        setError(error.message || 'Failed to load presentation content');
      } finally {
        setIsLoading(false);
      }
    };

    loadPresentation();
  }, [selectedTopic, preferences, geminiApiKey, user]);

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    
    if (Math.floor(time) % 300 === 0) {
      setShowQuiz(true);
    }
  };

  const handleQuizComplete = (correct: boolean) => {
    setShowQuiz(false);
    // Additional quiz completion logic can be added here
  };

  const handleSlideChange = (index: number) => {
    setCurrentSlideIndex(index);
  };

  const handlePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !selectedTopic) return;
    
    setIsAnswering(true);
    setAnswer(null);

    try {
      const response = await geminiService.answerQuestion(
        question,
        selectedTopic.title,
        preferences?.knowledgeLevel || 'beginner',
        preferences?.language || 'english'
      );
      setAnswer(response);
    } catch (error: any) {
      console.error('Error getting answer:', error);
      setAnswer('Sorry, I couldn\'t process your question. Please try again.');
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 py-4 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-neutral-700 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
              className={`p-2 rounded-full transition-colors ${
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
              className={`p-2 rounded-full transition-colors ${
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
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-neutral-800 mb-8">{selectedTopic?.title}</h1>
            
            <div className="space-y-8">
              {isLoading ? (
                <div className="min-h-[60vh] flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                    <h2 className="text-2xl font-semibold text-neutral-800">Loading your lesson...</h2>
                    <p className="mt-2 text-neutral-600">This may take a few moments</p>
                  </div>
                </div>
              ) : error ? (
                <div className="min-h-[60vh] flex items-center justify-center">
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
              ) : presentation && (
                <SlidePresentation
                  presentation={presentation}
                  isSpeakingEnabled={isSpeakingEnabled}
                  isPaused={isPaused}
                  onPlayPause={handlePlayPause}
                  onTimeUpdate={handleTimeUpdate}
                  onSlideChange={handleSlideChange}
                  currentSlideIndex={currentSlideIndex}
                />
              )}
            </div>
          </motion.div>
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
              <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-gradient-to-r from-primary-50 to-primary-100">
                <h2 className="text-lg font-semibold text-primary-900">Questions & Answers</h2>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-neutral-500 hover:text-neutral-700 transition-colors"
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

              <div className="p-4 border-t border-neutral-200 bg-white">
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

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6"
            >
              <Quiz 
                question={quizData.question}
                options={quizData.options}
                correctAnswer={quizData.correctAnswer}
                onComplete={handleQuizComplete}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lesson;