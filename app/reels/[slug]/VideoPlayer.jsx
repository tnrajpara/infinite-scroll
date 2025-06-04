"use client";
import React, { useState, useRef, useEffect } from "react";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { SiGoogledisplayandvideo360 } from "react-icons/si";
import { PiShareFatFill } from "react-icons/pi";
import { HiVolumeUp, HiVolumeOff } from "react-icons/hi";
import { useRouter } from "next/navigation";

function VideoPlayer({ video, isActive }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false);
  const [containerWidth, setContainerWidth] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement && isActive && !videoLoaded) {
      videoElement.src = video.url;
      setVideoLoaded(true);
    }
  }, [isActive, video.url, videoLoaded]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const handleLoadedMetadata = () => {
        setDuration(videoElement.duration);
      };
      const handleTimeUpdate = () => {
        setProgress(videoElement.currentTime);
      };
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.addEventListener("timeupdate", handleTimeUpdate);
      videoElement.addEventListener("play", handlePlay);
      videoElement.addEventListener("pause", handlePause);

      if (!videoElement.paused) {
        setIsPlaying(true);
      }

      return () => {
        videoElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
        videoElement.removeEventListener("timeupdate", handleTimeUpdate);
        videoElement.removeEventListener("play", handlePlay);
        videoElement.removeEventListener("pause", handlePause);
      };
    }
  }, []);

  useEffect(() => {
    const calculateWidth = () => {
      if (window.innerWidth <= 440) {
        setContainerWidth("100%");
        return;
      }

      const height = window.innerHeight - (window.innerWidth >= 768 ? 80 : 50);
      const aspectRatio = 9 / 16;
      let width = height * aspectRatio;

      width = Math.min(width, window.innerWidth);

      setContainerWidth(`${width}px`);
    };

    calculateWidth();
    window.addEventListener("resize", calculateWidth);

    return () => {
      window.removeEventListener("resize", calculateWidth);
    };
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && isActive) {
      if (!videoLoaded) {
        videoElement.src = video.url;
        setVideoLoaded(true);
      }

      videoElement
        .play()
        .then(() => {
          setIsMuted(false);
          videoElement.muted = false;
          setIsPlaying(true);
        })
        .catch((error) => {
          console.warn("Autoplay prevented:", error);
        });
    } else if (videoElement && !isActive) {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, [isActive, video.url, videoLoaded]);

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();

        setShowPlayPauseIcon(true);
        setTimeout(() => setShowPlayPauseIcon(false), 800);
      } else {
        videoRef.current.pause();

        setShowPlayPauseIcon(true);
        setTimeout(() => setShowPlayPauseIcon(false), 800);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: video.fullUrl || window.location.href,
        });
      } catch (error) {
        console.error("Sharing err: ", error);
      }
    } else {
      navigator.clipboard
        ?.writeText(video.fullUrl || window.location.href)
        .then(() => alert("Link copied to clipboard"))
        .catch(() =>
          alert("Share link: " + (video.fullUrl || window.location.href))
        );
    }
  };

  const handleSeeFullPost = () => {
    if (video.fullUrl) {
      router.push(video.fullUrl);
    } else {
      console.warn("No fullUrl provided for this video.");
    }
  };

  return (
    <div className="flex justify-center w-full">
      <div
        ref={containerRef}
        className="h-[calc(100vh-50px)] md:h-[calc(100vh-80px)] bg-black overflow-hidden relative shadow-lg"
        style={{ width: containerWidth }}
      >
        <video
          ref={videoRef}
          autoPlay={isActive}
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          poster={video.thumbnail}
          className="w-full h-full object-cover cursor-pointer"
          onClick={togglePlayPause}
        ></video>

        {/* Play/Pause overlay */}
        {showPlayPauseIcon && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none animate-fadeIn"
            aria-hidden="true"
          >
            {isPlaying ? (
              <BsFillPauseFill className="text-white text-6xl opacity-80 animate-scaleIn" />
            ) : (
              <BsFillPlayFill className="text-white text-6xl opacity-80 animate-scaleIn" />
            )}
          </div>
        )}

        {/* Volume control button */}
        <button
          onClick={toggleMute}
          className="absolute bottom-12 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-20 transition-colors"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <HiVolumeOff size={22} /> : <HiVolumeUp size={22} />}
        </button>

        {/* Action Buttons Container - adjusted for better positioning */}
        <div className="absolute top-1/2 right-3 -translate-y-1/2 z-10 flex flex-col space-y-6">
          <div className="flex flex-col items-center">
            <button
              onClick={handleShare}
              className="text-white bg-black/40 hover:bg-black/60 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Share post"
            >
              <PiShareFatFill size={20} />
            </button>
            <span className="text-white text-xs mt-1 drop-shadow-md font-medium">
              Share
            </span>
          </div>
          {video.fullUrl && (
            <div className="flex flex-col items-center">
              <button
                onClick={handleSeeFullPost}
                className="text-white bg-black/40 hover:bg-black/60 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="See full post"
              >
                <SiGoogledisplayandvideo360 size={20} />
              </button>
              <span className="text-white text-xs mt-1 drop-shadow-md font-medium">
                Full Post
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 text-white bg-gradient-to-t from-black/80 to-transparent z-10">
          <h1 className="text-lg font-bold mb-1 drop-shadow-md">
            {video.title}
          </h1>
          <p className="text-sm mb-2 drop-shadow-md max-h-[2.7em] overflow-hidden text-ellipsis line-clamp-2">
            {video.description}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700/50 z-10">
          <div
            className="h-full bg-white/50"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
