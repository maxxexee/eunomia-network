tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bgDark: '#080808', cardBgDark: '#111111', cardBorderDark: '#1F1F1F',
        subtleTextDark: '#9A9A9A', bgLight: '#F8F9FA', cardBgLight: '#FFFFFF',
        cardBorderLight: '#E5E7EB', subtleTextLight: '#6B7280',
        amberAccent: '#D97706', amberLight: '#F59E0B', bronzeBorder: '#78350F',
        amberGlow: 'rgba(217,119,6,0.12)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseSlow: { '0%,100%': { opacity: 0.3, transform: 'translateY(0px)' }, '50%': { opacity: 0.8, transform: 'translateY(4px)' } },
      },
      animation: { float: 'float 4s ease-in-out infinite', pulseSlow: 'pulseSlow 2s ease-in-out infinite' },
    },
  },
};
