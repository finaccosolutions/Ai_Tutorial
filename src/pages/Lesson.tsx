import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ArrowLeft, Send, X } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService from '../services/geminiService';
import slideService from '../services/slideService';
import SlidePresentation from '../components/tutorial/SlidePresentation';
import type { SlidePresentation as SlidePresentationType } from '../services/slideService';

const Lesson: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
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

  useEffect(() => {
    if (!topicId || !preferences?.subject || !preferences?.knowledgeLevel || !geminiApiKey) {
      setError('Missing required information to load the tutorial.');
      return;
    }
    
    const loadPresentation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        slideService.initialize(geminiApiKey);
        const generatedPresentation = await slideService.generateSlidePresentation(
          preferences.subject,
          preferences.knowledgeLevel
        );
        setPresentation(generatedPresentation);
      } catch (error: any) {
        console.error('Error loading presentation:', error);
        setError(error.message || 'Failed to load presentation content. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPresentation();
  }, [topicId, preferences, geminiApiKey]);

  const handleAskQuestion = async () => {
    if (!question.trim() || !preferences?.subject || !preferences?.knowledgeLevel) return;
    
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
      setAnswer(error.message || 'Sorry, I couldn\'t process your question. Please try again.');
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
          <h2 className="text-2xl font-semibold text-neutral-800">Preparing your tutorial...</h2>
          <p className="mt-2 text-neutral-600">This may take a few moments</p>
        </motion.div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-lg px-4">
          <div className="text-red-500 mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Unable to Load Tutorial</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Topics
          </button>
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
              <span className="font-medium">Back to Topics</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
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
          
          <div className="space-y-8">
            <SlidePresentation presentation={presentation} />
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
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnswering ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="h-5 w-5" />
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