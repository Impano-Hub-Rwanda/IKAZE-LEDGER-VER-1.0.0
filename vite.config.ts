import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'icons': ['lucide-react'],
          'pdf': ['jspdf', 'jspdf-autotable'],
          'excel': ['xlsx'],
          'pglite': ['@electric-sql/pglite'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    // Skip minification of already-minified PGlite wasm wrapper
    target: 'es2020',
  },
});
