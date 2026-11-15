import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const backend = process.env.POLLO_BACKEND_URL || "http://localhost:8080";
export default defineConfig({ plugins: [react()], server: { host: "127.0.0.1", proxy: { "/api": backend } }, preview: { host: "127.0.0.1", proxy: { "/api": backend } }, build: { chunkSizeWarningLimit: 1200 } });
