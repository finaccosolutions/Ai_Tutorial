import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, BookOpen, User2, Settings } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService from '../services/geminiService';

interface Topic {
  id: string;
  title: string;
  description: string;
}

const Dashboard: React.FC = () => {
  const { preferences } = useUserPreferences();
  const { geminiApiKey } = useAuth();
  const navigate = useNavigate();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if onboarding is complete
  useEffect(() => {
    if (preferences && !preferences.onboardingCompleted) {
      navigate('/onboarding');
    }
  }, [preferences, navigate]);
  
  // Load topics
  useEffect(() => {
    if (!geminiApiKey) {
      navigate('/api-key-setup');
      return;
    }

    if (preferences?.subject) {
      loadTopics();
    }
  }, [preferences?.subject, geminiApiKey]);

  const loadTopics = async () => {
    if (!preferences?.subject) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const topics = await geminiService.generateTopicsList(preferences.subject);
      setTopics(topics);
    } catch (error: any) {
      console.error('Error loading topics:', error);
      setError(error.message || 'Failed to load topics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-semibold text-neutral-800">Loading your learning path...</h2>
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
              Choose a topic to start learning through interactive video tutorials
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
        <div className="grid grid-cols-1 gap-8">
          {/* Topics List */}
          <div>
            <h2 className="text-2xl font-semibold text-neutral-800 mb-6">Tutorial Topics</h2>
            
            {error ? (
              <div className="bg-error-50 border border-error-200 text-error-700 p-4 rounded-lg mb-6">
                {error}
                <button
                  onClick={loadTopics}
                  className="ml-4 text-error-700 hover:text-error-800 underline"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {topics.map((topic, index) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                          {topic.title}
                        </h3>
                        <p className="text-neutral-600 mb-4">
                          {topic.description}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/lesson/${topic.id}`)}
                        className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        Start
                      </button>
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