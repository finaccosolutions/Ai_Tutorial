import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight, Clock, SkipBack, SkipForward, BookOpen, Lightbulb, Code, CheckCircle2, Target } from 'lucide-react';
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
  const [elapsedTime, setElapsedTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const lastNarrationEndRef = useRef<number>(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsRef = useRef<string[]>([]);
  const lastWordUpdateRef = useRef<number>(0);
  const WORD_UPDATE_INTERVAL = 50; // ms

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

  useEffect(() => {
    if (presentation?.slides?.[currentSlideIndex]) {
      wordsRef.current = presentation.slides[currentSlideIndex].narration.split(/\s+/);
    }
  }, [currentSlideIndex, presentation]);

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
    
    setElapsedTime(elapsed);
    onTimeUpdate?.(elapsed);

    let totalDuration = 0;
    for (let i = 0; i <= currentSlideIndex; i++) {
      totalDuration += presentation.slides[i].duration;
    }

    const currentSlide = presentation.slides[currentSlideIndex];
    const slideElapsed = elapsed - (totalDuration - currentSlide.duration);
    const wordsPerSecond = wordsRef.current.length / currentSlide.duration;

    if (now - lastWordUpdateRef.current >= WORD_UPDATE_INTERVAL) {
      const wordIndex = Math.floor(slideElapsed * wordsPerSecond);
      if (wordIndex !== currentWordIndex && wordIndex >= 0 && wordIndex < wordsRef.current.length) {
        setCurrentWordIndex(wordIndex);
        setHighlightedText(wordsRef.current.slice(0, wordIndex).join(' '));
      }
      lastWordUpdateRef.current = now;
    }

    const progress = Math.min((slideElapsed / currentSlide.duration) * 100, 100);
    setSlideProgress(progress);

    if (!isPaused) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
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

  const renderSlideContent = (content: string) => {
    const sections = content.split('\n\n').map(section => {
      if (section.startsWith('# ')) {
        return { type: 'title', content: section.slice(2) };
      } else if (section.startsWith('## ')) {
        return { type: 'subtitle', content: section.slice(3) };
      } else if (section.startsWith('- ')) {
        return { type: 'list', content: section.split('\n').map(item => item.slice(2)) };
      } else if (section.startsWith('1. ')) {
        return { type: 'ordered-list', content: section.split('\n').map(item => item.slice(3)) };
      } else if (section.includes('|')) {
        const rows = section.split('\n');
        return { type: 'table', content: rows.map(row => row.split('|').filter(cell => cell.trim())) };
      } else {
        return { type: 'paragraph', content: section };
      }
    });

    return sections.map((section, index) => {
      switch (section.type) {
        case 'title':
          return (
            <motion.h1
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold text-primary-800 mb-6"
            >
              {section.content}
            </motion.h1>
          );
        case 'subtitle':
          return (
            <motion.h2
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-semibold text-primary-700 mb-4 flex items-center gap-2"
            >
              <Lightbulb className="w-6 h-6" />
              {section.content}
            </motion.h2>
          );
        case 'list':
          return (
            <motion.ul
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 mb-6"
            >
              {section.content.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-3 bg-white/50 p-3 rounded-lg shadow-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5" />
                  <span className="text-lg text-neutral-800">{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          );
        case 'ordered-list':
          return (
            <motion.ol
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 mb-6"
            >
              {section.content.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-3 bg-white/50 p-3 rounded-lg shadow-sm"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                    {i + 1}
                  </div>
                  <span className="text-lg text-neutral-800">{item}</span>
                </motion.li>
              ))}
            </motion.ol>
          );
        case 'table':
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="overflow-x-auto mb-6"
            >
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr>
                    {section.content[0].map((header: string, i: number) => (
                      <th key={i} className="p-3 text-left bg-primary-50 text-primary-700 border-b-2 border-primary-100">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.content.slice(1).map((row: string[], i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-primary-50/30'}>
                      {row.map((cell: string, j: number) => (
                        <td key={j} className="p-3 border-t border-primary-100/30">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          );
        default:
          return (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg leading-relaxed mb-4 text-neutral-800"
            >
              {section.content}
            </motion.p>
          );
      }
    });
  };

  if (!presentation?.slides?.length) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg">
        <p className="text-xl text-gray-600">No slides available</p>
      </div>
    );
  }

  const currentSlide = presentation.slides[currentSlideIndex];
  const totalDuration = presentation.slides.reduce((sum, slide) => sum + slide.duration, 0);
  const progressPercentage = (elapsedTime / totalDuration) * 100;

  return (
    <div 
      ref={containerRef}
      className="bg-gradient-to-br from-primary-50 via-primary-100/30 to-primary-200/30 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 8rem)' }}
    >
      {/* Main Content */}
      <div className="flex-grow relative overflow-hidden">
        {/* Navigation Arrows */}
        <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
          <motion.button
            onClick={() => onSlideChange?.(currentSlideIndex - 1)}
            disabled={currentSlideIndex === 0}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-4 rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-all ${
              currentSlideIndex === 0 ? 'opacity-0' : 'opacity-100 hover:bg-white'
            }`}
          >
            <ChevronLeft className="w-6 h-6 text-primary-600" />
          </motion.button>
          <motion.button
            onClick={() => onSlideChange?.(currentSlideIndex + 1)}
            disabled={currentSlideIndex === presentation.slides.length - 1}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-4 rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-all ${
              currentSlideIndex === presentation.slides.length - 1 ? 'opacity-0' : 'opacity-100 hover:bg-white'
            }`}
          >
            <ChevronRight className="w-6 h-6 text-primary-600" />
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
            className="w-full h-full p-8 flex flex-col items-center justify-center"
          >
            <div className="max-w-5xl w-full mx-auto">
              <motion.div
                className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-white/20"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {renderSlideContent(currentSlide.content)}
              </motion.div>

              {/* Visual Aid */}
              {currentSlide.visualAid && (
                <motion.div
                  className="mt-8 w-full max-w-4xl mx-auto"
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
      <div className="bg-primary-900/95 backdrop-blur-sm border-t border-primary-800/20 p-4 text-white">
        {/* Progress Bars */}
        <div className="space-y-3 mb-4">
          {/* Overall Timeline */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>Total Progress</span>
              </div>
              <span>{formatTime(elapsedTime)} / {formatTime(totalDuration)}</span>
            </div>
            <div 
              ref={timelineRef}
              className="h-2 bg-primary-700/30 rounded-full overflow-hidden cursor-pointer relative group"
              onClick={handleTimelineClick}
            >
              <motion.div
                className="absolute inset-0 h-full bg-primary-400 rounded-full"
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.1 }}
              />
              <div className="absolute inset-0 bg-primary-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Current Slide Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <SkipForward className="w-4 h-4 mr-2" />
                <span>Current Slide</span>
              </div>
              <span>{currentSlideIndex + 1} of {presentation.slides.length}</span>
            </div>
            <div className="h-1 bg-primary-700/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-400 rounded-full"
                animate={{ width: `${slideProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={onPlayPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-lg shadow-lg transition-all ${
                isPaused 
                  ? 'bg-primary-400 hover:bg-primary-500' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isPaused ? (
                <Play className="w-5 h-5" />
              ) : (
                <Pause className="w-5 h-5" />
              )}
            </motion.button>

            <motion.button
              onClick={() => {}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg ${
                isSpeakingEnabled 
                  ? 'bg-primary-400/30 text-primary-200' 
                  : 'bg-primary-800/30 text-primary-400'
              } hover:bg-primary-700/30 transition-colors`}
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
              className="p-2 rounded-lg bg-primary-800/30 text-primary-400 hover:bg-primary-700/30 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </motion.button>

            {/* Slide Navigation */}
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={() => onSlideChange?.(currentSlideIndex - 1)}
                disabled={currentSlideIndex === 0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-primary-800/30 text-primary-400 hover:bg-primary-700/30 transition-colors disabled:opacity-50"
              >
                <SkipBack className="w-5 h-5" />
              </motion.button>
              <motion.button
                onClick={() => onSlideChange?.(currentSlideIndex + 1)}
                disabled={currentSlideIndex === presentation.slides.length - 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-primary-800/30 text-primary-400 hover:bg-primary-700/30 transition-colors disabled:opacity-50"
              >
                <SkipForward className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;