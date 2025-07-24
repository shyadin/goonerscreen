"use client";

import { Grid2x2Icon, PlayIcon } from "lucide-react";
import {
  GridLayout,
  SlideshowSpeed,
  SlideshowSpeeds,
  useSetStore,
} from "./SetStore";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "~/lib/utils";

export default function StartSlideshowButton() {
  const isSlideshowActive = useSetStore((state) => state.isSlideshowActive);
  const setSlideshowActive = useSetStore((state) => state.setSlideshowActive);
  const hasSelectedSets = useSetStore((state) =>
    state.selectedSetsGrid.flat().some((set) => set !== "")
  );

  if (isSlideshowActive) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-[50%] -translate-x-[50%] z-50 bg-zinc-500/40 backdrop-blur-sm p-2 rounded-full flex items-center gap-2 border-2 border-black shadow-lg">
      <SetGrid />
      <SpeedSelector />
      <Button
        className="cursor-pointer rounded-full border-0 shadow-lg size-12 bg-zinc-900/40 hover:bg-white/40 text-white"
        onClick={() => setSlideshowActive(true)}
        disabled={!hasSelectedSets}
      >
        <PlayIcon className="size-4" />
        <span className="text-xs text-white sr-only">Start Slideshow</span>
      </Button>
    </div>
  );
}

function getGridLayoutText(layout: GridLayout) {
  return `${layout.rows}x${layout.columns}`;
}

function getGridLayoutId(layout: GridLayout) {
  return `${layout.rows}-${layout.columns}`;
}

function getGridLayouts() {
  const gridLayouts: { layout: GridLayout; text: string; id: string }[] = [];
  for (let rows = 1; rows <= 3; rows++) {
    for (let columns = 1; columns <= 10; columns++) {
      gridLayouts.push({
        layout: { rows, columns },
        text: getGridLayoutText({ rows, columns }),
        id: getGridLayoutId({ rows, columns }),
      });
    }
  }
  return gridLayouts;
}

function SetGrid() {
  const selectedLayout = useSetStore((state) => state.layout);
  const gridLayouts = getGridLayouts();
  const setLayout = useSetStore((state) => state.setLayout);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="cursor-pointer rounded-full border-0 shadow-lg h-12 w-fit outline-0 bg-zinc-900/40 hover:bg-white/40 text-white">
          <GridLayoutPreview />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="grid grid-cols-5 gap-2 bg-zinc-500/40 backdrop-blur-sm border-2 border-black">
        {gridLayouts.map(({ layout, text, id }) => (
          <DropdownMenuItem
            key={id}
            className={cn(
              "flex flex-col gap-1 cursor-pointer hover:bg-white/30 transition-all duration-300",
              getGridLayoutId(selectedLayout) === id && "bg-white/40"
            )}
            onClick={() => setLayout(layout)}
          >
            <GridLayoutSelector layout={layout} />
            <span className="text-xs text-white">{text}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GridLayoutPreview() {
  const selectedSetsGrid = useSetStore((state) => state.selectedSetsGrid);

  return (
    <div className="flex flex-col gap-1">
      {selectedSetsGrid.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((col, colIndex) => (
            <div
              key={colIndex}
              className={cn(
                "size-2 rounded-md",
                col === "" ? "bg-gray-200" : "bg-red-500"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function GridLayoutSelector({ layout }: { layout: GridLayout }) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: layout.rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {Array.from({ length: layout.columns }).map((_, colIndex) => (
            <div key={colIndex} className="size-2 bg-gray-200 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SpeedSelector() {
  const selectedSeed = useSetStore((state) => state.speed);
  const setSpeed = useSetStore((state) => state.setSpeed);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="cursor-pointer rounded-full border-0 shadow-lg h-12 w-fit outline-0 bg-zinc-900/40 hover:bg-white/40 text-white">
          <span className="text-xs text-white capitalize">{selectedSeed}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="grid grid-cols-5 gap-2 bg-zinc-500/40 backdrop-blur-sm border-2 border-black">
        {Object.entries(SlideshowSpeeds).map(([speed, value]) => (
          <DropdownMenuItem
            key={speed}
            className={cn(
              "flex flex-col gap-1 cursor-pointer hover:bg-white/30 transition-all duration-300 text-white capitalize",
              selectedSeed === speed && "bg-white/40"
            )}
            onClick={() => setSpeed(speed as SlideshowSpeed)}
          >
            <span>{speed}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
