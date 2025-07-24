import { useShallow } from "zustand/react/shallow";
import SetShow from "~/components/SetShow";
import { useSetStore } from "~/components/SetStore";
import { cn } from "~/lib/utils";
import { FileMeta } from "~/types";

export default function Slideshow({
  data,
}: {
  data: Record<string, FileMeta[]>;
}) {
  const layout = useSetStore((state) => state.layout);
  const sets = useSetStore(
    useShallow((state) => state.selectedSetsGrid.flat())
  );

  return (
    <div
      className={cn(
        "grid h-screen w-screen overflow-hidden",
        layout.rows === 1 && "grid-rows-1",
        layout.rows === 2 && "grid-rows-2",
        layout.rows === 3 && "grid-rows-3",
        layout.columns === 1 && "grid-cols-1",
        layout.columns === 2 && "grid-cols-2",
        layout.columns === 3 && "grid-cols-3",
        layout.columns === 4 && "grid-cols-4",
        layout.columns === 5 && "grid-cols-5",
        layout.columns === 6 && "grid-cols-6",
        layout.columns === 7 && "grid-cols-7",
        layout.columns === 8 && "grid-cols-8",
        layout.columns === 9 && "grid-cols-9",
        layout.columns === 10 && "grid-cols-10"
      )}
    >
      {sets.map((set, rowIndex) => (
        <SetShow key={rowIndex} files={data[set] ?? []} />
      ))}
    </div>
  );
}
