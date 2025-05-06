import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Award, Brain, ArrowRight, X, RefreshCw } from 'lucide-react';
import geminiService from '../../services/geminiService';

interface QuizProps {
  topic: string;
  knowledgeLevel: string;
  onComplete: (correct: boolean) => void;
}

interface QuizQuestion {
  question: string;
  type: 'multiple-choice' | 'fill-blank' | 'true-false';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  codeSnippet?: string;
}

const Quiz: React.FC<QuizProps> = ({
  topic,
  knowledgeLevel,
  onComplete
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (topic && knowledgeLevel) {
      loadQuizQuestions();
    }
  }, [topic, knowledgeLevel]);

  const loadQuizQuestions = async () => {
    if (!topic || !knowledgeLevel) {
      setError('Topic and level are required to generate quiz questions.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const allQuestions = await geminiService.generateQuizQuestions(topic, knowledgeLevel);
      // Take 20 random questions
      const shuffledQuestions = allQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);
      setQuestions(shuffledQuestions);
      setRetryCount(0);
    } catch (error: any) {
      console.error('Error loading quiz questions:', error);
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(loadQuizQuestions, 1000 * (retryCount + 1));
      } else {
        setError('Failed to load quiz questions. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    let isCorrect = false;

    switch (currentQuestion.type) {
      case 'multiple-choice':
        isCorrect = selectedAnswer === currentQuestion.correctAnswer.toString();
        break;
      case 'fill-blank':
      case 'short-answer':
        isCorrect = userAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toString().toLowerCase().trim();
        break;
      case 'true-false':
        isCorrect = selectedAnswer === currentQuestion.correctAnswer.toString();
        break;
    }
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setUserAnswer('');
      setShowFeedback(false);
    } else {
      setQuizCompleted(true);
      onComplete(score === questions.length);
    }
  };

  const handleClose = () => {
    onComplete(false);
  };

  const handleRetry = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setUserAnswer('');
    setQuizCompleted(false);
    setError(null);
    setRetryCount(0);
    loadQuizQuestions();
  };

  const renderQuestionContent = () => {
    const currentQuestion = questions[currentQuestionIndex];

    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(index.toString())}
                disabled={showFeedback}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  showFeedback
                    ? index.toString() === currentQuestion.correctAnswer.toString()
                      ? 'border-emerald-500 bg-emerald-50'
                      : index.toString() === selectedAnswer
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-neutral-200 bg-neutral-50'
                    : selectedAnswer === index.toString()
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-neutral-200 hover:border-indigo-500 hover:bg-indigo-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-left ${
                    showFeedback
                      ? index.toString() === currentQuestion.correctAnswer.toString()
                        ? 'text-emerald-700'
                        : index.toString() === selectedAnswer
                        ? 'text-rose-700'
                        : 'text-neutral-500'
                      : 'text-neutral-700'
                  }`}>
                    {option}
                  </span>
                  
                  {showFeedback && (
                    <AnimatePresence>
                      {index.toString() === currentQuestion.correctAnswer.toString() ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </motion.div>
                      ) : index.toString() === selectedAnswer ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <XCircle className="w-5 h-5 text-rose-500" />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case 'fill-blank':
      case 'short-answer':
        return (
          <div className="space-y-4">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={showFeedback}
            />
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <button
                key={option}
                onClick={() => setSelectedAnswer(option)}
                disabled={showFeedback}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  showFeedback
                    ? option === currentQuestion.correctAnswer.toString()
                      ? 'border-emerald-500 bg-emerald-50'
                      : option === selectedAnswer
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-neutral-200 bg-neutral-50'
                    : selectedAnswer === option
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-neutral-200 hover:border-indigo-500 hover:bg-indigo-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-neutral-800">Loading Quiz</h2>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-neutral-600">Preparing your quiz questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-neutral-800">Error</h2>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <p className="text-rose-600 mb-4">{error}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleRetry}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="bg-neutral-100 text-neutral-700 px-6 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = (score / questions.length) * 100;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-neutral-800">Quiz Results</h2>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="text-center">
            <Award className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Quiz Completed!</h2>
            <p className="text-neutral-600">
              You scored {score} out of {questions.length} ({Math.round(percentage)}%)
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 my-6">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <svg className="w-24 h-24">
                  <circle
                    className="text-neutral-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="44"
                    cx="48"
                    cy="48"
                  />
                  <circle
                    className="text-indigo-600"
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
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-indigo-600">
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

          <div className="flex justify-center gap-4">
            <button
              onClick={handleRetry}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={handleClose}
              className="bg-neutral-100 text-neutral-700 px-6 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Close Quiz
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!questions.length) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Quiz</h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <Brain className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-neutral-800">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h3>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 mb-4">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-neutral-600">{currentQuestion.question}</p>
          </div>
        </div>

        <div className="space-y-3">
          {currentQuestion.codeSnippet && (
            <div className="mb-4">
              <div className="bg-neutral-800 text-white p-4 rounded-lg mb-4">
                <pre className="font-mono text-sm">
                  <code>{currentQuestion.codeSnippet}</code>
                </pre>
              </div>
            </div>
          )}

          {renderQuestionContent()}
        </div>

        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className={`p-4 rounded-lg ${
              (currentQuestion.type === 'multiple-choice' && selectedAnswer === currentQuestion.correctAnswer.toString()) ||
              (currentQuestion.type !== 'multiple-choice' && userAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toString().toLowerCase().trim())
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-rose-50 border border-rose-200'
            }`}>
              <p className={`font-medium mb-2 ${
                (currentQuestion.type === 'multiple-choice' && selectedAnswer === currentQuestion.correctAnswer.toString()) ||
                (currentQuestion.type !== 'multiple-choice' && userAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toString().toLowerCase().trim())
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}>
                {(currentQuestion.type === 'multiple-choice' && selectedAnswer === currentQuestion.correctAnswer.toString()) ||
                 (currentQuestion.type !== 'multiple-choice' && userAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toString().toLowerCase().trim())
                  ? "That's correct! 🎉"
                  : "Not quite right"}
              </p>
              <p className="text-neutral-700">{currentQuestion.explanation}</p>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={handleNext}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
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

        {!showFeedback && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleAnswer}
              disabled={!selectedAnswer && !userAnswer}
              className={`bg-indigo-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                !selectedAnswer && !userAnswer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
              }`}
            >
              Submit Answer
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Quiz;