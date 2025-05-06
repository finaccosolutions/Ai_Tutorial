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
  topics?: any[];
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  savePreferences: () => Promise<void>;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  subject: '',
  knowledgeLevel: 'beginner',
  language: 'English',
  learningGoals: [],
  onboardingCompleted: false,
  topics: []
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
      loadPreferences();
    } else {
      setPreferences(null);
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        const loadedPrefs = {
          subject: data.subject || '',
          knowledgeLevel: data.knowledge_level || 'beginner',
          language: data.language || 'English',
          learningGoals: data.learning_goals || [],
          onboardingCompleted: data.onboarding_completed || false,
          topics: data.topics || []
        };
        setPreferences(loadedPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Update preferences locally and in database
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      const updatedPreferences = {
        ...defaultPreferences,
        ...preferences,
        ...newPreferences
      };

      setPreferences(updatedPreferences as UserPreferences);

      const prefsData = {
        user_id: user.id,
        subject: updatedPreferences.subject,
        knowledge_level: updatedPreferences.knowledgeLevel,
        language: updatedPreferences.language,
        learning_goals: updatedPreferences.learningGoals,
        onboarding_completed: updatedPreferences.onboardingCompleted,
        topics: updatedPreferences.topics || []
      };

      // Check if preferences exist
      const { data: existingPrefs, error: checkError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      let error;

      if (existingPrefs) {
        // Update existing preferences
        ({ error } = await supabase
          .from('user_preferences')
          .update(prefsData)
          .eq('user_id', user.id));
      } else {
        // Insert new preferences
        ({ error } = await supabase
          .from('user_preferences')
          .insert([prefsData]));
      }

      if (error) throw error;

      // Clear presentation cache for this user
      const { error: cacheError } = await supabase
        .from('presentation_cache')
        .delete()
        .eq('user_id', user.id);

      if (cacheError) {
        console.error('Error clearing presentation cache:', cacheError);
      }

      // Reload preferences to ensure we have the latest data
      await loadPreferences();
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  // Save preferences to database
  const savePreferences = async () => {
    if (!user || !preferences) return;
    
    try {
      const prefsData = {
        user_id: user.id,
        subject: preferences.subject,
        knowledge_level: preferences.knowledgeLevel,
        language: preferences.language,
        learning_goals: preferences.learningGoals,
        onboarding_completed: preferences.onboardingCompleted,
        topics: preferences.topics || []
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert(prefsData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      // Clear presentation cache for this user
      const { error: cacheError } = await supabase
        .from('presentation_cache')
        .delete()
        .eq('user_id', user.id);

      if (cacheError) {
        console.error('Error clearing presentation cache:', cacheError);
      }

      // Reload preferences to ensure we have the latest data
      await loadPreferences();
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