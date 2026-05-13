import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-oxc';

export default defineConfig({
  base: '/Necky/',
  plugins: [
    react(),
    {
      name: 'suppress-sourcemap-warnings',
      transform(code, id) {
        if (id.includes('@mediapipe')) {
          return {
            code: code.replace(/\/\/# sourceMappingURL=.*/g, ''),
            map: null,
          };
        }
      },
    },
  ],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  server: {
    host: true,
    strictPort: true,
    fs: {
      strict: false,
    },
  },
  build: {
    sourcemap: false,
  },
});
