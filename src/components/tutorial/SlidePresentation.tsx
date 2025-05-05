import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SlidePresentation } from '../../services/slideService';
import { speak, stopSpeaking, resumeSpeaking } from '../../services/voiceService';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const lastNarrationEndRef = useRef<number>(0);

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
    if (!isPaused) {
      resumePresentation();
    } else {
      stopPresentation();
    }
  }, [isPaused]);

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
      speak(currentSlide.narration, () => {
        lastNarrationEndRef.current = performance.now();
        if (currentSlideIndex < presentation.slides.length - 1) {
          onSlideChange?.(currentSlideIndex + 1);
        }
      });
    }

    animate();
  };

  const stopPresentation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    pausedTimeRef.current = performance.now() - startTimeRef.current;
    stopSpeaking();
  };

  const resumePresentation = () => {
    if (isSpeakingEnabled) {
      const currentSlide = presentation.slides[currentSlideIndex];
      resumeSpeaking(() => {
        lastNarrationEndRef.current = performance.now();
        if (currentSlideIndex < presentation.slides.length - 1) {
          onSlideChange?.(currentSlideIndex + 1);
        }
      });
    }
    animate();
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
    setHighlightedText(words.slice(0, wordIndex).join(' '));

    // Check if it's time to move to next slide
    if (elapsed >= totalDuration && currentSlideIndex < presentation.slides.length - 1) {
      onSlideChange?.(currentSlideIndex + 1);
    }

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
  const currentTime = pausedTimeRef.current > 0 
    ? pausedTimeRef.current / 1000 
    : (performance.now() - startTimeRef.current) / 1000;
  
  const totalDuration = presentation.slides.reduce((sum, slide) => sum + slide.duration, 0);

  return (
    <div 
      ref={containerRef}
      className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 8rem)' }}
    >
      {/* Main Content Area */}
      <div className="flex-grow relative bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full p-8 flex flex-col items-center justify-center"
          >
            {/* Navigation Arrows */}
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                className={`p-3 rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all ${
                  currentSlideIndex === 0 ? 'opacity-0' : 'opacity-100 hover:bg-white'
                }`}
              >
                <ChevronLeft className="w-6 h-6 text-blue-600" />
              </button>
              <button
                onClick={handleNextSlide}
                disabled={currentSlideIndex === presentation.slides.length - 1}
                className={`p-3 rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all ${
                  currentSlideIndex === presentation.slides.length - 1 ? 'opacity-0' : 'opacity-100 hover:bg-white'
                }`}
              >
                <ChevronRight className="w-6 h-6 text-blue-600" />
              </button>
            </div>

            {/* Content */}
            <div className="max-w-4xl w-full mx-auto">
              <motion.div
                className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-gray-800 mb-6">
                  {currentSlide.title}
                </h2>
                
                <div className="prose prose-lg max-w-none">
                  {currentSlide.content.split('\n').map((paragraph, i) => (
                    <motion.div 
                      key={i}
                      className="mb-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                    >
                      {!isPaused ? (
                        <p className="leading-relaxed">
                          <span className="text-blue-600 font-medium">
                            {highlightedText}
                          </span>
                          <span className="text-gray-600">
                            {paragraph.slice(highlightedText.length)}
                          </span>
                        </p>
                      ) : (
                        <p className="leading-relaxed text-gray-800">{paragraph}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="bg-white border-t border-gray-200 p-6">
        {/* Progress Bars */}
        <div className="space-y-2 mb-4">
          {/* Total Progress */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Total Progress</span>
              <span>{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>
          </div>

          {/* Slide Progress */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Slide Progress</span>
              <span>{currentSlideIndex + 1} / {presentation.slides.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentSlideIndex + 1) / presentation.slides.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onPlayPause}
              className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 ${
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
            </button>

            <button
              onClick={() => {}}
              className={`p-3 rounded-full ${
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
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;