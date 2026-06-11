// NOTE: This project uses Tailwind v4 with PostCSS.
// DaisyUI is configured via @plugin "daisyui" in app/globals.css.
// This file is retained for tooling compatibility but is not processed at build time.
import type { Config } from 'tailwindcss'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const daisyui = require('daisyui')

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [daisyui],
  daisyui: {
    themes: ['light', 'dark'],
  },
}

export default config
