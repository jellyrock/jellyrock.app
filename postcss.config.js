// Tailwind 3 runs as a plain PostCSS plugin; Astro (Vite) loads this file for every stylesheet.
// Same plugins, in the same order, as the @astrojs/tailwind integration this replaces.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
