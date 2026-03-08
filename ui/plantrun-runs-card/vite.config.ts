import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      name: "PlantRunRunsCard",
      fileName: "plantrun-runs-card"
    },
    rollupOptions: {
      output: {
        format: "es"
      }
    }
  }
});
