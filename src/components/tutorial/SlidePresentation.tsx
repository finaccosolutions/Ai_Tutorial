import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
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
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightIntervalRef = useRef<number>();
  const currentWordIndexRef = useRef(0);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationFrameRef = useRef<number>();

  if (!presentation?.slides?.length) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-white rounded-lg shadow-lg">
        <p className="text-neutral-600">No slides available</p>
      </div>
    );
  }

  const currentSlide = presentation.slides[currentSlideIndex];

  useEffect(() => {
    setDuration(presentation.totalDuration);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [presentation]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
      }
      stopSpeaking();
    };
  }, []);

  const startPresentation = () => {
    setIsPlaying(true);
    const words = currentSlide.narration.split(' ');
    currentWordIndexRef.current = 0;

    if (highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current);
    }

    if (isSpeakingEnabled) {
      if (speechUtteranceRef.current) {
        stopSpeaking();
      }
      
      speechUtteranceRef.current = speak(currentSlide.narration, () => {
        if (currentSlideIndex < presentation.slides.length - 1) {
          setTimeout(() => {
            setCurrentSlideIndex(prev => prev + 1);
            currentWordIndexRef.current = 0;
            setHighlightedText('');
            startPresentation();
          }, 1000); // Add delay between slides
        } else {
          setIsPlaying(false);
          setCurrentTime(duration);
        }
      }, 0.9); // Slightly slower speech rate for better clarity
    }

    // Calculate timing based on slide duration
    const totalDuration = currentSlide.duration * 1000; // Convert to milliseconds
    const wordsPerSecond = words.length / (totalDuration / 1000);
    const highlightInterval = 1000 / wordsPerSecond;

    const highlightWords = () => {
      if (currentWordIndexRef.current < words.length) {
        setHighlightedText(words.slice(0, currentWordIndexRef.current + 1).join(' '));
        currentWordIndexRef.current++;
        const progress = (currentWordIndexRef.current / words.length) * currentSlide.duration;
        setCurrentTime(prev => prev + progress);
        onTimeUpdate?.(currentTime + progress);
      } else {
        clearInterval(highlightIntervalRef.current);
        
        if (currentSlideIndex < presentation.slides.length - 1) {
          setTimeout(() => {
            setCurrentSlideIndex(prev => prev + 1);
            currentWordIndexRef.current = 0;
            setHighlightedText('');
            startPresentation();
          }, 500);
        } else {
          setIsPlaying(false);
          setCurrentTime(duration);

    let lastTimestamp = performance.now();
    const animate = (timestamp: number) => {
      if (!isPlaying) return;

      const delta = timestamp - lastTimestamp;
      if (delta >= highlightInterval) {
        if (currentWordIndexRef.current < words.length) {
          setHighlightedText(words.slice(0, currentWordIndexRef.current + 1).join(' '));
          currentWordIndexRef.current++;
          const progress = (currentWordIndexRef.current / words.length) * currentSlide.duration;
          setCurrentTime(prev => prev + progress);
          onTimeUpdate?.(currentTime + progress);
          lastTimestamp = timestamp;
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopSpeaking();
    } else {
      if (currentSlideIndex === presentation.slides.length - 1 && 
          currentWordIndexRef.current === currentSlide.narration.split(' ').length) {
        setCurrentSlideIndex(0);
        setCurrentTime(0);
        currentWordIndexRef.current = 0;
        setHighlightedText('');
      }
      startPresentation();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div 
      ref={containerRef} 
      className="bg-white rounded-lg shadow-lg overflow-hidden"
      style={{
        height: isFullscreen ? '100vh' : 'calc(100vh - 12rem)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="relative bg-gradient-to-br from-primary-50 to-primary-100 flex-grow overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full p-16 flex flex-col items-center justify-center"
          >
            <div className="prose prose-xl max-w-6xl w-full mx-auto">
              <motion.div
                className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-primary-100"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-5xl font-bold text-primary-800 mb-10 leading-tight">
                  {currentSlide.content.split('\n')[0]}
                </h2>
                <div className="space-y-8 text-2xl leading-relaxed">
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

            {currentSlide.visualAid && !imageError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-12 w-full max-w-5xl mx-auto"
              >
                <img
                  src={`https://source.unsplash.com/1600x900/?${encodeURIComponent(currentSlide.visualAid)}`}
                  alt={currentSlide.visualAid}
                  className="rounded-xl w-full h-auto object-cover shadow-xl"
                  onError={handleImageError}
                  loading="eager"
                />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 bg-white border-t border-neutral-200">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-medium text-neutral-600">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
          </span>
          <div className="flex-grow h-2 bg-neutral-200 rounded-full">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-neutral-600">
            {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-neutral-600">
            Slide {currentSlideIndex + 1} of {presentation.slides.length}
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={togglePlay}
              className="p-6 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors transform hover:scale-105 shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10" />
              ) : (
                <Play className="w-10 h-10" />
              )}
            </button>

            <button
              onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
              className="p-4 text-neutral-600 hover:text-primary-600 transition-colors"
            >
              {isSpeakingEnabled ? (
                <Volume2 className="w-8 h-8" />
              ) : (
                <VolumeX className="w-8 h-8" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-4 text-neutral-600 hover:text-primary-600 transition-colors"
            >
              <Maximize2 className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;