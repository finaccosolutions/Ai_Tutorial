import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { SlidePresentation } from '../../services/slideService';
import slideService from '../../services/slideService';
import ReactMarkdown from 'react-markdown';

interface SlidePresentationProps {
  presentation: SlidePresentation;
  isSpeakingEnabled: boolean;
}

const SlidePresentation: React.FC<SlidePresentationProps> = ({ 
  presentation,
  isSpeakingEnabled
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentSlide = presentation.slides[currentSlideIndex];

  useEffect(() => {
    // Stop presentation when speaking is disabled
    if (!isSpeakingEnabled && isPlaying) {
      stopPresentation();
    }
  }, [isSpeakingEnabled]);

  const startPresentation = () => {
    setIsPlaying(true);
    slideService.startPresentation(presentation, (index) => {
      setCurrentSlideIndex(index);
    }, isSpeakingEnabled);
  };

  const stopPresentation = () => {
    setIsPlaying(false);
    slideService.stopPresentation();
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPresentation();
    } else {
      startPresentation();
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < presentation.slides.length - 1) {
      stopPresentation();
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      stopPresentation();
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Slide Content */}
      <div className="relative aspect-video bg-neutral-900 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full p-12 flex items-center justify-center"
          >
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{currentSlide.content}</ReactMarkdown>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 bg-white border-t border-neutral-200">
        <div className="flex items-center justify-between">
          {/* Progress */}
          <div className="text-sm text-neutral-600">
            Slide {currentSlideIndex + 1} of {presentation.slides.length}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={previousSlide}
              disabled={currentSlideIndex === 0}
              className="p-2 text-neutral-600 hover:text-primary-600 disabled:opacity-50"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!isSpeakingEnabled}
              className={`p-3 rounded-full ${
                isSpeakingEnabled 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={nextSlide}
              disabled={currentSlideIndex === presentation.slides.length - 1}
              className="p-2 text-neutral-600 hover:text-primary-600 disabled:opacity-50"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Duration */}
          <div className="text-sm text-neutral-600">
            {Math.floor(currentSlide.duration / 60)}:{(currentSlide.duration % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;