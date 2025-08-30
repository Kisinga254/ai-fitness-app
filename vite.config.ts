import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // FIX: `cwd` is not a named export from 'node:process'. Use the `process.cwd()` method instead, which is available globally in a Node.js environment.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // Define global constant replacements
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
  }
})
