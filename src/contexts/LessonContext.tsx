import React, { createContext, useContext, useState, useCallback } from 'react';
import { useUserPreferences } from './UserPreferencesContext';

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

// Create context
const LessonContext = createContext<LessonContextType | undefined>(undefined);

// Mock data generation based on user preferences
const generateMockCourse = (subject: string, level: string): Course => {
  return {
    id: `course_${Date.now()}`,
    title: `${level.charAt(0).toUpperCase() + level.slice(1)} ${subject}`,
    description: `A comprehensive course on ${subject} designed for ${level} learners.`,
    subject,
    knowledgeLevel: level,
    lessons: [
      {
        id: 'lesson1',
        title: 'Introduction to the Subject',
        content: `
          <h1>Introduction to ${subject}</h1>
          <p>This lesson will introduce you to the fundamental concepts of ${subject}.</p>
          <p>We'll cover the basic terminology, history, and application areas.</p>
          <h2>Key Topics</h2>
          <ul>
            <li>Definition and scope of ${subject}</li>
            <li>Historical development</li>
            <li>Modern applications</li>
            <li>Future trends</li>
          </ul>
          <p>By the end of this lesson, you'll have a solid understanding of what ${subject} is and why it's important.</p>
        `,
        visualContent: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        estimatedDuration: 15,
        progress: 0,
        completed: false,
        questions: []
      },
      {
        id: 'lesson2',
        title: 'Core Principles',
        content: `
          <h1>Core Principles of ${subject}</h1>
          <p>In this lesson, we'll explore the foundational principles that govern ${subject}.</p>
          <p>Understanding these principles is crucial for mastering more advanced concepts later.</p>
          <h2>Principles We'll Cover</h2>
          <ol>
            <li>First principle of ${subject}</li>
            <li>Second principle</li>
            <li>Third principle</li>
            <li>How these principles interact</li>
          </ol>
          <p>These principles form the backbone of all work in ${subject}.</p>
        `,
        visualContent: 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        estimatedDuration: 20,
        progress: 0,
        completed: false,
        questions: []
      },
      {
        id: 'lesson3',
        title: 'Practical Applications',
        content: `
          <h1>Practical Applications of ${subject}</h1>
          <p>Now that we understand the theory, let's explore how ${subject} is applied in the real world.</p>
          <p>We'll look at case studies and examples from various industries.</p>
          <h2>Application Areas</h2>
          <ul>
            <li>Industry applications</li>
            <li>Research applications</li>
            <li>Everyday applications</li>
            <li>Emerging use cases</li>
          </ul>
          <p>By seeing ${subject} in action, you'll gain a deeper appreciation for its importance.</p>
        `,
        visualContent: 'https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        estimatedDuration: 25,
        progress: 0,
        completed: false,
        questions: []
      }
    ],
    progress: 0
  };
};

// Mock Gemini API response for questions
const mockGeminiAnswer = async (question: string, subject: string): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return `This is a simulated answer about ${subject} for your question: "${question}".
  
In a real implementation, this would use the Gemini API to generate a detailed and accurate response based on your specific question and the current lesson content.

The answer would be tailored to your knowledge level and would seamlessly connect back to the lesson material.`;
};

// Provider component
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

  // Load course based on user preferences
  const loadCourse = useCallback(async () => {
    if (!preferences) return;
    
    setIsLoading(true);
    try {
      // In a real app, this would call the Gemini API to generate course content
      // based on the user's preferences
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      const mockCourse = generateMockCourse(
        preferences.subject || 'General Knowledge', 
        preferences.knowledgeLevel
      );
      
      setCurrentCourse(mockCourse);
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

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
      askQuestion
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