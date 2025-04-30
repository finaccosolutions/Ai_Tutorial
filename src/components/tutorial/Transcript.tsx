import React from 'react';
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

      <div className="space-y-4">
        {captions.map((caption, index) => (
          <motion.div
            key={index}
            initial={false}
            animate={{
              backgroundColor: currentTime >= caption.start && currentTime <= caption.end
                ? 'rgb(239 246 255)' // bg-blue-50
                : 'transparent'
            }}
            className="rounded-lg p-3 transition-colors"
          >
            <button
              onClick={() => onTimestampClick(caption.start)}
              className="flex items-start gap-3 w-full text-left group"
            >
              <span className="text-sm font-medium text-neutral-500 group-hover:text-primary-600 transition-colors whitespace-nowrap">
                {formatTimestamp(caption.start)}
              </span>
              <p className="text-neutral-700 group-hover:text-neutral-900 transition-colors">
                {caption.text}
              </p>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Transcript;