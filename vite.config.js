import { defineConfig } from 'vite';
import { resolve } from 'path';

// Base path must match the GitHub repository name for GitHub Pages.
export default defineConfig({
  base: '/Shrimp-Game/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        preview: resolve(__dirname, 'preview.html'),
        performers: resolve(__dirname, 'performers.html')
      }
    }
  }
});
