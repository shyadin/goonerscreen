"use client";

import { FileMeta } from "~/types";
import Image from "next/image";
import { cn, randomDuration, randomPick } from "~/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function SetShow({ files }: { files: FileMeta[] }) {
  const pickableFiles = useMemo(() => {
    const baseFiles = files.filter(
      (f) => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/")
    );

    console.log(baseFiles);

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

    console.log(reducedFiles);

    return reducedFiles;
  }, [files]);
  const [file, setFile] = useState<FileMeta>(randomPick(pickableFiles));
  const duration = useMemo<number>(() => randomDuration(10, 15), []);

  const pickRandomFile = useCallback(() => {
    const randomFile = randomPick(pickableFiles);
    setFile(randomFile);
  }, [pickableFiles]);

  useEffect(() => {
    const intervalDuration = duration * 1000;

    const interval = setInterval(() => {
      pickRandomFile();
    }, intervalDuration);

    if (file.mimeType.startsWith("video/")) {
      const video = document.getElementById(`video-${file.relativePath}`);
      if (video) {
        video.addEventListener("ended", () => {
          pickRandomFile();
        });
        clearInterval(interval);
      }
    }

    if (file.mimeType.startsWith("image/")) {
      const image = document.getElementById(`image-${file.relativePath}`);
      if (image) {
        image.addEventListener("error", () => {
          pickRandomFile();
        });
      }
    }

    return () => clearInterval(interval);
  }, [file, duration, pickRandomFile]);

  if (file.mimeType.startsWith("video/")) {
    return (
      <div className={cn("w-full relative h-full overflow-hidden")}>
        <Image
          src={`/asset/${encodeURIComponent(
            file.relativePath.replace(".webm", ".webp")
          )}`}
          alt={file.name}
          className="object-cover blur-xl -z-10"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <video
          src={`/asset/${encodeURIComponent(file.relativePath)}`}
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
    <div className={cn("w-full relative h-full overflow-hidden")}>
      <Image
        src={`/asset/${encodeURIComponent(file.relativePath)}`}
        alt={file.name}
        className="object-cover blur-xl"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <Image
        src={`/asset/${encodeURIComponent(file.relativePath)}`}
        alt={file.name}
        className="object-contain"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
