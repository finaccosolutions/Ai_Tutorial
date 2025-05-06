import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, User2, Settings, Clock, Target, Award, RefreshCw, Edit, ChevronRight, BookMarked, Sparkles, Brain } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService, { Topic } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { preferences, updatePreferences, savePreferences } = useUserPreferences();
  const { geminiApiKey, user } = useAuth();
  const navigate = useNavigate();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  // Load or generate topics when preferences change
  useEffect(() => {
    if (!preferences?.subject || !preferences?.knowledgeLevel || !preferences?.language || !geminiApiKey) {
      setIsLoading(false);
      return;
    }

    const loadTopics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (preferences.topics && preferences.topics.length > 0) {
          setTopics(preferences.topics);
          setIsLoading(false);
          return;
        }

        const newTopics = await geminiService.generateTopicsList(
          preferences.subject,
          preferences.knowledgeLevel,
          preferences.language,
          preferences.learningGoals || []
        );
        
        await updatePreferences({
          ...preferences,
          topics: newTopics
        });
        
        setTopics(newTopics);
      } catch (error: any) {
        console.error('Error loading topics:', error);
        setError(error.message || 'Failed to load topics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTopics();
  }, [preferences?.subject, preferences?.knowledgeLevel, preferences?.language, geminiApiKey]);

  const handlePreferencesSave = async (newPreferences: any) => {
    setIsSaving(true);
    try {
      await updatePreferences({
        ...newPreferences,
        onboardingCompleted: true,
        topics: []
      });
      await savePreferences();
      setShowPreferencesModal(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartLesson = (topic: Topic) => {
    localStorage.setItem('selectedTopic', JSON.stringify(topic));
    navigate(`/lesson/${topic.id}`);
  };

  const getTopicColor = (index: number) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-cyan-500 to-blue-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-lime-500 to-green-600'
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin">
            <div className="h-full w-full rounded-full border-4 border-primary-200 border-t-primary-600"></div>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-neutral-800">Preparing your learning journey...</h2>
          <p className="mt-2 text-neutral-600">Customizing content based on your preferences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1920')] opacity-10 bg-cover bg-center"></div>
        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-primary-100">
                  Welcome to Your Learning Journey
                </h1>
                <p className="text-primary-100 text-xl max-w-3xl leading-relaxed">
                  Your personalized path to mastering {preferences?.subject}
                </p>
              </div>
              
              <button
                onClick={() => setShowPreferencesModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-300 hover:scale-105"
              >
                <Edit className="h-5 w-5" />
                Customize Learning
              </button>
            </div>
            
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 flex items-center">
                <BookOpen className="h-6 w-6 mr-3 text-primary-200" />
                <div>
                  <p className="text-primary-200 text-sm">Subject</p>
                  <p className="font-semibold">{preferences?.subject}</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 flex items-center">
                <User2 className="h-6 w-6 mr-3 text-primary-200" />
                <div>
                  <p className="text-primary-200 text-sm">Level</p>
                  <p className="font-semibold capitalize">{preferences?.knowledgeLevel}</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 flex items-center">
                <Settings className="h-6 w-6 mr-3 text-primary-200" />
                <div>
                  <p className="text-primary-200 text-sm">Language</p>
                  <p className="font-semibold">{preferences?.language}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 gap-8">
          {/* Topics List */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-neutral-800 flex items-center gap-3">
                  <BookMarked className="h-8 w-8 text-primary-600" />
                  Your Learning Path
                </h2>
                <p className="mt-2 text-neutral-600">Master these topics to achieve your learning goals</p>
              </div>
            </div>
            
            {error ? (
              <div className="bg-error-50 border border-error-200 text-error-700 p-6 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-error-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-error-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Error Loading Topics</h3>
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {topics.map((topic, index) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-xl border border-neutral-200/50 overflow-hidden hover:shadow-lg transition-all duration-300 ${
                      activeTopicId === topic.id ? 'ring-2 ring-primary-500' : ''
                    }`}
                    onMouseEnter={() => setActiveTopicId(topic.id)}
                    onMouseLeave={() => setActiveTopicId(null)}
                  >
                    <div className={`h-2 bg-gradient-to-r ${getTopicColor(index)}`} />
                    <div className="p-6">
                      <div className="flex justify-between items-start gap-6">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getTopicColor(index)} flex items-center justify-center`}>
                              <Brain className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-neutral-800">
                              {topic.title}
                            </h3>
                          </div>
                          <p className="text-neutral-600 mb-6 leading-relaxed">
                            {topic.description}
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStartLesson(topic)}
                          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors bg-gradient-to-r ${getTopicColor(index)} hover:shadow-lg`}
                        >
                          <Play className="h-5 w-5" />
                          Start Learning
                        </motion.button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center text-neutral-600 bg-neutral-50 rounded-lg p-3">
                          <Clock className="h-5 w-5 mr-2 text-neutral-500" />
                          <span>{topic.estimatedDuration} minutes</span>
                        </div>
                        <div className="flex items-center text-neutral-600 bg-neutral-50 rounded-lg p-3">
                          <Award className="h-5 w-5 mr-2 text-neutral-500" />
                          <span>{topic.difficulty}</span>
                        </div>
                        <div className="flex items-center text-neutral-600 bg-neutral-50 rounded-lg p-3">
                          <Target className="h-5 w-5 mr-2 text-neutral-500" />
                          <span>{topic.learningObjectives.length} objectives</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {topic.learningObjectives.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary-500" />
                              Learning Objectives
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {topic.learningObjectives.map((objective, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 bg-neutral-50 p-3 rounded-lg"
                                >
                                  <div className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </div>
                                  <p className="text-sm text-neutral-600">{objective}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {topic.prerequisites.length > 0 && (
                          <div className="border-t border-neutral-200 pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-neutral-700 mb-3">Prerequisites</h4>
                            <div className="flex flex-wrap gap-2">
                              {topic.prerequisites.map((prerequisite, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                                >
                                  {prerequisite}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;