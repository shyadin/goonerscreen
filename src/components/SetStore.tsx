import { create } from "zustand";
import { FileMeta } from "~/types";

export const SlideshowSpeeds = {
  slowest: 1000,
  slow: 500,
  medium: 250,
  fast: 100,
  fastest: 50,
} as const;
export type SlideshowSpeed = keyof typeof SlideshowSpeeds;

export type GridLayout = {
  rows: number;
  columns: number;
};

// The grid is represented as an array of rows, each row is an array of set keys (strings).
// Example: [["set1", "set2"], ["set3", "set4"]]
export type SelectedSetsGrid = string[][];

export type SetStore = {
  // The layout of the grid
  layout: GridLayout;
  // The selected sets in the grid, as a 2D array [row][col]
  selectedSetsGrid: SelectedSetsGrid;
  // Slideshow speed
  speed: SlideshowSpeed;
  // Whether the slideshow is active
  isSlideshowActive: boolean;

  // Setters
  setLayout: (layout: GridLayout) => void;
  setSelectedSetsGrid: (key: string) => void;
  setSpeed: (speed: SlideshowSpeed) => void;
  setSlideshowActive: (active: boolean) => void;
};

export const useSetStore = create<SetStore>((set) => ({
  layout: { rows: 1, columns: 1 },
  selectedSetsGrid: [[""]], // Default: 1x1 grid, empty string means no set selected
  speed: "medium",
  isSlideshowActive: false,

  setLayout: (layout) =>
    set((state) => {
      // When layout changes, adjust the selectedSetsGrid to match the new size
      const { rows, columns } = layout;
      const newGrid: SelectedSetsGrid = [];

      // Initialize the new grid with the current state
      for (let r = 0; r < rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < columns; c++) {
          // Try to preserve existing selection if possible
          row.push(state.selectedSetsGrid[r]?.[c] ?? "");
        }
        newGrid.push(row);
      }
      return { layout, selectedSetsGrid: newGrid };
    }),
  setSelectedSetsGrid: (key: string) =>
    set((state) => {
      const { rows, columns } = state.layout;
      const currentState = state.selectedSetsGrid;

      // First, check if the key is already selected
      let found = false;
      let foundRow = -1;
      let foundCol = -1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          if (currentState[r]?.[c] === key) {
            found = true;
            foundRow = r;
            foundCol = c;
            break;
          }
        }
        if (found) break;
      }

      // If key is already selected, remove it
      if (found) {
        const newGrid: SelectedSetsGrid = [];
        for (let r = 0; r < rows; r++) {
          const row: string[] = [];
          for (let c = 0; c < columns; c++) {
            if (r === foundRow && c === foundCol) {
              row.push("");
            } else {
              row.push(currentState[r]?.[c] ?? "");
            }
          }
          newGrid.push(row);
        }
        return { selectedSetsGrid: newGrid };
      }

      // Otherwise, add the key to the first available slot (row-major order)
      let placed = false;
      const newGrid: SelectedSetsGrid = [];
      for (let r = 0; r < rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < columns; c++) {
          const currentKey = currentState[r]?.[c] ?? "";
          if (!placed && currentKey === "") {
            row.push(key);
            placed = true;
          } else {
            row.push(currentKey);
          }
        }
        newGrid.push(row);
      }
      return { selectedSetsGrid: newGrid };
    }),
  setSpeed: (speed) => set({ speed }),
  setSlideshowActive: (active) => set({ isSlideshowActive: active }),
}));
