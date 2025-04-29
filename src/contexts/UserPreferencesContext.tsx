import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Types
export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced';
export type Language = 'english' | 'spanish' | 'french' | 'german' | 'chinese' | 'japanese' | 'hindi';

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
      const loadPreferences = () => {
        try {
          // In a real app, fetch from API/database
          const storedPrefs = localStorage.getItem(`preferences_${user.id}`);
          if (storedPrefs) {
            setPreferences(JSON.parse(storedPrefs));
          } else {
            setPreferences(defaultPreferences);
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

  // Save preferences to persistent storage
  const savePreferences = async () => {
    if (!user || !preferences) return;
    
    try {
      // In a real app, send to API/database
      localStorage.setItem(`preferences_${user.id}`, JSON.stringify(preferences));
      
      // Update user.onboardingCompleted if needed
      if (preferences.onboardingCompleted) {
        const updatedUser = { ...user, onboardingCompleted: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
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