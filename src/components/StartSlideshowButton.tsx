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
      className="fixed bottom-4 right-4 z-50"
      onClick={() => setSlideshow(true)}
    >
      Start Slideshow
    </Button>
  );
}
