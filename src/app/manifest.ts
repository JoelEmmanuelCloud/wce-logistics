import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "WCE",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0B2545",
    theme_color: "#0B2545",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
