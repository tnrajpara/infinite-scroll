"use server";

import { COLLECTION, DATABASE } from "../lib/constant";
import client from "../mongodb";
import { unstable_cache } from "next/cache";

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const getAllVideosCached = unstable_cache(
  async () => {
    console.log("Fetching ALL videos from database...");
    try {
      await client.connect();
      const collection = client.db(DATABASE).collection(COLLECTION);
      const reels = await collection.find({}).toArray();
      return reels.map((reel) => ({
        ...reel,
        _id: reel._id.toString(),
      }));
    } catch (err) {
      console.error("Error fetching videos from database:", err);
      throw err;
    } finally {
      if (process.env.NODE_ENV !== "development") {
        await client.close();
      }
    }
  },
  ["all-videos"],
  {
    tags: ["reels"],
    revalidate: 300000,
  }
);

export async function getInitialReelsAction(limit = 5, prioritySlug = null) {
  try {
    const allVideos = await getAllVideosCached();

    if (!allVideos || allVideos.length === 0) {
      return {
        success: false,
        reels: [],
        message: "No videos available",
        count: 0,
      };
    }

    let selectedVideos = [];

    if (prioritySlug) {
      const priorityVideo = allVideos.find(
        (video) => video.slug === prioritySlug
      );

      if (!priorityVideo) {
        console.error(`Priority video not found for slug: ${prioritySlug}`);
        return {
          success: false,
          reels: [],
          message: `Video with slug "${prioritySlug}" not found`,
          count: 0,
          notFound: true,
        };
      }

      selectedVideos.push(priorityVideo);
    }
    const remainingSlots = limit - 1;
    if (remainingSlots > 0) {
      const excludeIds = selectedVideos.map((v) => v._id);
      const availableVideos = allVideos.filter(
        (v) => !excludeIds.includes(v._id)
      );

      if (availableVideos.length > 0) {
        const shuffled = shuffleArray(availableVideos);
        const additionalVideos = shuffled.slice(
          0,
          Math.min(remainingSlots, shuffled.length)
        );
        selectedVideos.push(...additionalVideos);
      }
    }
    return {
      success: true,
      reels: selectedVideos,
      count: selectedVideos.length,
      total: allVideos.length,
      prioritySlug: prioritySlug,
      foundPriority: prioritySlug
        ? selectedVideos[0]?.slug === prioritySlug
        : false,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in getInitialReelsAction:", error);
    return {
      success: false,
      reels: [],
      message: error.message,
      error: true,
      count: 0,
    };
  }
}

export async function loadMoreReelsAction(excludeIds = [], limit = 5) {
  try {
    console.log("excludeIds array", excludeIds);

    const allVideos = await getAllVideosCached();

    if (!allVideos || allVideos.length === 0) {
      return {
        success: false,
        reels: [],
        message: "No videos available",
        count: 0,
      };
    }

    let availableVideos = allVideos.filter(
      (video) => !excludeIds.includes(video._id)
    );

    if (availableVideos.length === 0) {
      console.log("All videos exhausted, allowing repetition");
      availableVideos = allVideos;
    }

    const shuffled = shuffleArray(availableVideos);
    const selectedVideos = shuffled.slice(0, Math.min(limit, shuffled.length));

    console.log(
      `Selected ${selectedVideos.length} more videos from ${availableVideos.length} available`
    );

    return {
      success: true,
      reels: selectedVideos,
      count: selectedVideos.length,
      total: allVideos.length,
      available: availableVideos.length,
      excluded: excludeIds.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in loadMoreReelsAction:", error);
    return {
      success: false,
      reels: [],
      message: error.message,
      error: true,
      count: 0,
    };
  }
}

export const fetchRandomReels = getAllVideosCached;
