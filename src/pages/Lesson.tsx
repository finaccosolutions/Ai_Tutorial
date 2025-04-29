import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, MessageSquare, ArrowLeft, Mic, X, Send, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { speak, stopSpeaking } from '../services/voiceService';
import geminiService, { TutorialSection, Topic } from '../services/geminiService';

const Lesson: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();
  
  // State
  const [sections, setSections] = useState<TutorialSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  
  // Load topics and find current topic index
  useEffect(() => {
    const loadTopics = async () => {
      if (!preferences?.subject) return;
      
      try {
        const topicsList = await geminiService.generateTopicsList(preferences.subject);
        setTopics(topicsList);
        const index = topicsList.findIndex(topic => topic.id === topicId);
        setCurrentTopicIndex(index >= 0 ? index : 0);
      } catch (error) {
        console.error('Error loading topics:', error);
      }
    };
    
    loadTopics();
  }, [preferences?.subject, topicId]);

  // Load tutorial content
  useEffect(() => {
    if (!topicId || !preferences?.subject || !preferences?.knowledgeLevel) {
      setError('Missing required information to load the tutorial.');
      return;
    }
    
    const loadTutorial = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const content = await geminiService.generateTutorialContent(
          topicId,
          preferences.subject,
          preferences.knowledgeLevel
        );
        setSections(content);
        setCurrentSectionIndex(0);
        setIsPaused(true);
        setIsSpeaking(false);
      } catch (error: any) {
        console.error('Error loading tutorial:', error);
        setError(error.message || 'Failed to load tutorial content. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTutorial();
  }, [topicId, preferences]);

  // Handle playback
  useEffect(() => {
    if (!sections[currentSectionIndex] || isPaused || !isSpeaking) {
      stopSpeaking();
      return;
    }

    const section = sections[currentSectionIndex];
    const text = `${section.title}. ${section.content}`;
    
    speak(text, () => {
      if (currentSectionIndex < sections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
      } else {
        setIsSpeaking(false);
        setIsPaused(true);
      }
    });

    return () => stopSpeaking();
  }, [currentSectionIndex, sections, isPaused, isSpeaking]);

  // Navigation between topics
  const navigateToTopic = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? currentTopicIndex + 1 
      : currentTopicIndex - 1;
    
    if (newIndex >= 0 && newIndex < topics.length) {
      navigate(`/lesson/${topics[newIndex].id}`);
    }
  };

  // Playback controls
  const togglePlayback = () => {
    setIsPaused(!isPaused);
    if (isPaused && !isSpeaking) {
      setIsSpeaking(true);
    }
  };

  const toggleSpeech = () => {
    setIsSpeaking(!isSpeaking);
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  // Handle questions
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
      
      if (isSpeaking) {
        speak(response);
      }
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

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-lg px-4">
          <div className="text-red-500 mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Unable to Load Tutorial</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Topics
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
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
              onClick={togglePlayback}
              className={`p-2 rounded-full ${
                isPaused ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'
              } hover:bg-primary-200`}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-full ${
                isSpeaking ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'
              } hover:bg-primary-200`}
            >
              {isSpeaking ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
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

      {/* Topic Navigation */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => navigateToTopic('prev')}
            disabled={currentTopicIndex === 0}
            className={`flex items-center text-sm font-medium ${
              currentTopicIndex === 0 
                ? 'text-neutral-400 cursor-not-allowed' 
                : 'text-primary-600 hover:text-primary-700'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous Topic
          </button>
          
          <h1 className="text-lg font-semibold text-primary-800">
            {topics[currentTopicIndex]?.title || 'Loading...'}
          </h1>
          
          <button
            onClick={() => navigateToTopic('next')}
            disabled={currentTopicIndex === topics.length - 1}
            className={`flex items-center text-sm font-medium ${
              currentTopicIndex === topics.length - 1
                ? 'text-neutral-400 cursor-not-allowed'
                : 'text-primary-600 hover:text-primary-700'
            }`}
          >
            Next Topic
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex">
        {/* Tutorial Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-8 p-6 rounded-lg ${
                    index === currentSectionIndex
                      ? 'bg-primary-50 border-2 border-primary-200'
                      : 'bg-white border border-neutral-200'
                  }`}
                >
                  <h2 className="text-2xl font-bold mb-4 text-neutral-900">{section.title}</h2>
                  <div className="prose max-w-none mb-6">
                    <p className="text-neutral-700">{section.content}</p>
                  </div>
                  
                  {section.examples.length > 0 && (
                    <div className="bg-white rounded-lg border border-neutral-200 p-4">
                      <h3 className="text-lg font-semibold mb-3 text-neutral-800">Examples</h3>
                      <div className="space-y-3">
                        {section.examples.map((example, i) => (
                          <div key={i} className="text-neutral-600">
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Lesson;