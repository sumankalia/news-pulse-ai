import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: "/",
    define: {
      "process.env.BACKEND_URI": JSON.stringify(env.BACKEND_URI),
    },
    plugins: [react()],
    build: {
      outDir: "dist",
      assetsDir: "assets",
      base: "/",
    },
    server: {
      historyApiFallback: true,
    },
  };
});