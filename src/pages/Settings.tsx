import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, User, Settings as SettingsIcon, Save, Globe, BookOpen, RefreshCw } from 'lucide-react';
import { useUserPreferences, KnowledgeLevel, Language } from '../contexts/UserPreferencesContext';
import geminiService from '../services/geminiService';

const Settings: React.FC = () => {
  const { preferences, updatePreferences, savePreferences } = useUserPreferences();
  
  // Local state
  const [apiKey, setApiKey] = useState('');
  const [subject, setSubject] = useState('');
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>('beginner');
  const [language, setLanguage] = useState<Language>('english');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load preferences
  useEffect(() => {
    if (preferences) {
      setSubject(preferences.subject || '');
      setKnowledgeLevel(preferences.knowledgeLevel || 'beginner');
      setLanguage(preferences.language || 'english');
    }
    
    // Try to load API key from localStorage (for demo)
    const storedApiKey = localStorage.getItem('gemini_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, [preferences]);
  
  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // Save API key
      localStorage.setItem('gemini_api_key', apiKey);
      geminiService.setApiKey(apiKey);
      
      // Save preferences
      await updatePreferences({
        subject,
        knowledgeLevel,
        language
      });
      
      await savePreferences();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-neutral-50 pt-8 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center mb-8">
            <SettingsIcon className="h-8 w-8 text-primary-600 mr-3" />
            <h1 className="text-3xl font-bold text-neutral-800">Settings</h1>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            {/* API Key Section */}
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center">
                <Key className="h-5 w-5 mr-2 text-primary-600" />
                Gemini API Configuration
              </h2>
              
              <div className="mb-6">
                <label htmlFor="apiKey" className="block text-sm font-medium text-neutral-700 mb-1">
                  API Key
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="password"
                    name="apiKey"
                    id="apiKey"
                    className="input pr-10"
                    placeholder="Enter your Gemini API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <p className="mt-2 text-sm text-neutral-500">
                  You need a Gemini API key to generate personalized content. 
                  Get your key from the <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">Google AI Developer</a> site.
                </p>
              </div>
            </div>
            
            {/* Learning Preferences */}
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-primary-600" />
                Learning Preferences
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-1">
                    Subject or Course
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BookOpen className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      type="text"
                      name="subject"
                      id="subject"
                      className="input pl-10"
                      placeholder="e.g., Python Programming, Data Science"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="knowledgeLevel" className="block text-sm font-medium text-neutral-700 mb-1">
                    Knowledge Level
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <select
                      id="knowledgeLevel"
                      name="knowledgeLevel"
                      className="input"
                      value={knowledgeLevel}
                      onChange={(e) => setKnowledgeLevel(e.target.value as KnowledgeLevel)}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-neutral-700 mb-1">
                    Preferred Language
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className="h-5 w-5 text-neutral-400" />
                    </div>
                    <select
                      id="language"
                      name="language"
                      className="input pl-10"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                    >
                      <option value="english">English</option>
                      <option value="spanish">Hindi</option>
                      <option value="french">Malayalam</option>
                      <option value="german">Tamil</option>
                      <option value="chinese">Kannada</option>
                      <option value="japanese">Marati</option>
                      <option value="hindi">Telugu</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-6 bg-neutral-50 flex items-center justify-between">
              <button
                type="button"
                className="btn btn-secondary flex items-center"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </button>
              
              <div className="flex items-center space-x-3">
                {error && (
                  <span className="text-sm text-error-600">{error}</span>
                )}
                
                {saveSuccess && (
                  <span className="text-sm text-success-600">Settings saved successfully!</span>
                )}
                
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`btn btn-primary flex items-center ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;