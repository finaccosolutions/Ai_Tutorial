import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight, Clock, SkipBack, SkipForward, Presentation } from 'lucide-react';
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
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const lastNarrationEndRef = useRef<number>(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsRef = useRef<string[]>([]);
  const slideDurationRef = useRef<number>(0);
  const slideStartTimeRef = useRef<number>(0);

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
    if (presentation?.slides?.[currentSlideIndex]) {
      const currentSlide = presentation.slides[currentSlideIndex];
      wordsRef.current = currentSlide.narration.split(/\s+/).filter(word => word.length > 0);
      slideDurationRef.current = currentSlide.duration;
      slideStartTimeRef.current = performance.now();
      setHighlightedWords([]);
      setCurrentWordIndex(0);
    }
  }, [currentSlideIndex, presentation]);

  useEffect(() => {
    if (isPaused) {
      stopPresentation();
    } else {
      startPresentation();
    }
  }, [isPaused, currentSlideIndex, isSpeakingEnabled]);

  const startPresentation = () => {
    if (!presentation?.slides?.length) return;

    const now = performance.now();
    if (pausedTimeRef.current > 0) {
      startTimeRef.current = now - pausedTimeRef.current;
    } else {
      startTimeRef.current = now;
      slideStartTimeRef.current = now;
    }

    if (isSpeakingEnabled) {
      const currentSlide = presentation.slides[currentSlideIndex];
      const words = currentSlide.narration.split(/\s+/).filter(word => word.length > 0);
      const startFromWord = Math.min(
        Math.floor((pausedTimeRef.current / 1000) * (words.length / currentSlide.duration)),
        words.length - 1
      );
      
      speechRef.current = speak(
        words.slice(startFromWord).join(' '), 
        () => {
          lastNarrationEndRef.current = performance.now();
          if (currentSlideIndex < presentation.slides.length - 1) {
            onSlideChange?.(currentSlideIndex + 1);
          }
        },
        1,
        (event) => {
          if (event.charIndex !== undefined) {
            // Calculate current word based on character index
            let wordCount = 0;
            let charCount = 0;
            for (let i = 0; i < words.length; i++) {
              charCount += words[i].length + 1; // +1 for space
              if (event.charIndex < charCount) {
                wordCount = i;
                break;
              }
            }
            setCurrentWordIndex(wordCount);
            setHighlightedWords(words.slice(0, wordCount + 1));
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
    if (isPaused) return;

    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    
    setElapsedTime(elapsed);
    onTimeUpdate?.(elapsed);

    let totalDuration = 0;
    for (let i = 0; i <= currentSlideIndex; i++) {
      totalDuration += presentation.slides[i].duration;
    }

    const currentSlide = presentation.slides[currentSlideIndex];
    const slideElapsed = elapsed - (totalDuration - currentSlide.duration);
    const progress = Math.min((slideElapsed / currentSlide.duration) * 100, 100);
    setSlideProgress(progress);

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const percentage = clickPosition / rect.width;
    const totalDuration = presentation.slides.reduce((sum, slide) => sum + slide.duration, 0);
    const newTime = totalDuration * percentage;
    
    let accumulatedTime = 0;
    let targetSlideIndex = 0;
    
    for (let i = 0; i < presentation.slides.length; i++) {
      accumulatedTime += presentation.slides[i].duration;
      if (newTime <= accumulatedTime) {
        targetSlideIndex = i;
        break;
      }
    }
    
    stopPresentation();
    onSlideChange?.(targetSlideIndex);
    pausedTimeRef.current = newTime * 1000;
    if (!isPaused) {
      startPresentation();
    }
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
      <div className="flex items-center justify-center min-h-[80vh] bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-xl shadow-lg">
        <p className="text-xl text-white/60">No slides available</p>
      </div>
    );
  }

  const currentSlide = presentation.slides[currentSlideIndex];
  const totalDuration = presentation.slides.reduce((sum, slide) => sum + slide.duration, 0);
  const progressPercentage = (elapsedTime / totalDuration) * 100;

  return (
    <div 
      ref={containerRef}
      className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 8rem)' }}
    >
      {/* Main Content */}
      <div className="flex-grow relative overflow-hidden">
        {/* Navigation Arrows */}
        <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
          <motion.button
            onClick={handlePrevSlide}
            disabled={currentSlideIndex === 0}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-4 rounded-full bg-white/10 backdrop-blur-sm transition-all ${
              currentSlideIndex === 0 ? 'opacity-0' : 'opacity-100 hover:bg-white/20'
            }`}
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </motion.button>
          <motion.button
            onClick={handleNextSlide}
            disabled={currentSlideIndex === presentation.slides.length - 1}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-4 rounded-full bg-white/10 backdrop-blur-sm transition-all ${
              currentSlideIndex === presentation.slides.length - 1 ? 'opacity-0' : 'opacity-100 hover:bg-white/20'
            }`}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </motion.button>
        </div>

        {/* Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full h-full p-4 flex flex-col items-center justify-center"
          >
            <div className="w-full h-full flex flex-col items-center justify-center">
              <motion.div
                className="bg-white/5 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-8 border border-white/10 w-full max-w-5xl"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.h2 
                  className="text-2xl sm:text-4xl font-bold text-white mb-6 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentSlide.content.split('\n')[0]}
                </motion.h2>
                
                <div className="prose prose-xl max-w-none prose-invert">
                  {currentSlide.narration.split(/\s+/).map((word, i) => (
                    <React.Fragment key={i}>
                      <motion.span
                        className={`inline-block transition-colors duration-200 ${
                          highlightedWords.includes(word) 
                            ? 'text-pink-300 font-medium' 
                            : 'text-white/80'
                        }`}
                      >
                        {word}
                      </motion.span>
                      {' '}
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>

              {/* Visual Aid */}
              {currentSlide.visualAid && (
                <motion.div
                  className="mt-4 sm:mt-8 w-full max-w-4xl px-4"
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
                    className="rounded-xl w-full h-auto max-h-[30vh] sm:max-h-[40vh] object-contain shadow-lg border border-white/20"
                    onLoad={() => setImageLoaded(true)}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="bg-black/40 backdrop-blur-sm border-t border-white/10 p-4">
        {/* Slide Progress */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex items-center gap-2">
            <Presentation className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/60">Slide {currentSlideIndex + 1}/{presentation.slides.length}</span>
          </div>
          <div className="flex-grow h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"
              style={{ width: `${slideProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center space-x-4 mb-3">
          <Clock className="w-4 h-4 text-white/60" />
          <div 
            ref={timelineRef}
            className="flex-grow h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group"
            onClick={handleTimelineClick}
          >
            <motion.div
              className="absolute inset-0 h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="text-sm text-white/60 tabular-nums hidden sm:inline">
            {formatTime(elapsedTime)}/{formatTime(totalDuration)}
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={onPlayPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-full shadow-lg transition-all ${
                isPaused 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                  : 'bg-white/20'
              }`}
            >
              {isPaused ? (
                <Play className="w-5 h-5 text-white" />
              ) : (
                <Pause className="w-5 h-5 text-white" />
              )}
            </motion.button>

            <motion.button
              onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-full ${
                isSpeakingEnabled 
                  ? 'bg-purple-500/50' 
                  : 'bg-white/20'
              }`}
            >
              {isSpeakingEnabled ? (
                <Volume2 className="w-4 h-4 text-white" />
              ) : (
                <VolumeX className="w-4 h-4 text-white" />
              )}
            </motion.button>

            <motion.button
              onClick={toggleFullscreen}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/20 hidden sm:flex"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </motion.button>
          </div>

          {/* Slide Navigation */}
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/20 disabled:opacity-50"
            >
              <SkipBack className="w-4 h-4 text-white" />
            </motion.button>
            <span className="text-sm text-white/60 mx-2">
              {currentSlideIndex + 1}/{presentation.slides.length}
            </span>
            <motion.button
              onClick={handleNextSlide}
              disabled={currentSlideIndex === presentation.slides.length - 1}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/20 disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;