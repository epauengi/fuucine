import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/nguonc-api": {
        target: "https://phim.nguonc.com/api",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nguonc-api/, ""),
      },
      "/imdb-api": {
        target: "https://api.imdbapi.dev",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/imdb-api/, ""),
      },
      "/imdb-lookup-api": {
        target: "https://imdb.iamidiotareyoutoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/imdb-lookup-api/, ""),
      },
    },
  },
  preview: {
    proxy: {
      "/nguonc-api": {
        target: "https://phim.nguonc.com/api",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nguonc-api/, ""),
      },
      "/imdb-api": {
        target: "https://api.imdbapi.dev",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/imdb-api/, ""),
      },
      "/imdb-lookup-api": {
        target: "https://imdb.iamidiotareyoutoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/imdb-lookup-api/, ""),
      },
    },
  },
});
