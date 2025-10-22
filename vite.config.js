// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'zooy',
      fileName: (format) => `zooy.${format}.js`,
      formats: ['es', 'cjs']
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
      }
    },
    minify: 'esbuild'
  }
});
