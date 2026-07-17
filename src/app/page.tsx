import { HomeClientExperience } from "@/components/home/HomeClientExperience";
import { StaticHomeShell } from "@/components/home/StaticHomeShell";

export default function HomePage() {
  return (
    <StaticHomeShell>
      <HomeClientExperience />
    </StaticHomeShell>
  );
}