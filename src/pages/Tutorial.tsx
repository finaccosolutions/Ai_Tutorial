import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, MessageSquare, Mic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import geminiService from '../services/geminiService';
import { speak, stopSpeaking } from '../services/voiceService';

const Tutorial: React.FC = () => {
  const { user, geminiApiKey } = useAuth();
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();
  
  const [tutorialContent, setTutorialContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!user || !geminiApiKey) {
      navigate('/settings');
      return;
    }

    loadTutorial();
  }, [user, geminiApiKey, preferences]);

  const loadTutorial = async () => {
    if (!preferences?.subject || !preferences?.knowledgeLevel) return;

    setIsLoading(true);
    try {
      const content = await geminiService.generateTutorial(
        preferences.subject,
        preferences.knowledgeLevel
      );
      setTutorialContent(content);
    } catch (error) {
      console.error('Error loading tutorial:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      speak(tutorialContent);
    } else {
      stopSpeaking();
    }
  };

  const toggleSpeech = () => {
    setIsSpeaking(!isSpeaking);
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  const handleAskQuestion = async () => {
    if (!currentQuestion.trim()) return;

    try {
      const answer = await geminiService.answerQuestion(
        currentQuestion,
        preferences?.subject || ''
      );

      // Save to chat history
      await supabase
        .from('chat_history')
        .insert([
          {
            user_id: user?.id,
            question: currentQuestion,
            answer
          }
        ]);

      setCurrentQuestion('');
      // Update UI to show answer
    } catch (error) {
      console.error('Error asking question:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-semibold text-neutral-800">Generating your tutorial...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Tutorial Header */}
      <div className="bg-white border-b border-neutral-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-800">
            {preferences?.subject} Tutorial
          </h1>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlayback}
              className="btn btn-secondary"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            
            <button
              onClick={toggleSpeech}
              className="btn btn-secondary"
            >
              {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            
            <button
              onClick={() => setShowChat(true)}
              className="btn btn-secondary"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tutorial Content */}
          <div className="prose max-w-none">
            {tutorialContent.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">{paragraph}</p>
            ))}
          </div>

          {/* Visual Aid */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <img
              src="https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg"
              alt="Tutorial visual aid"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l border-neutral-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Ask Questions</h2>
            <button
              onClick={() => setShowChat(false)}
              className="text-neutral-500 hover:text-neutral-700"
            >
              ×
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              className="input flex-grow"
              placeholder="Ask a question..."
            />
            <button
              onClick={handleAskQuestion}
              className="btn btn-primary"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tutorial;