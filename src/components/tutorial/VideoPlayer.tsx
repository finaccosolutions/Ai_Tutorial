import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, RotateCcw, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  videoUrl: string;
  captions: Caption[];
  onTimeUpdate?: (time: number) => void;
  onQuizPoint?: () => void;
}

interface Caption {
  start: number;
  end: number;
  text: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  captions,
  onTimeUpdate,
  onQuizPoint
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoUrl;
    }

    return () => {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.destroy();
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);

      // Find current caption
      const caption = captions.find(
        cap => video.currentTime >= cap.start && video.currentTime <= cap.end
      );
      setCurrentCaption(caption || null);

      // Check for quiz points (every 2 minutes)
      if (Math.floor(video.currentTime) % 120 === 0) {
        onQuizPoint?.();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [captions, onTimeUpdate, onQuizPoint]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group">
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        onClick={togglePlay}
      />

      {/* Captions */}
      <AnimatePresence>
        {currentCaption && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-0 right-0 text-center px-4"
          >
            <div className="inline-block bg-black/75 text-white px-4 py-2 rounded-lg text-lg">
              {currentCaption.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4"
          >
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white text-sm">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="flex-grow h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <span className="text-white text-sm">{formatTime(duration)}</span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="text-white hover:text-primary-400 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                  }
                }}
                className="text-white hover:text-primary-400 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-primary-400 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              <div className="flex-grow" />

              <div className="relative group">
                <button
                  className="text-white hover:text-primary-400 transition-colors flex items-center gap-1"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm">{playbackRate}x</span>
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                  <div className="bg-neutral-900 rounded-lg shadow-lg p-2">
                    {[0.5, 1, 1.5, 2].map(rate => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`block w-full px-4 py-1 text-sm text-left rounded hover:bg-neutral-800 ${
                          playbackRate === rate ? 'text-primary-400' : 'text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-primary-400 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause overlay */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              className="w-20 h-20 flex items-center justify-center rounded-full bg-primary-600 text-white"
            >
              <Play className="w-10 h-10" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoPlayer;