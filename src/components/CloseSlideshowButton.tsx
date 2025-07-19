"use client";

import { useSetStore } from "./SetStore";
import { Button } from "./ui/button";

export default function StartSlideshowButton() {
  const { slideshow, setSlideshow } = useSetStore();
  if (!slideshow) {
    return null;
  }

  return (
    <Button
      variant="outline"
      className="fixed top-4 right-4 z-50 rounded-full border-2 border-black bg-white/20 backdrop-blur-sm hover:bg-white/40 text-zinc-200"
      onClick={() => setSlideshow(false)}
    >
      Close
    </Button>
  );
}
