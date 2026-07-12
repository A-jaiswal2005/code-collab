import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 1. Import the polyfill plugin
import { nodePolyfills } from "vite-plugin-node-polyfills"; 

export default defineConfig({
  // Keep whatever base URL you set up earlier!
  base: "/code-collab/", 
  
  plugins: [
    react(),
    // 2. Add the polyfill plugin here to fix simple-peer
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],

  // (Removed the manualChunks build block that caused the crash)

  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 5173,
  },
});
