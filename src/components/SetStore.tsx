import { create } from "zustand";
import { FileMeta } from "~/types";

export const useSetStore = create<{
  sets: Record<string, FileMeta[] | undefined>;
  slideshow: boolean;
  setSets: (sets: Record<string, FileMeta[] | undefined>) => void;
  setSlideshow: (slideshow: boolean) => void;
}>((set) => ({
  sets: {},
  slideshow: false,
  setSets: (sets) => set({ sets }),
  setSlideshow: (slideshow) => set({ slideshow }),
}));
