import React, { useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentTime]);

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
                <p className={`transition-colors ${
                  isActive ? 'text-neutral-900' : 'text-neutral-700 group-hover:text-neutral-900'
                }`}>
                  {caption.text}
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