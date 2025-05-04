import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import type { SlidePresentation } from '../../services/slideService';

interface SlidePresentationProps {
  presentation: SlidePresentation;
  isSpeakingEnabled: boolean;
  onTimeUpdate?: (time: number) => void;
}

const SlidePresentation: React.FC<SlidePresentationProps> = ({
  presentation,
  isSpeakingEnabled,
  onTimeUpdate
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightIntervalRef = useRef<number>();
  const currentWordIndexRef = useRef(0);

  // Ensure we have valid slides before accessing
  if (!presentation?.slides?.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white rounded-lg shadow-lg">
        <p className="text-neutral-600">No slides available</p>
      </div>
    );
  }

  const currentSlide = presentation.slides[currentSlideIndex];

  useEffect(() => {
    setDuration(presentation.totalDuration);
  }, [presentation]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Cleanup interval on unmount or when isPlaying changes
    return () => {
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const startPresentation = () => {
    setIsPlaying(true);
    const words = currentSlide.narration.split(' ');
    currentWordIndexRef.current = 0;

    // Clear any existing interval
    if (highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current);
    }

    const highlightWords = () => {
      if (currentWordIndexRef.current < words.length) {
        setHighlightedText(words.slice(0, currentWordIndexRef.current + 1).join(' '));
        currentWordIndexRef.current++;
        setCurrentTime(prev => prev + 0.3); // Update time based on word highlighting
      } else {
        // Current slide finished
        clearInterval(highlightIntervalRef.current);
        
        if (currentSlideIndex < presentation.slides.length - 1) {
          // Move to next slide after a brief pause
          setTimeout(() => {
            setCurrentSlideIndex(prev => prev + 1);
            currentWordIndexRef.current = 0;
            setHighlightedText('');
            startPresentation(); // Start the next slide
          }, 1000);
        } else {
          // End of presentation
          setIsPlaying(false);
          setCurrentTime(duration);
        }
      }
    };

    // Start highlighting words with a consistent interval
    highlightIntervalRef.current = window.setInterval(highlightWords, 300);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
      }
    } else {
      // If we're at the end, restart from beginning
      if (currentSlideIndex === presentation.slides.length - 1 && currentWordIndexRef.current === currentSlide.narration.split(' ').length) {
        setCurrentSlideIndex(0);
        setCurrentTime(0);
        currentWordIndexRef.current = 0;
        setHighlightedText('');
      }
      startPresentation();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`relative bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center ${
        isFullscreen ? 'h-screen' : 'min-h-[60vh]'
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full p-12 flex flex-col items-center justify-center"
          >
            <div className="prose prose-lg max-w-4xl mx-auto">
              <motion.div
                className="bg-white rounded-xl shadow-lg p-8 backdrop-blur-sm bg-opacity-90"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl font-bold text-primary-800 mb-6">
                  {currentSlide.content.split('\n')[0]}
                </h2>
                <div className="space-y-4 text-lg leading-relaxed">
                  {currentSlide.narration.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-neutral-700">
                      {isPlaying ? (
                        <>
                          <span className="text-primary-900 font-medium">
                            {highlightedText}
                          </span>
                          <span className="text-neutral-400">
                            {paragraph.slice(highlightedText.length)}
                          </span>
                        </>
                      ) : (
                        paragraph
                      )}
                    </p>
                  ))}
                </div>
              </motion.div>
            </div>

            {currentSlide.visualAid && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 w-full max-w-2xl mx-auto"
              >
                <img
                  src={`https://source.unsplash.com/1600x900/?${encodeURIComponent(currentSlide.visualAid)}`}
                  alt={currentSlide.visualAid}
                  className="rounded-lg w-full h-auto object-cover shadow-lg"
                  loading="eager"
                />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-4 bg-white border-t border-neutral-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-neutral-600">{formatTime(currentTime)}</span>
          <div className="flex-grow h-1 bg-neutral-200 rounded-full">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <span className="text-sm text-neutral-600">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-600">
            {currentSlideIndex + 1} of {presentation.slides.length}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
              className="p-2 text-neutral-600 hover:text-primary-600"
            >
              {isSpeakingEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-neutral-600 hover:text-primary-600"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          <div className="text-sm text-neutral-600">
            {formatTime(currentSlide.duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;