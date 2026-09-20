import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/modelo_dijkstra/" : "/",
  server: {
    port: 5173
  }
}));
