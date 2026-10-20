import { Hero } from "@/components/hero";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <main>
      <Hero contactEmail={site.contactEmail} />
    </main>
  );
}
