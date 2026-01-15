import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "", // 👈 this is critical
  plugins: [react(), tailwindcss()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      stream: "stream-browserify",
      buffer: "buffer",
      util: "util",
      process: "process/browser",
      events: "events",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI Libraries (Material-UI, etc.)
          'ui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@mui/x-date-pickers',
            '@emotion/react',
            '@emotion/styled',
            'framer-motion'
          ],

          // Firebase
          // 'firebase-vendor': ['firebase'],

          // Charts and visualization
          'charts-vendor': ['chart.js', 'react-chartjs-2'],

          // PDF and image processing
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],

          // Excel and data processing
          'excel-vendor': ['xlsx', 'xlsx-js-style', 'papaparse', 'react-csv'],

          // Authentication
          'auth-vendor': ['@azure/msal-browser', '@azure/msal-react'],

          // Utilities and other libraries
          'utils-vendor': [
            'lodash',
            'date-fns',
            'dayjs',
            'axios',
            'file-saver',
            'jszip',
            'cheerio',
            'react-bootstrap'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase warning limit to 1MB
  }
});
