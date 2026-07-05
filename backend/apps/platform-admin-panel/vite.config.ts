import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend CORS allow-list includes localhost:5173 / :5174 — keep dev + preview on those ports.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 5173 },
});
