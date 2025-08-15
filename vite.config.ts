import { defineConfig } from 'vite';

const REPO = 'bugreport-viewer';

export default defineConfig(({ mode, command }) => {
  const isProd = mode === 'production';
  const isPreview = mode === 'preview';

  return {
    base: isProd ? `/${REPO}/` : '/',
    build: {
      target: 'es2022',
      sourcemap: !isProd || isPreview, // enable for dev & preview
      outDir: 'dist',
      modulePreload: { polyfill: false },
      cssMinify: isProd,
      rollupOptions: { output: { manualChunks: undefined } },
    },
    worker: {
      format: 'es',
      rollupOptions: { output: { manualChunks: undefined } },
    },
    define: {
      __APP_AUTHOR__: JSON.stringify('IberAI'),
    },
  };
});
