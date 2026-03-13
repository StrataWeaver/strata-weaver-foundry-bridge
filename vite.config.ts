import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      name: 'StrataWeaverBridge',
      entry: 'src/main.ts',
      formats: ['es'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      output: {
        assetFileNames: 'styles.css'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'module.json', dest: '.' },
        { src: 'src/templates', dest: '.' },
        { src: 'src/assets', dest: '.' }
      ]
    })
  ]
});