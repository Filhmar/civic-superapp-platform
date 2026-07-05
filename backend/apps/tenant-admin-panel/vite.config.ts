import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend CORS allow-list includes localhost:5174 / :8090 / :8091 for admin consoles.
// The platform panel owns :5173 — this tenant console stays on :5174.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  preview: { port: 5174 },
});
