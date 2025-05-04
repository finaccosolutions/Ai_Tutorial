import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import type { SlidePresentation } from '../../services/slideService';
import slideService from '../../services/slideService';
import ReactMarkdown from 'react-markdown';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSlide = presentation.slides[currentSlideIndex];

  useEffect(() => {
    setDuration(presentation.totalDuration);
  }, [presentation]);

  useEffect(() => {
    slideService.setIsSpeakingEnabled(isSpeakingEnabled);
  }, [isSpeakingEnabled]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const startPresentation = () => {
    setIsPlaying(true);
    slideService.startPresentation(
      presentation,
      (index) => setCurrentSlideIndex(index),
      (time) => {
        setCurrentTime(time);
        onTimeUpdate?.(time);
      },
      isSpeakingEnabled
    );
  };

  const stopPresentation = () => {
    setIsPlaying(false);
    slideService.stopPresentation();
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPresentation();
    } else {
      if (currentTime >= duration) {
        setCurrentTime(0);
        setCurrentSlideIndex(0);
      }
      slideService.resumePresentation(
        (index) => setCurrentSlideIndex(index),
        (time) => {
          setCurrentTime(time);
          onTimeUpdate?.(time);
        }
      );
      setIsPlaying(true);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < presentation.slides.length - 1) {
      stopPresentation();
      setCurrentSlideIndex(currentSlideIndex + 1);
      const newTime = presentation.slides
        .slice(0, currentSlideIndex + 1)
        .reduce((total, slide) => total + slide.duration, 0);
      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      stopPresentation();
      setCurrentSlideIndex(currentSlideIndex - 1);
      const newTime = presentation.slides
        .slice(0, currentSlideIndex - 1)
        .reduce((total, slide) => total + slide.duration, 0);
      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value);
    setCurrentTime(time);
    const newSlideIndex = slideService.seekTo(time);
    setCurrentSlideIndex(newSlideIndex);
    onTimeUpdate?.(time);
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

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Slide Content */}
      <div className={`relative bg-neutral-900 flex items-center justify-center ${
        isFullscreen ? 'h-screen' : 'aspect-video'
      }`}>
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
              {currentSlide.visualAid && (
                <div className="mt-4 text-center">
                  <img
                    src={`https://source.unsplash.com/800x400/?${encodeURIComponent(currentSlide.visualAid)}`}
                    alt={currentSlide.visualAid}
                    className="rounded-lg mx-auto max-w-full h-auto"
                    loading="eager"
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 bg-white border-t border-neutral-200">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-neutral-600">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="flex-grow h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-600"
          />
          <span className="text-sm text-neutral-600">{formatTime(duration)}</span>
        </div>

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
              className="p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700"
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

            <button
              onClick={toggleFullscreen}
              className="p-2 text-neutral-600 hover:text-primary-600"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Duration */}
          <div className="text-sm text-neutral-600">
            {formatTime(currentSlide.duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidePresentation;