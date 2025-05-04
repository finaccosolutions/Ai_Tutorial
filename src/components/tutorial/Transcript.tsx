import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

interface TranscriptProps {
  captions: Caption[];
  currentTime: number;
  onTimestampClick: (time: number) => void;
}

interface Caption {
  start: number;
  end: number;
  text: string;
}

const Transcript: React.FC<TranscriptProps> = ({
  captions,
  currentTime,
  onTimestampClick
}) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const [highlightedWords, setHighlightedWords] = useState<number[]>([]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentTime]);

  useEffect(() => {
    // Calculate which words should be highlighted based on currentTime
    const activeCaption = captions.find(
      caption => currentTime >= caption.start && currentTime <= caption.end
    );

    if (activeCaption) {
      const words = activeCaption.text.split(' ');
      const timePerWord = (activeCaption.end - activeCaption.start) / words.length;
      const elapsedTime = currentTime - activeCaption.start;
      const wordsToHighlight = Math.floor(elapsedTime / timePerWord);
      
      setHighlightedWords(Array.from({ length: wordsToHighlight }, (_, i) => i));
    } else {
      setHighlightedWords([]);
    }
  }, [currentTime, captions]);

  const formatTimestamp = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-neutral-800">Transcript</h3>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-24rem)] overflow-y-auto">
        {captions.map((caption, index) => {
          const isActive = currentTime >= caption.start && currentTime <= caption.end;
          const words = caption.text.split(' ');
          
          return (
            <motion.div
              key={index}
              initial={false}
              animate={{
                backgroundColor: isActive ? 'rgb(239 246 255)' : 'transparent'
              }}
              className="rounded-lg p-3 transition-colors"
              ref={isActive ? activeRef : null}
            >
              <button
                onClick={() => onTimestampClick(caption.start)}
                className="flex items-start gap-3 w-full text-left group"
              >
                <span className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'text-primary-600' : 'text-neutral-500 group-hover:text-primary-600'
                }`}>
                  {formatTimestamp(caption.start)}
                </span>
                <p className={`transition-colors`}>
                  {words.map((word, wordIndex) => (
                    <span
                      key={wordIndex}
                      className={`${
                        isActive && highlightedWords.includes(wordIndex)
                          ? 'text-primary-700 font-medium'
                          : 'text-neutral-700'
                      } ${wordIndex > 0 ? 'ml-1' : ''}`}
                    >
                      {word}
                    </span>
                  ))}
                </p>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Transcript;