import React, { createContext, useContext, useState, useCallback } from 'react';
import { useUserPreferences } from './UserPreferencesContext';
import geminiService, { Topic } from '../services/geminiService';

// Types
export interface Lesson {
  id: string;
  title: string;
  content: string;
  visualContent: string;
  estimatedDuration: number;
  progress: number;
  completed: boolean;
  questions: LessonQuestion[];
  learningObjectives: string[];
}

export interface LessonQuestion {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
}

interface LessonContextType {
  currentLesson: Lesson | null;
  currentTopic: Topic | null;
  isLoading: boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  currentQuestion: string;
  currentAnswer: string | null;
  loadLesson: (topicId: string) => Promise<void>;
  togglePause: () => void;
  toggleSpeaking: () => void;
  toggleListening: () => void;
  askQuestion: (question: string) => Promise<void>;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export const LessonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences } = useUserPreferences();
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);

  const loadLesson = useCallback(async (topicId: string) => {
    setIsLoading(true);
    try {
      // Get the topic from GeminiService's stored topics
      const topic = geminiService.getStoredTopic(topicId);
      if (!topic) {
        throw new Error('Topic not found');
      }

      setCurrentTopic(topic);

      // Create lesson from topic
      const lesson: Lesson = {
        id: topic.id,
        title: topic.title,
        content: topic.description,
        visualContent: '', // Will be set by slideService
        estimatedDuration: topic.estimatedDuration,
        progress: 0,
        completed: false,
        questions: [],
        learningObjectives: topic.learningObjectives
      };

      setCurrentLesson(lesson);
    } catch (error) {
      console.error('Error loading lesson:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const togglePause = () => setIsPaused(prev => !prev);
  const toggleSpeaking = () => setIsSpeaking(prev => !prev);
  const toggleListening = () => setIsListening(prev => !prev);

  const askQuestion = useCallback(async (question: string) => {
    if (!currentTopic || !preferences?.subject) return;
    
    setCurrentQuestion(question);
    setCurrentAnswer(null);
    
    try {
      const answer = await geminiService.answerQuestion(
        question,
        currentTopic.title,
        preferences.knowledgeLevel,
        preferences.language
      );
      
      setCurrentAnswer(answer);
      
      if (currentLesson) {
        setCurrentLesson(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            questions: [
              ...prev.questions,
              {
                id: `q_${Date.now()}`,
                question,
                answer,
                timestamp: Date.now()
              }
            ]
          };
        });
      }
    } catch (error) {
      console.error('Error getting answer:', error);
      setCurrentAnswer('Sorry, I couldn\'t process that question. Please try again.');
    }
  }, [currentTopic, preferences, currentLesson]);

  return (
    <LessonContext.Provider value={{
      currentLesson,
      currentTopic,
      isLoading,
      isPaused,
      isSpeaking,
      isListening,
      currentQuestion,
      currentAnswer,
      loadLesson,
      togglePause,
      toggleSpeaking,
      toggleListening,
      askQuestion
    }}>
      {children}
    </LessonContext.Provider>
  );
};

export const useLesson = () => {
  const context = useContext(LessonContext);
  if (context === undefined) {
    throw new Error('useLesson must be used within a LessonProvider');
  }
  return context;
};