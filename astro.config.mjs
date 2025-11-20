// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://shayhenderson.dev',
  integrations: [
    tailwind(),
    icon(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        // Homepage gets highest priority
        if (item.url === 'https://shayhenderson.dev/') {
          item.priority = 1.0;
          // @ts-expect-error - 'weekly' is a valid sitemap changefreq value
          item.changefreq = 'weekly';
        }
        // Main pages get high priority
        else if (item.url.match(/\/(about|cv|projects)(\/|$)/)) {
          item.priority = 0.8;
          // @ts-expect-error - 'monthly' is a valid sitemap changefreq value
          item.changefreq = 'monthly';
        }
        // Other pages get default priority
        else {
          item.priority = 0.6;
          // @ts-expect-error - 'monthly' is a valid sitemap changefreq value
          item.changefreq = 'monthly';
        }
        // Add lastmod date (current build time as ISO string)
        item.lastmod = new Date().toISOString();
        return item;
      }
    }),
    react()
  ],
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    build: {
      cssMinify: true,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge']
          }
        }
      }
    },
    ssr: {
      noExternal: ['@radix-ui/react-slot']
    }
  }
});