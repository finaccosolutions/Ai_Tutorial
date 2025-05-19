import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, BookOpen, User, Globe, Target, GraduationCap as Graduation } from 'lucide-react';
import { useUserPreferences, KnowledgeLevel, Language } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface OnboardingProps {
  isEditing?: boolean;
  onComplete?: (preferences: any) => void;
  onCancel?: () => void;
}

const steps = [
  { id: 'subject', title: 'Subject', description: 'What would you like to learn?' },
  { id: 'level', title: 'Knowledge Level', description: 'What\'s your current expertise?' },
  { id: 'language', title: 'Preferred Language', description: 'Choose your learning language' },
  { id: 'goals', title: 'Learning Goals', description: 'What do you want to achieve?' },
];

const Onboarding: React.FC<OnboardingProps> = ({ isEditing = false, onComplete, onCancel }) => {
  const { user, geminiApiKey } = useAuth();
  const { preferences, updatePreferences, savePreferences } = useUserPreferences();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [subject, setSubject] = useState(preferences?.subject || '');
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>(preferences?.knowledgeLevel || 'beginner');
  const [language, setLanguage] = useState<Language>(preferences?.language || 'English');
  const [learningGoals, setLearningGoals] = useState<string[]>(preferences?.learningGoals || []);
  const [customGoal, setCustomGoal] = useState('');

  // Check if preferences exist and redirect if onboarding is completed
  useEffect(() => {
    if (!isEditing && preferences?.onboardingCompleted) {
      navigate('/dashboard');
    }
  }, [preferences, navigate, isEditing]);
  
  // Common goals options
  const commonGoals = [
    'Master the fundamentals',
    'Prepare for certification',
    'Apply skills to real projects',
    'Advance my career',
    'Personal interest',
    'Academic requirements',
  ];
  
  // Handle goal selection
  const toggleGoal = (goal: string) => {
    setLearningGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal) 
        : [...prev, goal]
    );
  };
  
  // Add custom goal
  const addCustomGoal = () => {
    if (customGoal.trim() && !learningGoals.includes(customGoal.trim())) {
      setLearningGoals(prev => [...prev, customGoal.trim()]);
      setCustomGoal('');
    }
  };
  
  // Navigation functions
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (isEditing && onCancel) {
      onCancel();
    }
  };
  
  // Validation for each step
  const canProceed = () => {
    switch (currentStep) {
      case 0: // Subject
        return subject.trim().length > 0;
      case 1: // Knowledge Level
        return true; // Always valid as we have a default
      case 2: // Language
        return true; // Always valid as we have a default
      case 3: // Learning Goals
        return learningGoals.length > 0;
      default:
        return false;
    }
  };
  
  // Complete onboarding
  const completeOnboarding = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const newPreferences = {
        subject,
        knowledgeLevel,
        language,
        learningGoals,
        onboardingCompleted: true
      };

      // Clear presentation cache for the user
      const { error: clearError } = await supabase
        .from('presentation_cache')
        .delete()
        .eq('user_id', user.id);

      if (clearError) {
        console.error('Error clearing presentation cache:', clearError);
        throw new Error('Failed to clear presentation cache');
      }

      if (isEditing && onComplete) {
        await onComplete(newPreferences);
      } else {
        await updatePreferences(newPreferences);
        await savePreferences();

        // Check if API key exists
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('gemini_api_key')
          .eq('id', user.id)
          .single();

        if (userError) {
          throw userError;
        }

        // Navigate based on API key existence
        if (!userData?.gemini_api_key) {
          navigate('/api-key-setup');
        } else {
          localStorage.setItem('showDashboardLoading', 'true');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to save preferences');
      setIsSubmitting(false);
    }
  };

  // Step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Subject
        return (
          <div>
            <div className="mb-6">
              <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-1">
                Subject or Course
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <BookOpen className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input pl-10"
                  placeholder="e.g., Python Programming, Data Science, Literature"
                />
              </div>
            </div>
            
            <div className="text-sm text-neutral-500">
              <p>Examples: Machine Learning, Spanish Language, World History, Digital Marketing, etc.</p>
            </div>
          </div>
        );
      
      case 1: // Knowledge Level
        return (
          <div>
            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-neutral-700">
                Your Current Knowledge Level
              </label>
              
              {/* Beginner */}
              <div
                className={`flex items-start p-4 border ${
                  knowledgeLevel === 'beginner' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-neutral-200 hover:border-primary-200'
                } rounded-lg transition-colors cursor-pointer`}
                onClick={() => setKnowledgeLevel('beginner')}
              >
                <div className="flex-shrink-0 h-5 w-5 mt-0.5">
                  <div className={`h-5 w-5 rounded-full border ${
                    knowledgeLevel === 'beginner' ? 'border-primary-500' : 'border-neutral-300'
                  } flex items-center justify-center`}>
                    {knowledgeLevel === 'beginner' && (
                      <div className="h-3 w-3 rounded-full bg-primary-500" />
                    )}
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-medium">Beginner</h3>
                  <p className="text-sm text-neutral-600">Little to no prior knowledge. Starting from scratch.</p>
                </div>
              </div>
              
              {/* Intermediate */}
              <div
                className={`flex items-start p-4 border ${
                  knowledgeLevel === 'intermediate' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-neutral-200 hover:border-primary-200'
                } rounded-lg transition-colors cursor-pointer`}
                onClick={() => setKnowledgeLevel('intermediate')}
              >
                <div className="flex-shrink-0 h-5 w-5 mt-0.5">
                  <div className={`h-5 w-5 rounded-full border ${
                    knowledgeLevel === 'intermediate' ? 'border-primary-500' : 'border-neutral-300'
                  } flex items-center justify-center`}>
                    {knowledgeLevel === 'intermediate' && (
                      <div className="h-3 w-3 rounded-full bg-primary-500" />
                    )}
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-medium">Intermediate</h3>
                  <p className="text-sm text-neutral-600">Familiar with basics but seeking deeper understanding.</p>
                </div>
              </div>
              
              {/* Advanced */}
              <div
                className={`flex items-start p-4 border ${
                  knowledgeLevel === 'advanced' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-neutral-200 hover:border-primary-200'
                } rounded-lg transition-colors cursor-pointer`}
                onClick={() => setKnowledgeLevel('advanced')}
              >
                <div className="flex-shrink-0 h-5 w-5 mt-0.5">
                  <div className={`h-5 w-5 rounded-full border ${
                    knowledgeLevel === 'advanced' ? 'border-primary-500' : 'border-neutral-300'
                  } flex items-center justify-center`}>
                    {knowledgeLevel === 'advanced' && (
                      <div className="h-3 w-3 rounded-full bg-primary-500" />
                    )}
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-medium">Advanced</h3>
                  <p className="text-sm text-neutral-600">Solid understanding, looking for expert-level content.</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 2: // Language
        return (
          <div>
            <div className="mb-6">
              <label htmlFor="language" className="block text-sm font-medium text-neutral-700 mb-1">
                Preferred Learning Language
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Globe className="h-5 w-5 text-neutral-400" />
                </div>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="input pl-10 pr-10 appearance-none"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Telugue">Telugu</option>
                  <option value="Marati">Marathi</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </div>
              </div>
            </div>
            
            <div className="text-sm text-neutral-500">
              <p>Content and AI responses will be provided in your selected language.</p>
            </div>
          </div>
        );
      
      case 3: // Learning Goals
        return (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Select Your Learning Goals
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {commonGoals.map(goal => (
                  <div
                    key={goal}
                    className={`flex items-center p-3 border ${
                      learningGoals.includes(goal) 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-neutral-200 hover:border-primary-200'
                    } rounded-lg transition-colors cursor-pointer`}
                    onClick={() => toggleGoal(goal)}
                  >
                    <div className={`h-5 w-5 rounded border ${
                      learningGoals.includes(goal) ? 'bg-primary-500 border-primary-500' : 'border-neutral-300'
                    } flex items-center justify-center mr-3`}>
                      {learningGoals.includes(goal) && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{goal}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 mb-4">
                <label htmlFor="customGoal" className="block text-sm font-medium text-neutral-700 mb-1">
                  Add a Custom Goal (Optional)
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Target className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      id="customGoal"
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      className="input pl-10"
                      placeholder="e.g., Specific project goal"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCustomGoal}
                    disabled={!customGoal.trim()}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {/* Show selected goals */}
              {learningGoals.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-neutral-700 mb-2">Your Selected Goals:</h4>
                  <div className="flex flex-wrap gap-2">
                    {learningGoals.map(goal => (
                      <div key={goal} className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm flex items-center">
                        {goal}
                        <button
                          type="button"
                          onClick={() => toggleGoal(goal)}
                          className="ml-2 text-primary-600 hover:text-primary-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Progress indicator
  const Progress = () => {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    index < currentStep
                      ? 'bg-primary-600 text-white'
                      : index === currentStep
                      ? 'bg-primary-100 border-2 border-primary-600 text-primary-700'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  index === currentStep ? 'text-primary-700' : 'text-neutral-500'
                }`}>
                  {step.title}
                </span>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-primary-600' : 'bg-neutral-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Graduation className="h-16 w-16 text-primary-600 mx-auto" />
          <h1 className="mt-4 text-3xl font-bold text-primary-900">
            {isEditing ? 'Update Your Learning Preferences' : 'Set Up Your Learning Journey'}
          </h1>
          <p className="mt-2 text-neutral-600">
            {isEditing 
              ? 'Modify your preferences to better suit your learning needs'
              : 'Tell us about yourself so we can personalize your learning experience'
            }
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <Progress />
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-neutral-600">
              {steps[currentStep].description}
            </p>
          </div>
          
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            {renderStepContent()}
          </motion.div>

          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-error-700">{error}</p>
            </div>
          )}
          
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              className="btn btn-secondary flex items-center"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              {currentStep === 0 && isEditing ? 'Cancel' : 'Back'}
            </button>
            
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed() || isSubmitting}
              className={`btn btn-primary flex items-center ${
                !canProceed() || isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              ) : null}
              
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="h-5 w-5 ml-1" />
                </>
              ) : (
                isEditing ? 
                'Save Changes' :
                'Complete Setup'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;