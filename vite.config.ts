import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import federation from '@originjs/vite-plugin-federation'

const sharedPackages = {
  react: { requiredVersion: false },
  'react-dom': { requiredVersion: false },
  'react-router-dom': { requiredVersion: false },
  'react-redux': { requiredVersion: false },
  '@reduxjs/toolkit': { requiredVersion: false },
  '@tanstack/react-query': { requiredVersion: false },
  '@xyflow/react': { requiredVersion: false },
  antd: { requiredVersion: false },
  'styled-components': { requiredVersion: false },
} as const

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'plugin-rbac', // remote name
      filename: 'remoteEntry.js', // output file the host will load
      exposes: {
        './App': './src/App.tsx', // must match what host calls getRemote()
      },
      shared: sharedPackages,
    }),
  ],
  build: {
    outDir: 'build',
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
  publicDir: 'public',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      api: path.resolve(__dirname, './src/api'),
      components: path.resolve(__dirname, './src/components'),
      constants: path.resolve(__dirname, './src/constants'),
      localTypes: path.resolve(__dirname, './src/localTypes'),
      mocks: path.resolve(__dirname, './src/mocks'),
      pages: path.resolve(__dirname, './src/pages'),
      store: path.resolve(__dirname, './src/store'),
      templates: path.resolve(__dirname, './src/templates'),
      utils: path.resolve(__dirname, './src/utils'),
      hooks: path.resolve(__dirname, './src/hooks'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 9025,
    open: '/openapi-ui-plugin-rbac',
  },
})
