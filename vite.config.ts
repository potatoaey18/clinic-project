import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Plugin order matters: tanstackStart must come before nitro.
// nitro() auto-detects the Vercel environment at build time (zero-config),
// so no explicit `preset: "vercel"` is required. Locally it builds to
// `.output/server/index.mjs`, which can be run with `npm run start`.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Points TanStack Start's server entry at our SSR error wrapper.
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
  ],
});
