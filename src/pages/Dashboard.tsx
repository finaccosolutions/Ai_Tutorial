import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, CheckCircle, User2, Settings, MessageSquare, Search, Volume2, VolumeX } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useLesson, Course, Lesson } from '../contexts/LessonContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService, { TutorialSection } from '../services/geminiService';
import { speak, stopSpeaking } from '../services/voiceService';

const Dashboard: React.FC = () => {
  const { preferences } = useUserPreferences();
  const { currentCourse, loadCourse, isLoading } = useLesson();
  const { geminiApiKey } = useAuth();
  const navigate = useNavigate();
  
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [tutorialSections, setTutorialSections] = useState<TutorialSection[]>([]);
  const [isTutorialStarted, setIsTutorialStarted] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('https://d-id.com/api/talks/tlk_sample');
  
  // Check if onboarding is complete
  useEffect(() => {
    if (preferences && !preferences.onboardingCompleted) {
      navigate('/onboarding');
    }
  }, [preferences, navigate]);
  
  // Load course data
  useEffect(() => {
    if (preferences?.onboardingCompleted && !currentCourse && !isLoading) {
      loadCourse();
    }
  }, [preferences, currentCourse, loadCourse, isLoading]);

  // Load topics
  useEffect(() => {
    if (preferences?.subject) {
      const loadTopics = async () => {
        try {
          const response = await geminiService.generateTopics(preferences.subject);
          setTopics(response);
        } catch (error) {
          console.error('Error loading topics:', error);
        }
      };
      loadTopics();
    }
  }, [preferences?.subject]);
  
  // Start tutorial for selected topic
  const startTutorial = async () => {
    if (!selectedTopic) return;

    try {
      const sections = await geminiService.generateTutorialContent(
        selectedTopic,
        preferences?.knowledgeLevel || 'beginner'
      );
      setTutorialSections(sections);
      setIsTutorialStarted(true);
      setShowChat(true);
      setCurrentSectionIndex(0);
    } catch (error) {
      console.error('Error generating tutorial:', error);
    }
  };

  // Handle section navigation
  const goToNextSection = () => {
    if (currentSectionIndex < tutorialSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const goToPreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  // Toggle speech
  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      const currentSection = tutorialSections[currentSectionIndex];
      if (currentSection) {
        speak(currentSection.content);
        setIsSpeaking(true);
      }
    }
  };

  // Handle asking questions
  const handleAskQuestion = async () => {
    if (!question.trim() || !isTutorialStarted) return;
    
    setIsAnswering(true);
    try {
      const response = await geminiService.answerQuestion(
        question,
        selectedTopic || preferences?.subject || '',
        preferences?.knowledgeLevel || 'beginner'
      );
      setAnswer(response);
      
      if (isSpeaking) {
        speak(response);
      }
    } catch (error: any) {
      console.error('Error getting answer:', error);
      setAnswer(error.message || 'Sorry, I could not process your question. Please try again.');
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="bg-neutral-50 min-h-screen pb-12">
      {/* Hero Section */}
      <div className="bg-primary-600 text-white py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Welcome to Your Learning Journey
            </h1>
            <p className="text-primary-100 text-lg max-w-3xl">
              Select a topic to start learning through interactive tutorials
            </p>
            
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>Subject: <strong>{preferences?.subject}</strong></span>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center">
                <User2 className="h-5 w-5 mr-2" />
                <span>Level: <strong>{preferences?.knowledgeLevel}</strong></span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 md:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Topics and Tutorial */}
          <div className="lg:col-span-2">
            {/* Topics */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Topics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {topics.map((topic, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg text-left transition-all ${
                      selectedTopic === topic
                        ? 'bg-primary-100 border-primary-300'
                        : 'bg-white border-neutral-200 hover:border-primary-200'
                    } border shadow-sm`}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setIsTutorialStarted(false);
                      setTutorialSections([]);
                      setAnswer('');
                    }}
                  >
                    <h3 className="font-medium text-neutral-800">{topic}</h3>
                  </motion.button>
                ))}
              </div>

              {selectedTopic && !isTutorialStarted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <button
                    onClick={startTutorial}
                    className="btn btn-primary"
                  >
                    Start Tutorial: {selectedTopic}
                  </button>
                </motion.div>
              )}
            </div>

            {/* Tutorial Content */}
            {isTutorialStarted && tutorialSections.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                {/* Video Avatar */}
                <div className="aspect-video bg-neutral-900 relative">
                  <iframe
                    src={avatarUrl}
                    className="w-full h-full"
                    allow="camera; microphone; autoplay; display-capture; fullscreen"
                  ></iframe>
                  
                  {/* Controls */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                      onClick={toggleSpeech}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                      {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-neutral-800">
                      {tutorialSections[currentSectionIndex].title}
                    </h2>
                    <div className="text-sm text-neutral-500">
                      Section {currentSectionIndex + 1} of {tutorialSections.length}
                    </div>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-neutral-700 leading-relaxed mb-6">
                      {tutorialSections[currentSectionIndex].content}
                    </p>

                    {tutorialSections[currentSectionIndex].examples.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-neutral-800 mb-3">Examples</h3>
                        <div className="space-y-3">
                          {tutorialSections[currentSectionIndex].examples.map((example, index) => (
                            <div
                              key={index}
                              className="bg-neutral-50 border border-neutral-200 rounded-lg p-4"
                            >
                              <p className="text-neutral-700">{example}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between mt-8">
                    <button
                      onClick={goToPreviousSection}
                      disabled={currentSectionIndex === 0}
                      className="btn btn-secondary"
                    >
                      Previous Section
                    </button>
                    <button
                      onClick={goToNextSection}
                      disabled={currentSectionIndex === tutorialSections.length - 1}
                      className="btn btn-primary"
                    >
                      Next Section
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Interface */}
            {isTutorialStarted && (
              <div className="mt-8 bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-neutral-800">Ask Questions</h2>
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask anything about the topic..."
                      className="input flex-grow"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
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
                        <Search className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {answer && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                      >
                        <p className="text-neutral-800 whitespace-pre-wrap">{answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/lesson/new')}
                  className="w-full btn btn-primary flex items-center justify-center"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start New Tutorial
                </button>
                
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full btn btn-secondary flex items-center justify-center"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </button>
              </div>
            </div>
            
            {/* Progress */}
            {currentCourse && (
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Your Progress</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600">Overall Progress</span>
                      <span className="font-medium text-primary-600">{currentCourse.progress}%</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${currentCourse.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-primary-600">
                        {currentCourse.lessons.filter(l => l.completed).length}
                      </div>
                      <div className="text-sm text-neutral-600">Completed</div>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-primary-600">
                        {currentCourse.lessons.length}
                      </div>
                      <div className="text-sm text-neutral-600">Total Lessons</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;