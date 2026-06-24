import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // Return index.html for any unknown route so React Router handles navigation
    historyApiFallback: true,
  },
});
