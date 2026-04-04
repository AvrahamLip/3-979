import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use / as base for Cloudflare (custom domain/dedicated URL), and /3-979/ for GitHub Pages
  const isCloudflare = process.env.CF_PAGES === "1" || mode === "production-cloudflare";
  const base = isCloudflare ? "/" : "/3-979/";

  const plugins = [
    tsconfigPaths(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "דוח-1 - דוח נוכחות יומי",
        short_name: "דוח-1",
        description: "מערכת דיווח נוכחות יומי - דוח-1",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ];

  if (mode === "development") {
    plugins.push(componentTagger());
  }

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: plugins,
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          zama: path.resolve(__dirname, "zama.html"),
          contact: path.resolve(__dirname, "contact.html"),
          "main-page": path.resolve(__dirname, "main.html"),
          update: path.resolve(__dirname, "update.html"),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
