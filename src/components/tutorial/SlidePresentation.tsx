import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SlidePresentation } from '../../services/slideService';
import { speak, stopSpeaking } from '../../services/voiceService';

interface SlidePresentationProps {
  presentation: SlidePresentation;
  isSpeakingEnabled: boolean;
  isPaused: boolean;
  currentSlideIndex: number;
  onTimeUpdate?: (time: number) => void;
  onSlideChange?: (index: number) => void;
  onPlayPause?: () => void;
}

const SlidePresentation: React.FC<SlidePresentationProps> = ({
  presentation,
  isSpeakingEnabled,
  isPaused,
  currentSlideIndex,
  onTimeUpdate,
  onSlideChange,
  onPlayPause
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const lastNarrationEndRef = useRef<number>(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      stopPresentation();
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      stopPresentation();
    } else {
      startPresentation();
    }
  }, [isPaused, currentSlideIndex]);

  const startPresentation = () => {
    if (!presentation?.slides?.length) return;

    const now = performance.now();
    if (pausedTimeRef.current > 0) {
      startTimeRef.current = now - pausedTimeRef.current;
    } else {
      startTimeRef.current = now;
    }

    if (isSpeakingEnabled) {
      const currentSlide = presentation.slides[currentSlideIndex];
      const words = currentSlide.narration.split(' ');
      const startFromWord = Math.floor((pausedTimeRef.current / 1000) * (words.length / currentSlide.duration));
      
      speechRef.current = speak(
        words.slice(startFromWord).join(' '), 
        () => {
          lastNarrationEndRef.current = performance.now();
          if (currentSlideIndex < presentation.slides.length - 1) {
            onSlideChange?.(currentSlideIndex + 1);
          }
        }
      );
    }

    animate();
  };

  const stopPresentation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    pausedTimeRef.current = performance.now() - startTimeRef.current;
    if (speechRef.current) {
      stopSpeaking();
    }
  };

  const animate = () => {
    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    
    onTimeUpdate?.(elapsed);

    // Calculate total duration up to current slide
    let totalDuration = 0;
    for (let i = 0; i <= currentSlideIndex; i++) {
      totalDuration += presentation.slides[i].duration;
    }

    // Update highlighted text based on elapsed time
    const currentSlide = presentation.slides[currentSlideIndex];
    const slideElapsed = elapsed - (totalDuration - currentSlide.duration);
    const words = currentSlide.narration.split(' ');
    const wordsPerSecond = words.length / currentSlide.duration;
    const wordIndex = Math.floor(slideElapsed * wordsPerSecond);
    
    if (wordIndex !== currentWordIndex) {
      setCurrentWordIndex(wordIndex);
      setHighlightedText(words.slice(0, wordIndex).join(' '));
    }

    // Update slide progress
    const slideProgress = Math.min((slideElapsed / currentSlide.duration) * 100, 100);
    setSlideProgress(slideProgress);

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      stopPresentation();
      onSlideChange?.(currentSlideIndex - 1);
      pausedTimeRef.current = 0;
      if (!isPaused) {
        startPresentation();
      }
    }
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < presentation.slides.length - 1) {
      stopPresentation();
      onSlideChange?.(currentSlideIndex + 1);
      pausedTimeRef.current = 0;
      if (!isPaused) {
        startPresentation();
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!presentation?.slides?.length) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg">
        <p className="text-xl text-gray-600">No slides available</p>
      </div>
    );
  }

  const currentSlide = presentation.slides[currentSlideIndex];
  const elapsedTime = pausedTimeRef.current > 0 
    ? pausedTimeRef.current / 1000 
    : (performance.now() - startTimeRef.current) / 1000;
  
  const totalDuration = presentation.slides.reduce((sum, slide) => sum + slide.duration, 0);
  const progressPercentage = (elapsedTime / totalDuration) * 100;

  return (
    <div 
      ref={containerRef}
      className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 8rem)' }}
    >
      {/* Slide Content */}
      <div className="flex-grow relative bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full h-full p-8 flex flex-col items-center justify-center"
          >
            {/* Navigation Arrows */}
            <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
              <motion.button
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-3 rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all ${
                  currentSlideIndex === 0 ? 'opacity-0' : 'opacity-100 hover:bg-white'
                }`}
              >
                <ChevronLeft className="w-6 h-6 text-blue-600" />
              </motion.button>
              <motion.button
                onClick={handleNextSlide}
                disabled={currentSlideIndex === presentation.slides.length - 1}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-3 rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all ${
                  currentSlideIndex === presentation.slides.length - 1 ? 'opacity-0' : 'opacity-100 hover:bg-white'
                }`}
              >
                <ChevronRight className="w-6 h-6 text-blue-600" />
              </motion.button>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl w-full mx-auto">
              <motion.div
                className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-gray-100"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.h2 
                  className="text-3xl font-bold text-gray-800 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentSlide.content.split('\n')[0]}
                </motion.h2>
                
                <div className="prose prose-lg max-w-none">
                  {currentSlide.narration.split('\n').map((paragraph, i) => (
                    <motion.p 
                      key={i}
                      className="mb-4 leading-relaxed"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {!isPaused ? (
                        <>
                          <span className="text-blue-600 font-medium">
                            {highlightedText}
                          </span>
                          <span className="text-gray-400">
                            {paragraph.slice(highlightedText.length)}
                          </span>
                        </>
                      ) : (
                        paragraph
                      )}
                    </motion.p>
                  ))}
                </div>
              </motion.div>

              {/* Visual Aid */}
              {currentSlide.visualAid && (
                <motion.div
                  className="mt-8 w-full max-w-3xl mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: imageLoaded ? 1 : 0,
                    y: imageLoaded ? 0 : 20
                  }}
                  transition={{ delay: 0.4 }}
                >
                  <img
                    src={currentSlide.visualAid}
                    alt="Visual aid"
                    className="rounded-xl w-full h-auto object-cover shadow-lg"
                    onLoad={() => setImageLoaded(true)}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-6 bg-white border-t border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-medium text-gray-600 w-16">
            {formatTime(elapsedTime)}
          </span>
          
          <div className="flex-grow flex flex-col gap-2">
            {/* Overall progress */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Current slide progress */}
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${slideProgress}%` }}
              />
            </div>
          </div>
          
          <span className="text-sm font-medium text-gray-600 w-16">
            {formatTime(totalDuration)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">
            Slide {currentSlideIndex + 1} of {presentation.slides.length}
          </div>

          <div className="flex items-center space-x-4">
            <motion.button
              onClick={onPlayPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-full shadow-lg transition-all ${
                isPaused 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white`}
            >
              {isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </motion.button>

            <motion.button
              onClick={() => {}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-full shadow-sm ${
                isSpeakingEnabled 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              } hover:bg-blue-200 transition-colors`}
            >
              {isSpeakingEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </motion.button>

            <motion.button
              onClick={toggleFullscreen}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;