import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    tailwindcss(),
    viteReact(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "P2P 聊天",
        short_name: "P2P 聊天",
        start_url: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          { src: "/favicon-32.png", type: "image/png", sizes: "32x32" },
          { src: "/logo192.png", type: "image/png", sizes: "192x192" },
          { src: "/logo512.png", type: "image/png", sizes: "512x512" },
        ],
      },
    }),
  ]),
});
