import type { MemoryKeepsakeProps } from "./types";
import { PhotoKeepsake } from "./PhotoKeepsake";
import { LetterKeepsake } from "./LetterKeepsake";
import { VoiceKeepsake } from "./VoiceKeepsake";
import { VideoKeepsake } from "./VideoKeepsake";
import { CapsuleKeepsake } from "./CapsuleKeepsake";
import { PromiseKeepsake } from "./PromiseKeepsake";
import { TravelKeepsake } from "./TravelKeepsake";
import { WishKeepsake } from "./WishKeepsake";
import { GratitudeKeepsake } from "./GratitudeKeepsake";
import { ThoughtKeepsake } from "./ThoughtKeepsake";

export function MemoryKeepsake(props: MemoryKeepsakeProps) {
  const { memory } = props;
  if (memory.unlock_at) return <CapsuleKeepsake {...props} />;
  switch (memory.type) {
    case "photo": return <PhotoKeepsake {...props} />;
    case "letter": return <LetterKeepsake {...props} />;
    case "voice": return <VoiceKeepsake {...props} />;
    case "video": return <VideoKeepsake {...props} />;
    case "promise": return <PromiseKeepsake {...props} />;
    case "travel": return <TravelKeepsake {...props} />;
    case "wish": return <WishKeepsake {...props} />;
    case "gratitude": return <GratitudeKeepsake {...props} />;
    default: return <ThoughtKeepsake {...props} />;
  }
}
