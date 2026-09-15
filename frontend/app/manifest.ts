import type { MetadataRoute } from "next";
import { NAVBAR_SURFACE_HEX } from "@/components/shell/shell-constants";

const FAVICON_HREF = "/branding/favicon_logo.png";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PandaCue App",
    short_name: "PandaCue",
    description: "Everything you need to power your salon and spa",
    start_url: "/",
    display: "standalone",
    background_color: NAVBAR_SURFACE_HEX,
    theme_color: NAVBAR_SURFACE_HEX,
    icons: [
      {
        src: FAVICON_HREF,
        type: "image/png",
      },
    ],
  };
}
