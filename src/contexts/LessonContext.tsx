import React, { createContext, useContext, useState, useCallback } from 'react';
import { useUserPreferences } from './UserPreferencesContext';
import geminiService from '../services/geminiService';

// Types
export interface Lesson {
  id: string;
  title: string;
  content: string;
  visualContent: string;
  estimatedDuration: number; // in minutes
  progress: number; // 0-100
  completed: boolean;
  questions: LessonQuestion[];
}

export interface LessonQuestion {
  id: string;
  question: string;
  answer: string;
  timestamp: number; // position in lesson where question was asked
}

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  knowledgeLevel: string;
  lessons: Lesson[];
  progress: number; // 0-100
}

interface LessonContextType {
  currentLesson: Lesson | null;
  currentCourse: Course | null;
  isLoading: boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  currentQuestion: string;
  currentAnswer: string | null;
  loadCourse: () => Promise<void>;
  loadLesson: (lessonId: string) => Promise<void>;
  togglePause: () => void;
  toggleSpeaking: () => void;
  toggleListening: () => void;
  askQuestion: (question: string) => Promise<void>;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export const LessonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences } = useUserPreferences();
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [cachedTopics, setCachedTopics] = useState<Topic[]>([]);

  // Load course based on user preferences
  const loadCourse = useCallback(async (forceReload = false) => {
    if (!preferences) return;
    
    // Return cached topics if available and not forcing reload
    if (cachedTopics.length > 0 && !forceReload) {
      return;
    }
    
    setIsLoading(true);
    try {
      const topics = await geminiService.generateTopicsList(
        preferences.subject || 'General Knowledge',
        preferences.knowledgeLevel,
        preferences.language,
        preferences.learningGoals || []
      );
      
      setCachedTopics(topics);
      setCurrentCourse({
        id: `course_${Date.now()}`,
        title: `${preferences.knowledgeLevel} ${preferences.subject}`,
        description: `A comprehensive course on ${preferences.subject}`,
        subject: preferences.subject || '',
        knowledgeLevel: preferences.knowledgeLevel,
        lessons: topics.map(topic => ({
          id: topic.id,
          title: topic.title,
          content: topic.description,
          visualContent: '',
          estimatedDuration: topic.estimatedDuration,
          progress: 0,
          completed: false,
          questions: []
        })),
        progress: 0
      });
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setIsLoading(false);
    }
  }, [preferences, cachedTopics]);

  // Clear cached topics when preferences change
  React.useEffect(() => {
    setCachedTopics([]);
  }, [preferences?.subject, preferences?.knowledgeLevel, preferences?.language]);

  // Load specific lesson
  const loadLesson = useCallback(async (lessonId: string) => {
    if (!currentCourse) {
      await loadCourse();
    }
    
    setIsLoading(true);
    try {
      // Find the requested lesson
      const lesson = currentCourse?.lessons.find(l => l.id === lessonId) || null;
      setCurrentLesson(lesson);
      
      // Reset lesson state
      setIsPaused(false);
      setIsSpeaking(false);
      setIsListening(false);
      setCurrentQuestion('');
      setCurrentAnswer(null);
    } catch (error) {
      console.error('Error loading lesson:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCourse, loadCourse]);

  // Playback controls
  const togglePause = () => setIsPaused(prev => !prev);
  const toggleSpeaking = () => setIsSpeaking(prev => !prev);
  const toggleListening = () => setIsListening(prev => !prev);

  // Ask a question during the lesson
  const askQuestion = useCallback(async (question: string) => {
    if (!currentLesson || !preferences?.subject) return;
    
    // Pause the lesson
    setIsPaused(true);
    setCurrentQuestion(question);
    setCurrentAnswer(null);
    
    try {
      // Call Gemini API (simulated)
      const answer = await mockGeminiAnswer(question, preferences.subject);
      
      // Add the Q&A to the lesson's history
      setCurrentLesson(prev => {
        if (!prev) return null;
        
        const updatedQuestions = [
          ...prev.questions,
          {
            id: `q_${Date.now()}`,
            question,
            answer,
            timestamp: Date.now()
          }
        ];
        
        return { ...prev, questions: updatedQuestions };
      });
      
      setCurrentAnswer(answer);
    } catch (error) {
      console.error('Error getting answer:', error);
      setCurrentAnswer('Sorry, I couldn\'t process that question. Please try again.');
    }
  }, [currentLesson, preferences?.subject]);

  return (
    <LessonContext.Provider value={{
      currentLesson,
      currentCourse,
      isLoading,
      isPaused,
      isSpeaking,
      isListening,
      currentQuestion,
      currentAnswer,
      loadCourse,
      loadLesson,
      togglePause,
      toggleSpeaking,
      toggleListening,
      askQuestion,
      cachedTopics
    }}>
      {children}
    </LessonContext.Provider>
  );
};

// Custom hook to use the lesson context
export const useLesson = () => {
  const context = useContext(LessonContext);
  if (context === undefined) {
    throw new Error('useLesson must be used within a LessonProvider');
  }
  return context;
};