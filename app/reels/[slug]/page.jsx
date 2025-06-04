import React from "react";
import { notFound } from "next/navigation";
import SwiperWrapper from "./SwiperWrapper";
import { getInitialReelsAction } from "../../actions/fetchReels";

async function Page(props) {
  const params = await props.params;
  const slug = params.slug;

  if (!slug) {
    return notFound();
  }

  try {
    console.log(`Loading page for slug: ${slug}`);

    const result = await getInitialReelsAction(5, slug);

    if (result.notFound) {
      console.error(`Video not found for slug: ${slug}`);
      return notFound();
    }

    if (!result.success) {
      console.error("Failed to fetch initial reels:", result.message);
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-600">
              Error Loading Videos
            </h2>
            <p className="text-gray-600 mb-4">
              {result.message || "Failed to load initial videos"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    const videos = result.reels || [];

    if (videos.length === 0) {
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">No Videos Available</h2>
            <p className="text-gray-600 mb-4">
              No videos found in the database. Please add some videos first.
            </p>
            <div className="text-sm text-gray-500">
              Total videos in database: {result.total || 0}
            </div>
          </div>
        </div>
      );
    }

    // Verify that the first video matches the slug
    const firstVideo = videos[0];
    if (firstVideo?.slug !== slug) {
      console.error(
        `First video slug mismatch. Expected: ${slug}, Got: ${firstVideo?.slug}`
      );
      return notFound();
    }

    return (
      <div className="h-screen overflow-hidden">
        <SwiperWrapper slug={slug} videos={videos} />
      </div>
    );
  } catch (error) {
    console.error("Error loading initial videos:", error);
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-600">
            Unexpected Error
          </h2>
          <p className="text-gray-600 mb-4">
            Something went wrong while loading the page
          </p>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded "
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default Page;
