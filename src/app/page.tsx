import SetCard from "~/components/SetCard";
import StartSlideshowButton from "~/components/StartSlideshowButton";
import { getFile } from "~/lib/s3Client";
import { FileMeta } from "~/types";
import FileGrid from "./FileGrid";

export default async function Home() {
  const { body } = await getFile("data.json");
  // Convert Uint8Array to string, then parse as JSON
  const data = JSON.parse(new TextDecoder().decode(body)) as FileMeta[];

  return (
    <div className="font-sans min-h-screen">
      <FileGrid files={data} />
      <StartSlideshowButton />
    </div>
  );
}
