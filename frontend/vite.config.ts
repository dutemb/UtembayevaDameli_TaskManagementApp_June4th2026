import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server runs on 3000; production is served by nginx (see Dockerfile).
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, host: true },
});
