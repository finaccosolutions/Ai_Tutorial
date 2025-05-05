import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, BookOpen, User2, Settings, Clock, Target, Award, RefreshCw, Edit } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import geminiService, { Topic } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { preferences, updatePreferences, savePreferences } = useUserPreferences();
  const { geminiApiKey } = useAuth();
  const navigate = useNavigate();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [editedPreferences, setEditedPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);
  
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
        const topics = await geminiService.generateTopicsList(
          preferences.subject,
          preferences.knowledgeLevel,
          preferences.language,
          preferences.learningGoals || []
        );
        
        setTopics(topics);
      } catch (error: any) {
        console.error('Error loading topics:', error);
        setError(error.message || 'Failed to load topics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTopics();
  }, [preferences?.subject, preferences?.knowledgeLevel, preferences?.language]);

  const handleStartLesson = (topic: Topic) => {
    localStorage.setItem('selectedTopic', JSON.stringify(topic));
    navigate(`/lesson/${topic.id}`);
  };

  const handleSavePreferences = async () => {
    if (!editedPreferences) return;
    
    setIsSaving(true);
    try {
      await updatePreferences(editedPreferences);
      await savePreferences();
      setShowPreferencesModal(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const PreferencesModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4"
      >
        <h2 className="text-2xl font-semibold mb-4">Update Learning Preferences</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={editedPreferences?.subject || ''}
              onChange={(e) => setEditedPreferences(prev => ({
                ...prev!,
                subject: e.target.value
              }))}
              className="input"
              placeholder="e.g., Python Programming"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Knowledge Level
            </label>
            <select
              value={editedPreferences?.knowledgeLevel || 'beginner'}
              onChange={(e) => setEditedPreferences(prev => ({
                ...prev!,
                knowledgeLevel: e.target.value as any
              }))}
              className="input"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Language
            </label>
            <select
              value={editedPreferences?.language || 'english'}
              onChange={(e) => setEditedPreferences(prev => ({
                ...prev!,
                language: e.target.value as any
              }))}
              className="input"
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="german">German</option>
              <option value="chinese">Chinese</option>
              <option value="japanese">Japanese</option>
              <option value="hindi">Hindi</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setShowPreferencesModal(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );

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
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  Welcome to Your Learning Journey
                </h1>
                <p className="text-primary-100 text-lg max-w-3xl">
                  Your personalized learning path in {preferences?.subject}
                </p>
              </div>
              
              <button
                onClick={() => {
                  setEditedPreferences(preferences);
                  setShowPreferencesModal(true);
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit Preferences
              </button>
            </div>
            
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

      {/* Preferences Modal */}
      {showPreferencesModal && <PreferencesModal />}
    </div>
  );
};

export default Dashboard;