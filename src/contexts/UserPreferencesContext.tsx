import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

// Types
export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced';
export type Language = 'English' | 'Hindi' | 'Malayalam' | 'Tamil' | 'Kannada' | 'Telugue' | 'Marati';

export interface UserPreferences {
  subject: string;
  knowledgeLevel: KnowledgeLevel;
  language: Language;
  learningGoals: string[];
  onboardingCompleted: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => void;
  savePreferences: () => Promise<void>;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  subject: '',
  knowledgeLevel: 'beginner',
  language: 'english',
  learningGoals: [],
  onboardingCompleted: false
};

// Create context
const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

// Provider component
export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Load preferences when user changes
  useEffect(() => {
    if (user) {
      const loadPreferences = async () => {
        try {
          // Use maybeSingle() instead of single() to handle cases where no preferences exist
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error loading preferences:', error);
            setPreferences(defaultPreferences);
            return;
          }

          if (data) {
            setPreferences({
              subject: data.subject || '',
              knowledgeLevel: data.knowledge_level || 'beginner',
              language: data.language || 'english',
              learningGoals: data.learning_goals || [],
              onboardingCompleted: data.onboarding_completed || false
            });
          } else {
                        // If no preferences exist yet, create them
            const { error: insertError } = await supabase
              .from('user_preferences')
              .insert({
                user_id: user.id,
                subject: defaultPreferences.subject,
                knowledge_level: defaultPreferences.knowledgeLevel,
                language: defaultPreferences.language,
                learning_goals: defaultPreferences.learningGoals,
                onboarding_completed: defaultPreferences.onboardingCompleted
              });

            if (insertError) {
              console.error('Error creating default preferences:', insertError);
            }
          }
        } catch (error) {
          console.error('Error loading preferences:', error);
          setPreferences(defaultPreferences);
        }
      };

      loadPreferences();
    } else {
      setPreferences(null);
    }
  }, [user]);

  // Update preferences locally
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => {
      if (!prev) return null;
      return { ...prev, ...newPreferences };
    });
  };

  // Save preferences to Supabase
  const savePreferences = async () => {
    if (!user || !preferences) return;
    
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            subject: preferences.subject,
            knowledge_level: preferences.knowledgeLevel,
            language: preferences.language,
            learning_goals: preferences.learningGoals,
            onboarding_completed: preferences.onboardingCompleted
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreferences, savePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

// Custom hook to use the preferences context
export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};