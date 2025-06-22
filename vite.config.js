import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          chart: [
            "chart.js",
            "chartjs-plugin-annotation",
            "chartjs-plugin-zoom",
            "chartjs-adapter-date-fns",
          ],
          date: ["date-fns"],
        },
      },
    },
  },
});
