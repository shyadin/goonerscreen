"use client";

import { FileMeta } from "~/types";
import Image from "next/image";
import { cn, randomDuration, randomPick } from "~/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VideoPlayer } from "./VideoPlayer";

export default function SetShow({ files }: { files: FileMeta[] }) {
  const [file, setFile] = useState<FileMeta>(randomPick(files));
  const duration = useMemo<number>(() => randomDuration(10, 15), []);

  const pickRandomFile = useCallback(() => {
    const randomFile = randomPick(files);
    setFile(randomFile);
  }, [files]);

  useEffect(() => {
    const intervalDuration = duration * 1000;

    const interval = setInterval(() => {
      pickRandomFile();
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [duration, pickRandomFile]);

  if (file.mimeType.startsWith("video/")) {
    return (
      <div className={cn("w-full relative h-full overflow-hidden")}>
        <VideoPlayer
          options={{
            sources: [
              {
                src: `/asset/${encodeURIComponent(file.relativePath)}`,
                type: "video/webm; codecs=av01",
              },
            ],
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("w-full relative h-full overflow-hidden")}>
      <Image
        src={`/asset/${encodeURIComponent(file.relativePath)}`}
        alt={file.name}
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
