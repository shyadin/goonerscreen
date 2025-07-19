"use client";

import { useSetStore } from "./SetStore";
import { Button } from "./ui/button";

export default function StartSlideshowButton() {
  const { sets, slideshow, setSlideshow } = useSetStore();
  if (Object.keys(sets).length === 0 || slideshow) {
    return null;
  }

  return (
    <Button
      className="fixed bottom-4 left-[50%] -translate-x-[50%] z-50 rounded-full border-2 border-black bg-white/20 backdrop-blur-sm hover:bg-white/40 text-zinc-100"
      onClick={() => setSlideshow(true)}
    >
      Start Slideshow
    </Button>
  );
}
