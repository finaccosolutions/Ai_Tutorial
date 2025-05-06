import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, User2, Settings, Clock, Target, Award, RefreshCw, Edit, Sparkles, ArrowRight, Rocket } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService, { Topic } from '../services/geminiService';
import Onboarding from './Onboarding';

const Dashboard: React.FC = () => {
  const { preferences, updatePreferences, savePreferences } = useUserPreferences();
  const { geminiApiKey, user } = useAuth();
  const navigate = useNavigate();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

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
      'from-violet-500 to-purple-600'
    ];
    return colors[index % colors.length];
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-emerald-100 text-emerald-700';
      case 'intermediate':
        return 'bg-amber-100 text-amber-700';
      case 'advanced':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (showPreferencesModal) {
    return (
      <Onboarding 
        isEditing={true}
        onComplete={handlePreferencesSave}
        onCancel={() => setShowPreferencesModal(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary-600 w-8 h-8" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-neutral-800">Preparing your learning path...</h2>
          <p className="mt-2 text-neutral-600">Customizing content based on your preferences</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/10 to-neutral-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-primary-100">
                  Welcome to Your Learning Journey
                </h1>
                <p className="text-primary-100 text-lg max-w-3xl">
                  Your personalized learning path in {preferences?.subject}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPreferencesModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg group"
              >
                <Edit className="h-5 w-5 transition-transform group-hover:rotate-12" />
                Edit Preferences
              </motion.button>
            </div>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 flex items-center border border-white/20 transition-all duration-300 hover:bg-white/20"
              >
                <BookOpen className="h-6 w-6 mr-3 text-primary-200" />
                <div>
                  <p className="text-primary-200 text-sm">Subject</p>
                  <p className="font-semibold">{preferences?.subject}</p>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 flex items-center border border-white/20 transition-all duration-300 hover:bg-white/20"
              >
                <User2 className="h-6 w-6 mr-3 text-primary-200" />
                <div>
                  <p className="text-primary-200 text-sm">Level</p>
                  <p className="font-semibold">{preferences?.knowledgeLevel}</p>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 flex items-center border border-white/20 transition-all duration-300 hover:bg-white/20"
              >
                <Settings className="h-6 w-6 mr-3 text-primary-200" />
                <div>
                  <p className="text-primary-200 text-sm">Language</p>
                  <p className="font-semibold">{preferences?.language}</p>
                </div>
              </motion.div>
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
              <h2 className="text-3xl font-bold text-neutral-800 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Your Learning Path
              </h2>
            </div>
            
            {error ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-error-50 border border-error-200 text-error-700 p-6 rounded-xl mb-6 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-error-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Error Loading Topics</h3>
                    <p>{error}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="grid gap-6">
                {topics.map((topic, index) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onHoverStart={() => setHoveredTopic(topic.id)}
                    onHoverEnd={() => setHoveredTopic(null)}
                    className={`relative overflow-hidden rounded-xl transition-all duration-500 ${
                      hoveredTopic === topic.id
                        ? 'shadow-2xl transform scale-[1.02] -translate-y-1'
                        : 'shadow-lg'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${getTopicColor(index)} opacity-10`} />
                    <div className="relative p-6 bg-white/95 backdrop-blur-sm space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-grow">
                          <motion.h3 
                            className={`text-2xl font-bold mb-3 bg-gradient-to-r ${getTopicColor(index)} bg-clip-text text-transparent`}
                          >
                            {topic.title}
                          </motion.h3>
                          <p className="text-neutral-600 text-lg leading-relaxed">
                            {topic.description}
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStartLesson(topic)}
                          className={`flex items-center gap-2 bg-gradient-to-r ${getTopicColor(index)} text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 group whitespace-nowrap`}
                        >
                          <Play className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                          Start Learning
                        </motion.button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center bg-neutral-50 rounded-lg p-3 transition-all duration-300 hover:bg-neutral-100 hover:shadow-md"
                        >
                          <Clock className="h-5 w-5 text-primary-600 mr-3" />
                          <span className="text-neutral-700">{topic.estimatedDuration} minutes</span>
                        </motion.div>
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className={`flex items-center rounded-lg p-3 ${getDifficultyColor(topic.difficulty)} transition-all duration-300 hover:shadow-md`}
                        >
                          <Award className="h-5 w-5 mr-3" />
                          <span>{topic.difficulty}</span>
                        </motion.div>
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center bg-neutral-50 rounded-lg p-3 transition-all duration-300 hover:bg-neutral-100 hover:shadow-md"
                        >
                          <Target className="h-5 w-5 text-primary-600 mr-3" />
                          <span className="text-neutral-700">{topic.learningObjectives.length} objectives</span>
                        </motion.div>
                      </div>

                      {topic.learningObjectives.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-primary-600" />
                            Learning Objectives
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {topic.learningObjectives.map((objective, i) => (
                              <motion.div
                                key={i}
                                whileHover={{ scale: 1.02, x: 5 }}
                                className="flex items-start gap-2 bg-neutral-50 p-3 rounded-lg transition-all duration-300 hover:bg-neutral-100 hover:shadow-md group"
                              >
                                <ArrowRight className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5 transition-transform group-hover:translate-x-1" />
                                <span className="text-neutral-700">{objective}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {topic.prerequisites.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold text-neutral-800">Prerequisites</h4>
                          <div className="flex flex-wrap gap-2">
                            {topic.prerequisites.map((prerequisite, i) => (
                              <motion.span
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-md ${
                                  hoveredTopic === topic.id
                                    ? `bg-gradient-to-r ${getTopicColor(index)} text-white`
                                    : 'bg-primary-50 text-primary-700'
                                }`}
                              >
                                {prerequisite}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      )}
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