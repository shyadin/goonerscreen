import StartSlideshowButton from "~/components/StartSlideshowButton";
import CloseSlideshowButton from "~/components/CloseSlideshowButton";
import { Suspense } from "react";
import DataFetch from "./DataFetch";

export default async function Home() {
  return (
    <div className="font-sans min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <DataFetch />
      </Suspense>
      <StartSlideshowButton />
      <CloseSlideshowButton />
    </div>
  );
}
