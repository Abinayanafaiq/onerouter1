import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/app/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "id",
    categories: ["developer", "productivity", "utilities"],
    icons: [
      {
        src: "/api/site/favicon",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/site/favicon",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
