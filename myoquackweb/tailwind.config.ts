import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0B2D5C',
        primary2: '#103B73',
        accentBlue: '#4B8BFF',
        softBlue: '#EAF2FF',
        accentYellow: '#FFC72C',
        textDark: '#0F172A',
        grayish: '#94A3B8',
      },
    },
  },
  plugins: [],
}

export default config
