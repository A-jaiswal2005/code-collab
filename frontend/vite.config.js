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
  
  // 3. NEW: Code Splitting configuration to fix LCP/Performance warnings
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Put LiveKit in its own separate file
            if (id.includes('@livekit') || id.includes('livekit-client')) {
              return 'livekit';
            }
            // Put React core in its own separate file
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Put all other node_modules in a general vendor file
            return 'vendor';
          }
        }
      }
    }
  },

  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 5173,
  },
});