"use client";

import { FileMeta } from "~/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Image from "next/image";
import { cn, randomDuration, randomPick } from "~/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSetStore } from "./SetStore";

export default function SetCard({
  set,
  files,
}: {
  set: string;
  files: FileMeta[];
}) {
  const { sets, setSets } = useSetStore();
  const webpFiles = files.filter((f) => f.relativePath.endsWith(".webp"));
  const [file, setFile] = useState<FileMeta | undefined>(webpFiles[0]);
  const duration = useMemo<number>(() => randomDuration(120, 130), []);

  const pickRandomFile = useCallback(() => {
    const randomFile = randomPick(webpFiles);
    setFile(randomFile);
  }, [webpFiles]);

  useEffect(() => {
    const intervalDuration = duration * 1000;

    const interval = setInterval(() => {
      pickRandomFile();
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [duration, pickRandomFile]);

  if (!file) {
    return null;
  }

  return (
    <Card
      className={cn(
        "w-full relative h-96 overflow-hidden p-0 cursor-pointer transition-all duration-300 hover:scale-102",
        sets[set] && "border-4 border-red-500 scale-105"
      )}
      onClick={() => {
        setSets({ ...sets, [set]: sets[set] ? undefined : files });
      }}
    >
      <Image
        src={`/asset/${encodeURIComponent(file.relativePath)}`}
        alt={set}
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <CardHeader className="z-10 text-shadow-2xs top-0 left-0 w-full h-full flex flex-col justify-end items-start">
        <CardTitle className="text-white text-2xl font-bold">{set}</CardTitle>
      </CardHeader>
      <CardContent className="z-10 h-min text-white bg-black/50 bottom-0 left-0 w-full flex flex-col justify-end items-start">
        <p>{file.name}</p>
        <p>{files.length} files</p>
      </CardContent>
    </Card>
  );
}
