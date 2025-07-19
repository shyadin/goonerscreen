import SetShow from "~/components/SetShow";
import { useSetStore } from "~/components/SetStore";

export default function Slideshow() {
  const sets = useSetStore((state) => state.sets);

  const setKeys = Object.keys(sets);
  const firstRow = setKeys.slice(0, Math.ceil(setKeys.length / 2));
  const secondRow = setKeys.slice(Math.ceil(setKeys.length / 2));

  return (
    <div className="grid grid-cols-1 grid-rows-1 lg:grid-rows-2 h-screen w-screen overflow-hidden">
      {firstRow.map((set) => (
        <SetShow key={set} files={sets[set] ?? []} />
      ))}
      {secondRow.map((set) => (
        <SetShow key={set} files={sets[set] ?? []} />
      ))}
    </div>
  );
}
