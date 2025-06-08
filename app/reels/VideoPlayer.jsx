"use client";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { SiGoogledisplayandvideo360 } from "react-icons/si";
import { PiShareFatFill } from "react-icons/pi";
import { useRouter } from "next/navigation";

const VideoPlayer = React.memo(
  ({ video, isActive = false, isVisible = false, shouldLoad = false }) => {
    const videoRef = useRef(null);
    const router = useRouter();
    const timeoutRef = useRef(null);
    const lastVideoId = useRef(null);
    const playAttempted = useRef(false);
    const hasLoadedOnce = useRef(false);

    const [isHydrated, setIsHydrated] = useState(false);

    const memoizedVideo = useMemo(() => video, [video.id]);

    const videoUrl = useMemo(() => video.url, [video.url]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const [userPaused, setUserPaused] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
      setIsHydrated(true);
    }, []);

    const resetVideoStates = useCallback(() => {
      setUserPaused(false);
      setProgress(0);
      setIsLoaded(false);
      setIsPlaying(false);
      setDuration(0);
      setHasError(false);
      setShowPlayIcon(false);
      setIsInitialLoad(true);
      playAttempted.current = false;
      hasLoadedOnce.current = false;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }, []);

    useEffect(() => {
      if (lastVideoId.current !== memoizedVideo.id) {
        lastVideoId.current = memoizedVideo.id;
        resetVideoStates();
      }
    }, [memoizedVideo.id, resetVideoStates]);

    const handleLoadedMetadata = useCallback(() => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.src === videoUrl) {
        setDuration(videoElement.duration);
        setIsLoaded(true);
        setHasError(false);
        setIsInitialLoad(false);
        hasLoadedOnce.current = true;
      }
    }, [videoUrl]);

    const handleTimeUpdate = useCallback(() => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.src === videoUrl) {
        setProgress(videoElement.currentTime);
      }
    }, [videoUrl]);

    const handlePlay = useCallback(() => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.src === videoUrl) {
        setIsPlaying(true);
      }
    }, [videoUrl]);

    const handlePause = useCallback(() => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.src === videoUrl) {
        setIsPlaying(false);
      }
    }, [videoUrl]);

    const handleEnded = useCallback(() => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.src === videoUrl) {
        setProgress(0);
        videoElement.currentTime = 0;
      }
    }, [videoUrl]);

    const handleError = useCallback(() => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.src === videoUrl) {
        setHasError(true);
        setIsLoaded(false);
        setIsInitialLoad(false);
      }
    }, [videoUrl]);

    const handleCanPlay = useCallback(() => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.src === videoUrl) {
        setIsLoaded(true);
        setHasError(false);
        setIsInitialLoad(false);
        hasLoadedOnce.current = true;
      }
    }, [videoUrl]);

    useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement || !shouldLoad || !isHydrated) return;

      const events = {
        loadedmetadata: handleLoadedMetadata,
        timeupdate: handleTimeUpdate,
        play: handlePlay,
        pause: handlePause,
        ended: handleEnded,
        error: handleError,
        canplay: handleCanPlay,
      };

      Object.entries(events).forEach(([event, handler]) => {
        videoElement.addEventListener(event, handler);
      });

      return () => {
        Object.entries(events).forEach(([event, handler]) => {
          videoElement.removeEventListener(event, handler);
        });
      };
    }, [
      shouldLoad,
      isHydrated,
      handleLoadedMetadata,
      handleTimeUpdate,
      handlePlay,
      handlePause,
      handleEnded,
      handleError,
      handleCanPlay,
    ]);

    useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement || !shouldLoad || !isHydrated) return;

      if (!isLoaded || hasError) return;

      if (isActive && isVisible && !userPaused) {
        if (videoElement.paused && !playAttempted.current) {
          playAttempted.current = true;
          const playPromise = videoElement.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {})
              .catch((error) => {
                console.error("Play failed:", error);
                playAttempted.current = false;
              });
          }
        }
      } else {
        playAttempted.current = false;
        if (!videoElement.paused) {
          videoElement.pause();
        }
        if (!isActive) {
          videoElement.currentTime = 0;
          setProgress(0);
          setUserPaused(false);
        }
      }
    }, [
      isActive,
      isVisible,
      isLoaded,
      userPaused,
      hasError,
      shouldLoad,
      isHydrated,
    ]);

    const handlePlayPause = useCallback(
      (e) => {
        e.stopPropagation();
        const videoElement = videoRef.current;

        if (!videoElement || !isLoaded || hasError || !isHydrated) return;

        if (videoElement.paused) {
          const playPromise = videoElement.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error("Play failed:", error);
            });
          }
          setUserPaused(false);
        } else {
          videoElement.pause();
          setUserPaused(true);
        }

        setShowPlayIcon(true);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setShowPlayIcon(false);
        }, 800);
      },
      [isLoaded, hasError, isHydrated]
    );

    const handleShare = useCallback(
      async (e) => {
        e.stopPropagation();

        if (!isHydrated) return;

        const shareData = {
          title: video.title,
          text: video.description,
          url: video.fullUrl || window.location.href,
        };

        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch (error) {
            if (error.name !== "AbortError") {
              console.error("Share failed:", error);
            }
          }
        } else if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(shareData.url);
            alert("Link copied to clipboard!");
          } catch (error) {
            console.error("Copy failed:", error);
          }
        }
      },
      [video.title, video.description, video.fullUrl, isHydrated]
    );

    const handleFullPost = useCallback(
      (e) => {
        e.stopPropagation();
        if (video.fullUrl && isHydrated) {
          router.push(video.fullUrl);
        }
      },
      [video.fullUrl, router, isHydrated]
    );

    const progressPercent = useMemo(() => {
      return duration > 0 ? (progress / duration) * 100 : 0;
    }, [progress, duration]);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const showSpinner = shouldLoad && !isLoaded && !hasError && isHydrated;

    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="relative w-full max-w-[420px] h-full md:rounded-xl overflow-hidden">
          {shouldLoad && isHydrated && (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={video.thumbnail}
              className="w-full h-full object-cover cursor-pointer"
              onClick={handlePlayPause}
              loop
              autoPlay
              muted
              playsInline
              preload="metadata"
            />
          )}

          {/* Loading Spinner */}
          {showSpinner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Error State */}
          {hasError && !isInitialLoad && isHydrated && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <div className="text-sm">Failed to load video</div>
              </div>
            </div>
          )}

          {/* Play/Pause Icon Animation */}
          {showPlayIcon && isLoaded && !hasError && isHydrated && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="text-white text-6xl drop-shadow-lg animate-pulse">
                {isPlaying ? <BsFillPauseFill /> : <BsFillPlayFill />}
              </div>
            </div>
          )}

          {/* Action Buttons - Only show after hydration */}
          {isHydrated && (
            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 sm:gap-6 z-10">
              <div className="flex flex-col items-center">
                <button
                  onClick={handleShare}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all duration-200 hover:scale-110"
                  aria-label="Share video"
                >
                  <PiShareFatFill size={18} className="sm:w-5 sm:h-5" />
                </button>
                <span className="text-xs text-white mt-1 sm:mt-2 font-medium drop-shadow">
                  Share
                </span>
              </div>

              {video.fullUrl && (
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleFullPost}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all duration-200 hover:scale-110"
                    aria-label="View full post"
                  >
                    <SiGoogledisplayandvideo360
                      size={18}
                      className="sm:w-5 sm:h-5"
                    />
                  </button>
                  <span className="text-xs text-white mt-1 sm:mt-2 font-medium drop-shadow">
                    Full Post
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Content Overlay - Fixed positioning and spacing */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent"></div>

            {/* Content */}
            <div className="relative p-3 sm:p-4 pb-4 sm:pb-6">
              <h2 className="text-white text-base sm:text-lg font-bold mb-1 sm:mb-2 line-clamp-2 leading-tight">
                {video.title}
              </h2>
              <p className="text-gray-200 text-xs sm:text-sm line-clamp-2 mb-2 sm:mb-3 leading-relaxed">
                {video.description}
              </p>
              {shouldLoad && isLoaded && !hasError && isHydrated && (
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
