import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SlidePresentation } from '../../services/slideService';
import { speak, stopSpeaking } from '../../services/voiceService';

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
  const [highlightedText, setHighlightedText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const wordTimersRef = useRef<NodeJS.Timeout[]>([]);
  const currentSlideRef = useRef(presentation.slides[currentSlideIndex]);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);

  // Update current slide ref when index changes
  useEffect(() => {
    currentSlideRef.current = presentation.slides[currentSlideIndex];
    setImageLoaded(false);
    setHighlightedText('');
  }, [currentSlideIndex, presentation]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPresentation();
      clearWordTimers();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startPresentation = () => {
    setIsPlaying(true);
    startTimeRef.current = Date.now() - pauseTimeRef.current;
    pauseTimeRef.current = 0;

    // Start narration if enabled
    if (isSpeakingEnabled) {
      speakCurrentSlide();
    }

    // Start progress animation
    updateTime();
  };

  const stopPresentation = () => {
    setIsPlaying(false);
    stopSpeaking();
    pauseTimeRef.current = Date.now() - startTimeRef.current;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    clearWordTimers();
  };

  const speakCurrentSlide = () => {
    const slide = currentSlideRef.current;
    if (!slide?.narration) return;

    // Clear any existing timers
    clearWordTimers();

    const words = slide.narration.split(' ');
    const wordDuration = (slide.duration * 1000) / words.length;

    // Highlight words one by one
    words.forEach((_, index) => {
      const timer = setTimeout(() => {
        if (!isPlaying) return;
        setHighlightedText(words.slice(0, index + 1).join(' '));
      }, index * wordDuration);
      wordTimersRef.current.push(timer);
    });

    // Speak the narration
    stopSpeaking();
    speak(slide.narration, () => {
      if (currentSlideIndex < presentation.slides.length - 1) {
        // Move to next slide when narration ends
        setTimeout(() => {
          setCurrentSlideIndex(prev => prev + 1);
        }, 500);
      } else {
        // End of presentation
        stopPresentation();
      }
    }, 0.9);
  };

  const updateTime = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setCurrentTime(elapsed);
    onTimeUpdate?.(elapsed);

    // Check if we need to move to next slide
    const slideEndTime = presentation.slides
      .slice(0, currentSlideIndex + 1)
      .reduce((sum, slide) => sum + slide.duration, 0);

    if (elapsed >= slideEndTime && currentSlideIndex < presentation.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }

    if (elapsed < presentation.totalDuration) {
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      stopPresentation();
    }
  };

  const clearWordTimers = () => {
    wordTimersRef.current.forEach(timer => clearTimeout(timer));
    wordTimersRef.current = [];
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPresentation();
    } else {
      // If at end, restart from beginning
      if (currentSlideIndex === presentation.slides.length - 1) {
        setCurrentSlideIndex(0);
        setCurrentTime(0);
      }
      startPresentation();
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < presentation.slides.length - 1) {
      stopPresentation();
      setCurrentSlideIndex(prev => prev + 1);
      setCurrentTime(presentation.slides
        .slice(0, currentSlideIndex + 1)
        .reduce((sum, slide) => sum + slide.duration, 0));
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      stopPresentation();
      setCurrentSlideIndex(prev => prev - 1);
      setCurrentTime(presentation.slides
        .slice(0, currentSlideIndex - 1)
        .reduce((sum, slide) => sum + slide.duration, 0));
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
  const progressPercentage = (currentTime / presentation.totalDuration) * 100;
  const slideProgressPercentage = ((currentTime - presentation.slides
    .slice(0, currentSlideIndex)
    .reduce((sum, slide) => sum + slide.duration, 0)) / currentSlide.duration) * 100;

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full h-full p-8 flex flex-col items-center justify-center"
          >
            {/* Slide Navigation Arrows */}
            <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
              <button
                onClick={goToPrevSlide}
                disabled={currentSlideIndex === 0}
                className={`p-3 rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all ${
                  currentSlideIndex === 0 ? 'opacity-0' : 'opacity-100 hover:bg-white'
                }`}
              >
                <ChevronLeft className="w-6 h-6 text-blue-600" />
              </button>
              <button
                onClick={goToNextSlide}
                disabled={currentSlideIndex === presentation.slides.length - 1}
                className={`p-3 rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all ${
                  currentSlideIndex === presentation.slides.length - 1 ? 'opacity-0' : 'opacity-100 hover:bg-white'
                }`}
              >
                <ChevronRight className="w-6 h-6 text-blue-600" />
              </button>
            </div>

            {/* Main Slide Content */}
            <div className="max-w-6xl w-full mx-auto relative z-0">
              <motion.div
                className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-gray-100"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-4xl font-bold text-gray-800 mb-8 leading-tight">
                  {currentSlide.content.split('\n')[0]}
                </h2>
                
                <div className="prose prose-xl max-w-none text-gray-700">
                  {currentSlide.narration.split('\n').map((paragraph, i) => (
                    <motion.p 
                      key={i} 
                      className="mb-6 leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                    >
                      {isPlaying ? (
                        <>
                          <span className="text-blue-600 font-medium">
                            {highlightedText.split('\n')[i] || ''}
                          </span>
                          <span className="text-gray-400">
                            {paragraph.slice((highlightedText.split('\n')[i] || '').length)}
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
                  className="mt-10 w-full max-w-4xl mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: imageLoaded ? 1 : 0,
                    y: imageLoaded ? 0 : 20
                  }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <img
                    src={currentSlide.visualAid.includes('http') 
                      ? currentSlide.visualAid 
                      : `https://source.unsplash.com/1600x900/?${encodeURIComponent(currentSlide.visualAid)}`}
                    alt={currentSlide.visualAid}
                    className="rounded-xl w-full h-auto object-cover shadow-lg"
                    loading="eager"
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
          <span className="text-sm font-medium text-gray-600 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-grow flex flex-col gap-1">
            {/* Overall progress */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {/* Current slide progress */}
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${slideProgressPercentage}%` }}
              />
            </div>
          </div>
          
          <span className="text-sm font-medium text-gray-600 w-12">
            {formatTime(presentation.totalDuration)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">
            Slide {currentSlideIndex + 1} of {presentation.slides.length}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
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