import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '::',
    port: 8080,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/supabase/**', '**/scripts/**', '**/dist/**'],
    },
  },
});
