import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, BookOpen, CheckCircle, User2, Settings, ExternalLink } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useLesson, Course, Lesson } from '../contexts/LessonContext';

const Dashboard: React.FC = () => {
  const { preferences } = useUserPreferences();
  const { currentCourse, loadCourse, isLoading } = useLesson();
  const navigate = useNavigate();
  
  // Check if onboarding is complete
  useEffect(() => {
    if (preferences && !preferences.onboardingCompleted) {
      navigate('/onboarding');
    }
  }, [preferences, navigate]);
  
  // Load course data
  useEffect(() => {
    if (preferences?.onboardingCompleted && !currentCourse && !isLoading) {
      loadCourse();
    }
  }, [preferences, currentCourse, loadCourse, isLoading]);
  
  // Start a lesson
  const startLesson = (lessonId: string) => {
    navigate(`/lesson/${lessonId}`);
  };
  
  // Loading state
  if (isLoading || !currentCourse) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-semibold text-neutral-800 mb-2">Loading your course...</h2>
          <p className="text-neutral-600">Personalizing your learning experience</p>
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
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Welcome to Your {currentCourse.title} Course
            </h1>
            <p className="text-primary-100 text-lg max-w-3xl">
              {currentCourse.description}
            </p>
            
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>Subject: <strong>{currentCourse.subject}</strong></span>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center">
                <User2 className="h-5 w-5 mr-2" />
                <span>Level: <strong>{preferences?.knowledgeLevel}</strong></span>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Progress: <strong>{currentCourse.progress}%</strong></span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Course Content */}
      <div className="container mx-auto max-w-6xl px-4 md:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Your Lessons</h2>
              
              <div className="space-y-4">
                {currentCourse.lessons.map((lesson: Lesson) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-medium text-neutral-800 mb-2">{lesson.title}</h3>
                          <div className="flex items-center text-sm text-neutral-500 mb-4">
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {lesson.estimatedDuration} minutes
                            </span>
                            <span className="mx-2">•</span>
                            <span>{lesson.completed ? 'Completed' : 'Not completed'}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => startLesson(lesson.id)}
                          className="btn btn-primary flex items-center"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {lesson.progress > 0 && !lesson.completed ? 'Continue' : 'Start'}
                        </button>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${lesson.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Course Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Course Progress</h3>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-neutral-600 mb-1">
                  <span>Overall completion</span>
                  <span className="font-medium">{currentCourse.progress}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${currentCourse.progress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-neutral-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary-700">
                    {currentCourse.lessons.filter(l => l.completed).length}
                  </div>
                  <div className="text-sm text-neutral-600">Lessons completed</div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary-700">
                    {currentCourse.lessons.length - currentCourse.lessons.filter(l => l.completed).length}
                  </div>
                  <div className="text-sm text-neutral-600">Lessons remaining</div>
                </div>
              </div>
            </div>
            
            {/* Settings & Resources */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Quick Actions</h3>
              
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => navigate('/settings')}
                    className="w-full text-left px-4 py-3 flex items-center text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <Settings className="h-5 w-5 mr-3 text-neutral-500" />
                    <span>Account & API Settings</span>
                  </button>
                </li>
                <li>
                  <a 
                    href="https://gemini.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full text-left px-4 py-3 flex items-center text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-5 w-5 mr-3 text-neutral-500" />
                    <span>Gemini API Documentation</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;