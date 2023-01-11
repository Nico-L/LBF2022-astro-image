import { defineConfig } from "astro/config";
import { astroImageTools } from "astro-imagetools";
import svelte from '@astrojs/svelte';
import tailwind from "@astrojs/tailwind";

import image from "@astrojs/image";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [{
      name: "import.meta.url-transformer",
      transform: (code, id) => {
        if (id.endsWith(".astro")) return code.replace(/import.meta.url/g, `"${id}"`);
      }
    }]
  },
  experimental: {
    integrations: true
  },
  integrations: [svelte(), tailwind(), image({
    serviceEntryPoint: '@astrojs/image/sharp',
    cacheDir: "./.cache/image"
  })]
});