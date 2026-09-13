import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/trader-one/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
  },
});
