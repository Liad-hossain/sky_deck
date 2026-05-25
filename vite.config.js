import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // equivalent to '0.0.0.0'
    port: 5173,
    allowedHosts: [
      'e6fc-114-130-173-162.ngrok-free.app',
    ],
  },
});
