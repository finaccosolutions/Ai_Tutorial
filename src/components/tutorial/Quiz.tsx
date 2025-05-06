import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Award, Brain, Timer, ArrowRight } from 'lucide-react';
import geminiService from '../../services/geminiService';

interface QuizProps {
  topic: string;
  knowledgeLevel: string;
  onComplete: (correct: boolean) => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  type: 'multiple-choice' | 'coding';
  codeSnippet?: string;
}

const Quiz: React.FC<QuizProps> = ({
  topic,
  knowledgeLevel,
  onComplete
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userCode, setUserCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuizQuestions();
  }, [topic, knowledgeLevel]);

  useEffect(() => {
    if (!showFeedback && !quizCompleted && questions.length > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAnswer(-1); // Auto-submit on timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showFeedback, currentQuestionIndex, quizCompleted, questions.length]);

  const loadQuizQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await geminiService.generateQuizQuestions(topic, knowledgeLevel);
      setQuestions(response);
      setTimeLeft(30);
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      setError('Failed to load quiz questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (!questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = index === currentQuestion.correctAnswer;
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setSelectedAnswer(index);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setTimeLeft(30);
      setUserCode('');
    } else {
      setQuizCompleted(true);
      onComplete(score === questions.length);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-neutral-600">Preparing your quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error-600 mx-auto mb-4" />
          <p className="text-error-600 mb-4">{error}</p>
          <button
            onClick={loadQuizQuestions}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = (score / questions.length) * 100;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 text-center"
      >
        <div className="mb-6">
          <Award className="w-16 h-16 text-primary-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Quiz Completed!</h2>
          <p className="text-neutral-600">
            You scored {score} out of {questions.length} ({Math.round(percentage)}%)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <svg className="w-24 h-24">
                <circle
                  className="text-gray-200"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="44"
                  cx="48"
                  cy="48"
                />
                <circle
                  className="text-primary-600"
                  strokeWidth="8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="44"
                  cx="48"
                  cy="48"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 44}`,
                    strokeDashoffset: `${2 * Math.PI * 44 * (1 - percentage / 100)}`,
                    transform: "rotate(-90deg)",
                    transformOrigin: "48px 48px"
                  }}
                />
              </svg>
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-primary-600">
                {Math.round(percentage)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-700">
              {percentage >= 80 ? '🎉 Excellent work!' : 
               percentage >= 60 ? '👍 Good job!' : 
               'Keep practicing!'}
            </p>
            <p className="text-sm text-neutral-500">
              Review the questions and explanations to reinforce your learning.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  if (!questions.length) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto"
    >
      {/* Quiz Header */}
      <div className="flex items-start gap-3 mb-6">
        <Brain className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-neutral-800">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h3>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Timer className="w-4 h-4" />
              <span>{timeLeft}s</span>
            </div>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-1.5 mb-4">
            <div 
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-neutral-600">{currentQuestion.question}</p>
        </div>
      </div>

      {/* Question Content */}
      <div className="space-y-3">
        {currentQuestion.type === 'coding' && (
          <div className="mb-4">
            <div className="bg-neutral-800 text-white p-4 rounded-lg mb-4">
              <pre className="font-mono text-sm">
                <code>{currentQuestion.codeSnippet}</code>
              </pre>
            </div>
            <textarea
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              className="w-full h-32 p-4 border border-neutral-200 rounded-lg font-mono text-sm"
              placeholder="Write your code here..."
              disabled={showFeedback}
            />
          </div>
        )}

        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={showFeedback}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              showFeedback
                ? index === currentQuestion.correctAnswer
                  ? 'border-success-500 bg-success-50'
                  : index === selectedAnswer
                  ? 'border-error-500 bg-error-50'
                  : 'border-neutral-200 bg-neutral-50'
                : 'border-neutral-200 hover:border-primary-500 hover:bg-primary-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-left ${
                showFeedback
                  ? index === currentQuestion.correctAnswer
                    ? 'text-success-700'
                    : index === selectedAnswer
                    ? 'text-error-700'
                    : 'text-neutral-500'
                  : 'text-neutral-700'
              }`}>
                {option}
              </span>
              
              {showFeedback && (
                <AnimatePresence>
                  {index === currentQuestion.correctAnswer ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-success-500" />
                    </motion.div>
                  ) : index === selectedAnswer ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <XCircle className="w-5 h-5 text-error-500" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <div className={`p-4 rounded-lg ${
            selectedAnswer === currentQuestion.correctAnswer
              ? 'bg-success-50 border border-success-200'
              : 'bg-error-50 border border-error-200'
          }`}>
            <p className={`font-medium mb-2 ${
              selectedAnswer === currentQuestion.correctAnswer
                ? 'text-success-700'
                :  'text-error-700'
            }`}>
              {selectedAnswer === currentQuestion.correctAnswer
                ? "That's correct! 🎉"
                : "Not quite right"}
            </p>
            <p className="text-neutral-700">{currentQuestion.explanation}</p>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleNext}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'Complete Quiz'
              )}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Quiz;