import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface QuizProps {
  question: string;
  options: string[];
  correctAnswer: number;
  onComplete: (correct: boolean) => void;
}

const Quiz: React.FC<QuizProps> = ({
  question,
  options,
  correctAnswer,
  onComplete
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowFeedback(true);
    onComplete(index === correctAnswer);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto"
    >
      <div className="flex items-start gap-3 mb-6">
        <AlertCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-xl font-semibold text-neutral-800 mb-2">Quick Check</h3>
          <p className="text-neutral-600">{question}</p>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={showFeedback}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              showFeedback
                ? index === correctAnswer
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
                  ? index === correctAnswer
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
                  {index === correctAnswer ? (
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

      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-lg bg-neutral-50 border border-neutral-200"
        >
          <p className="text-neutral-700">
            {selectedAnswer === correctAnswer
              ? "That's correct! Well done!"
              : `The correct answer was: ${options[correctAnswer]}`}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Quiz;