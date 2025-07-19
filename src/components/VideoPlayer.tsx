import "video.js/dist/video-js.css";

import * as React from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";

import { cn } from "~/lib/utils";

export const VideoPlayer = ({
  options,
  onReady,
  className,
}: {
  options: Parameters<typeof videojs>[1];
  onReady?: (player: Player) => void;
  className?: string;
}) => {
  const videoRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<Player | null>(null);

  React.useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current || !videoRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode.
      const videoElement = document.createElement("video-js");

      videoElement.classList.add("vjs-big-play-centered");
      videoRef.current?.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, options, () => {
        videojs.log("player is ready");
        onReady?.(player);
      }));

      // You could update an existing player in the `else` block here
      // on prop change, for example:
    } else {
      const player = playerRef.current;

      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options, videoRef, onReady]);

  // Dispose the Video.js player when the functional component unmounts
  React.useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div
      ref={videoRef}
      data-vjs-player
      className={cn("relative h-full w-full", className)}
    ></div>
  );
};
