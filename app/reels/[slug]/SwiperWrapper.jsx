"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Virtual } from "swiper/modules";
import "swiper/css";
import "swiper/css/mousewheel";
import VideoPlayer from "./VideoPlayer";
import { loadMoreReelsAction } from "../../actions/fetchReels";

const VIDEO_RENDER_RADIUS = 1;
const FETCH_THRESHOLD = 1;

const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
      <div className="text-white text-lg">{message}</div>
    </div>
  </div>
);

const SwiperWrapper = ({ videos: initialVideos = [] }) => {
  const [videos, setVideos] = useState(initialVideos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isInitialLoading, setIsInitialLoading] = useState(
    !initialVideos.length
  );
  const [videoLoadingStates, setVideoLoadingStates] = useState({});

  const swiperRef = useRef(null);
  const currentIndexRef = useRef(0);
  const lastSlideTime = useRef(0);
  const isWheelScrolling = useRef(false);

  useEffect(() => {
    if (initialVideos.length > 0) {
      setIsInitialLoading(false);
    }
  }, [initialVideos.length]);

  const handleVideoLoadStart = useCallback((videoId) => {
    setVideoLoadingStates((prev) => ({
      ...prev,
      [videoId]: { loading: true, error: false },
    }));
  }, []);

  const handleVideoLoadEnd = useCallback((videoId) => {
    setVideoLoadingStates((prev) => ({
      ...prev,
      [videoId]: { loading: false, error: false },
    }));
  }, []);

  const handleVideoError = useCallback((videoId) => {
    setVideoLoadingStates((prev) => ({
      ...prev,
      [videoId]: { loading: false, error: true },
    }));
  }, []);

  const fetchMoreVideos = useCallback(async () => {
    if (isPending) return;

    setHasError(false);
    setErrorMessage("");

    startTransition(async () => {
      try {
        const excludeIds = videos.map((video) => video._id);
        const result = await loadMoreReelsAction(excludeIds, 5);

        if (result.success && result.reels && result.reels.length > 0) {
          const currentIndex = currentIndexRef.current;

          setVideos((prevVideos) => {
            const newVideos = [...prevVideos, ...result.reels];
            return newVideos;
          });

          setTimeout(() => {
            if (
              swiperRef.current &&
              swiperRef.current.activeIndex !== currentIndex
            ) {
              swiperRef.current.slideTo(currentIndex, 0);
            }
          }, 0);
        } else {
          console.warn("No more videos available:", result.message);
          setErrorMessage(result.message || "No more videos available");
        }
      } catch (error) {
        console.error("Error fetching more videos:", error);
        setHasError(true);
        setErrorMessage("Failed to load more videos");
      } finally {
        setErrorMessage("");
      }
    });
  }, [videos, isPending]);

  const checkAndLoadMore = useCallback(
    (currentIndex) => {
      const remainingVideos = videos.length - currentIndex - 1;

      if (remainingVideos <= FETCH_THRESHOLD && !isPending) {
        console.log(`${remainingVideos} videos remaining, fetching more...`);
        fetchMoreVideos();
      }
    },
    [videos.length, isPending, fetchMoreVideos]
  );

  const handleSlideChange = useCallback(
    (swiper) => {
      if (isWheelScrolling.current) {
        const now = Date.now();
        if (now - lastSlideTime.current < 200) {
          return;
        }
        lastSlideTime.current = now;
      }

      const newIndex = swiper.activeIndex;
      setActiveIndex(newIndex);
      currentIndexRef.current = newIndex;

      const currentVideo = videos[newIndex];
      if (currentVideo?.slug) {
        window.history.pushState(null, "", `/reels/${currentVideo.slug}`);
      }

      document.title = currentVideo?.title || "Reels";

      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription && currentVideo?.description) {
        metaDescription.setAttribute("content", currentVideo.description);
      }

      checkAndLoadMore(newIndex);
    },
    [activeIndex, videos, checkAndLoadMore]
  );

  const shouldRenderVideo = (index) => {
    return Math.abs(index - activeIndex) <= VIDEO_RENDER_RADIUS;
  };

  const handleRetry = () => {
    setHasError(false);
    setErrorMessage("");
    setIsInitialLoading(true);
    fetchMoreVideos().finally(() => setIsInitialLoading(false));
  };

  if (isInitialLoading) {
    return <LoadingSpinner message="Loading videos..." />;
  }

  if (!videos.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">No videos available</div>
          {hasError && (
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? "Loading..." : "Retry"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentVideo = videos[activeIndex];
  const isCurrentVideoLoading =
    currentVideo && videoLoadingStates[currentVideo._id]?.loading;

  return (
    <div className="relative">
      {(isPending || isCurrentVideoLoading) && <LoadingSpinner message="" />}

      <Swiper
        modules={[Mousewheel, Virtual]}
        spaceBetween={2}
        slidesPerView={1}
        direction="vertical"
        mousewheel={{
          enabled: true,
          sensitivity: 1,
          thresholdDelta: 10,
          thresholdTime: 40,
          releaseOnEdges: false,
          forceToAxis: true,
          invert: false,
        }}
        virtual={{
          enabled: true,
          addSlidesAfter: VIDEO_RENDER_RADIUS,
          addSlidesBefore: VIDEO_RENDER_RADIUS,
        }}
        className="h-screen py-2"
        onSlideChange={handleSlideChange}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          setActiveIndex(swiper.activeIndex);
          currentIndexRef.current = swiper.activeIndex;
          checkAndLoadMore(swiper.activeIndex);

          const swiperEl = swiper.el;
          swiperEl.addEventListener(
            "wheel",
            (e) => {
              isWheelScrolling.current = true;
              if (Math.abs(e.deltaY) < 50 && e.deltaMode === 0) {
                if (Date.now() - lastSlideTime.current < 400) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              }
              setTimeout(() => {
                isWheelScrolling.current = false;
              }, 100);
            },
            { passive: false }
          );
        }}
        initialSlide={0}
        watchSlidesProgress={true}
        preventInteractionOnTransition={false}
        resistance={true}
        resistanceRatio={0.85}
        speed={300}
        longSwipesRatio={0.25}
        shortSwipes={true}
        threshold={5}
        touchRatio={1}
        followFinger={true}
        grabCursor={true}
        autoplay={true}
      >
        {videos.map((video, index) => (
          <SwiperSlide
            key={`${video._id}-${index}`}
            virtualIndex={index}
            className="h-[90vh] flex items-center justify-center"
            role="group"
            aria-label={`Video ${index + 1} of ${videos.length}${
              isPending ? "+" : ""
            }`}
          >
            {shouldRenderVideo(index) && (
              <VideoPlayer
                video={video}
                isActive={index === activeIndex}
                onLoadStart={() => handleVideoLoadStart(video._id)}
                onLoadEnd={() => handleVideoLoadEnd(video._id)}
                onError={() => handleVideoError(video._id)}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>

      {(hasError || errorMessage) && !isPending && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-red-500 bg-opacity-90 text-white px-4 py-2 rounded-full flex items-center space-x-2">
            <span>{errorMessage || "Failed to load videos"}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwiperWrapper;
