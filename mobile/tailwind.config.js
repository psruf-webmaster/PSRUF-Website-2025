const nativewind = require('nativewind/preset');

module.exports = {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        shell: '#f7efe8',
        card: '#fff8f2',
        ink: '#2c1f17',
        muted: '#6d5a4f',
        line: '#e8d7c8',
        accent: '#7b2226',
        accentSoft: '#d9a488',
        success: '#2f7d4d',
        warning: '#b2611f',
      },
      borderRadius: {
        '4xl': '32px',
      },
      boxShadow: {
        soft: '0 12px 30px rgba(79, 36, 25, 0.10)',
      },
    },
  },
  plugins: [],
};
