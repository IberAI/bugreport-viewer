// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bugreport-viewer/',
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },
});
