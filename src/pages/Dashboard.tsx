import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, BookOpen, User2, Settings, Clock, Target, Award, RefreshCw } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService, { Topic } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { preferences } = useUserPreferences();
  const { geminiApiKey } = useAuth();
  const navigate = useNavigate();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingPreferences, setIsChangingPreferences] = useState(false);
  
  // Check if API key is set
  useEffect(() => {
    if (!geminiApiKey) {
      navigate('/api-key-setup');
      return;
    }
  }, [geminiApiKey, navigate]);
  
  // Check if onboarding is complete
  useEffect(() => {
    if (preferences && !preferences.onboardingCompleted) {
      navigate('/onboarding');
    }
  }, [preferences, navigate]);
  
  // Load topics based on user preferences
  useEffect(() => {
    if (!preferences?.subject || !preferences?.knowledgeLevel || !preferences?.language) return;

    const loadTopics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try to load cached topics first
        const cachedTopics = localStorage.getItem(`topics_${preferences.subject}`);
        if (cachedTopics && !isChangingPreferences) {
          setTopics(JSON.parse(cachedTopics));
          setIsLoading(false);
          return;
        }

        // Generate new topics if cache doesn't exist or preferences changed
        const topics = await geminiService.generateTopicsList(
          preferences.subject,
          preferences.knowledgeLevel,
          preferences.language,
          preferences.learningGoals || []
        );
        
        setTopics(topics);
        // Cache the topics
        localStorage.setItem(`topics_${preferences.subject}`, JSON.stringify(topics));
        setIsChangingPreferences(false);
      } catch (error: any) {
        console.error('Error loading topics:', error);
        setError(error.message || 'Failed to load topics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTopics();
  }, [preferences?.subject, preferences?.knowledgeLevel, preferences?.language, isChangingPreferences]);

  const handleStartLesson = (topic: Topic) => {
    localStorage.setItem('selectedTopic', JSON.stringify(topic));
    navigate(`/lesson/${topic.id}`);
  };

  const handleChangePreferences = () => {
    setIsChangingPreferences(true);
    navigate('/onboarding');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-semibold text-neutral-800">Preparing your learning path...</h2>
          <p className="text-neutral-600 mt-2">Customizing content based on your preferences</p>
        </div>
      </div>
    );
  }

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
              Your personalized learning path in {preferences?.subject}
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

              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                <span>Language: <strong>{preferences?.language}</strong></span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 md:px-6 pt-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Topics List */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-neutral-800">Your Learning Path</h2>
              <button
                onClick={handleChangePreferences}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Change Preferences
              </button>
            </div>
            
            {error ? (
              <div className="bg-error-50 border border-error-200 text-error-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            ) : (
              <div className="grid gap-6">
                {topics.map((topic, index) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-primary-300 transition-all hover:shadow-md"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-grow">
                          <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                            {topic.title}
                          </h3>
                          <p className="text-neutral-600 mb-4">
                            {topic.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartLesson(topic)}
                          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors ml-4"
                        >
                          <Play className="h-4 w-4" />
                          Start
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center text-neutral-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{topic.estimatedDuration} minutes</span>
                        </div>
                        <div className="flex items-center text-neutral-600">
                          <Award className="h-4 w-4 mr-2" />
                          <span>{topic.difficulty}</span>
                        </div>
                        <div className="flex items-center text-neutral-600">
                          <Target className="h-4 w-4 mr-2" />
                          <span>{topic.learningObjectives.length} objectives</span>
                        </div>
                      </div>

                      {topic.learningObjectives.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-neutral-700 mb-2">Learning Objectives:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {topic.learningObjectives.map((objective, i) => (
                              <li key={i} className="text-sm text-neutral-600">{objective}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {topic.prerequisites.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-neutral-700 mb-2">Prerequisites:</h4>
                          <div className="flex flex-wrap gap-2">
                            {topic.prerequisites.map((prerequisite, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                              >
                                {prerequisite}
                              </span>
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