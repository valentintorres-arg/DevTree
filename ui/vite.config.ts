import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { graphEditorApiPlugin } from "./vite-plugin-graph-editor.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), graphEditorApiPlugin()],
});
