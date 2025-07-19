import SetShow from "~/components/SetShow";
import { useSetStore } from "~/components/SetStore";
import { cn } from "~/lib/utils";

export default function Slideshow() {
  const sets = useSetStore((state) => state.sets);

  const setKeys = Object.entries(sets);
  const firstRow =
    setKeys.length > 2
      ? setKeys.slice(0, Math.ceil(setKeys.length / 2))
      : setKeys;
  const secondRow =
    setKeys.length > 2 ? setKeys.slice(Math.ceil(setKeys.length / 2)) : [];

  const maxColumns = Math.max(firstRow.length, secondRow.length);

  return (
    <div
      className={cn("grid grid-cols-1 h-screen w-screen overflow-hidden", {
        "grid-cols-1": maxColumns === 1,
        "grid-cols-2": maxColumns === 2,
        "grid-cols-3": maxColumns === 3,
        "grid-cols-4": maxColumns === 4,
        "grid-cols-5": maxColumns === 5,
        "grid-cols-6": maxColumns === 6,
        "grid-cols-7": maxColumns === 7,
        "grid-cols-8": maxColumns === 8,
        "grid-cols-9": maxColumns === 9,
        "grid-cols-10": maxColumns === 10,
      })}
    >
      {firstRow.map(([set, files]) => (
        <SetShow key={set} files={files ?? []} />
      ))}
      {secondRow.map(([set, files]) => (
        <SetShow
          key={set}
          files={files ?? []}
          isSingle={secondRow.length === 1}
        />
      ))}
    </div>
  );
}
