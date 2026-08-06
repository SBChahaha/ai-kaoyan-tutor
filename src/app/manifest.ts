import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

// PWA manifest：支持"添加到主屏幕"、独立窗口
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: "AI考研助教",
    description: "11408 备考学习站：AI 授课 + 闯关 + 错题本 + 学习追踪",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
