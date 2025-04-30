import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import geminiService from '../services/geminiService';
import slideService from '../services/slideService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateGeminiApiKey: (apiKey: string) => Promise<void>;
  geminiApiKey: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadGeminiApiKey(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadGeminiApiKey(session.user.id);
      } else {
        setGeminiApiKey(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadGeminiApiKey = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('gemini_api_key')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading Gemini API key:', error);
        return;
      }
      
      if (data?.gemini_api_key) {
        setGeminiApiKey(data.gemini_api_key);
        geminiService.initialize(data.gemini_api_key);
        slideService.initialize(data.gemini_api_key); // Initialize slide service
      }
    } catch (error) {
      console.error('Error loading Gemini API key:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // First sign up the user with Supabase Auth
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!data.user) throw new Error('No user data returned from signup');

      // Wait a moment for the auth session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create the user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
          },
        ]);

      if (profileError) throw profileError;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setGeminiApiKey(null);
  };

  const updateGeminiApiKey = async (apiKey: string) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users')
      .update({ gemini_api_key: apiKey })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    setGeminiApiKey(apiKey);
    if (apiKey) {
      geminiService.initialize(apiKey);
      slideService.initialize(apiKey); // Initialize slide service
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateGeminiApiKey,
      geminiApiKey
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};