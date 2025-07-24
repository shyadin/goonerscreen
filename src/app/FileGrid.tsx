"use client";

import SetCard from "~/components/SetCard";
import { useSetStore } from "~/components/SetStore";
import { FileMeta } from "~/types";
import Slideshow from "./Slideshow";

export default function FileGrid({ files }: { files: FileMeta[] }) {
  const isSlideshowActive = useSetStore((state) => state.isSlideshowActive);
  const sets = files.reduce(
    (acc: Record<string, FileMeta[]>, item: FileMeta) => {
      const set = item.set;
      acc[set] = acc[set] || [];
      acc[set].push(item);
      acc[set].sort((a, b) => a.name.localeCompare(b.name));
      return acc;
    },
    {}
  );

  if (isSlideshowActive) {
    return <Slideshow data={sets} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 p-8">
      {Object.entries(sets).map(([set, files]) => (
        <SetCard key={set} set={set} files={files} />
      ))}
    </div>
  );
}
