import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  resolve: {
    alias: {
      '@/components': './src/components',
      '@/contexts': './src/contexts',
      '@/utils': './src/utils',
      '@/pages': './src/pages',
      '@/service': './src/service',
      '@/types': './src/types',
    },
  },
});
