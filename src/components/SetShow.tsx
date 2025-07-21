"use client";

import { FileMeta } from "~/types";
import Image from "next/image";
import { cn, randomDuration, randomPick, shuffle } from "~/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function SetShow({
  files,
  isSingle,
}: {
  files: FileMeta[];
  isSingle?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const pickableFiles = useMemo(() => {
    const baseFiles = shuffle(files).filter(
      (f) => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/")
    );

    const reducedFiles = baseFiles.reduce((acc, file) => {
      if (file.mimeType.startsWith("image/")) {
        const possibleVideoName = file.relativePath.replace(".webp", ".webm");
        if (baseFiles.some((f) => f.relativePath === possibleVideoName)) {
          return acc;
        }
      }
      acc.push(file);
      return acc;
    }, [] as FileMeta[]);

    return reducedFiles;
  }, [files]);
  const file = useMemo(() => {
    return pickableFiles[currentIndex];
  }, [currentIndex, pickableFiles]);
  const duration = useMemo<number>(() => randomDuration(10, 15), []);

  const pickNextFile = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev === pickableFiles.length - 1) {
        return 0;
      }
      return prev + 1;
    });
  }, [pickableFiles.length]);

  useEffect(() => {
    if (!file) {
      pickNextFile();
      return;
    }

    if (file.mimeType.startsWith("image/")) {
      const intervalDuration = duration * 1000;

      const interval = setInterval(() => {
        pickNextFile();
      }, intervalDuration);

      if (file.mimeType.startsWith("image/")) {
        const image = document.getElementById(`image-${file.relativePath}`);
        if (image) {
          image.addEventListener("error", () => {
            pickNextFile();
          });
        }
      }

      return () => clearInterval(interval);
    }
  }, [file, duration, pickNextFile]);

  useEffect(() => {
    if (!file || !file.mimeType.startsWith("video/")) {
      return;
    }

    const interval = setInterval(() => {
      const video = document.getElementById(`video-${file.relativePath}`);
      if (video) {
        const videoElement = video as HTMLVideoElement;
        videoElement.addEventListener("ended", () => {
          pickNextFile();
        });
        videoElement.addEventListener("error", () => {
          pickNextFile();
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [file, pickNextFile]);

  if (!file) {
    return null;
  }

  if (file.mimeType.startsWith("video/")) {
    return (
      <div
        className={cn(
          "w-full relative h-full overflow-hidden",
          isSingle && "col-span-2"
        )}
      >
        <img
          src={`/asset/${encodeURIComponent(
            file.relativePath.replace(".webm", ".webp")
          )}`}
          alt={file.name}
          className="absolute top-0 left-0 object-cover w-full h-full object-center -z-10 blur-xl"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <video
          src={`/asset/${encodeURIComponent(file.relativePath)}`}
          loop={files.length === 1}
          poster={`/asset/${encodeURIComponent(
            file.relativePath.replace(".webm", ".webp")
          )}`}
          autoPlay
          playsInline
          controls
          controlsList="nodownload"
          id={`video-${file.relativePath}`}
          className="h-full w-full overflow-hidden z-20"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full relative h-full overflow-hidden",
        isSingle && "col-span-2"
      )}
    >
      <img
        src={`/asset/${encodeURIComponent(file.relativePath)}`}
        alt={file.name}
        className="absolute top-0 left-0 object-cover w-full h-full object-center z-0 blur-xl"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <img
        src={`/asset/${encodeURIComponent(file.relativePath)}`}
        alt={file.name}
        className="absolute top-0 left-0 object-contain w-full h-full object-center z-0"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
