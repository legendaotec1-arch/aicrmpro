/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        // Новый светлый дизайн с яркими акцентами
        // Фон - White
        background: {
          DEFAULT: '#FFFFFF',
          soft: '#F8F8F8',
          muted: '#FFFFFF',
        },
        // Текст - Синевато-черный
        ink: {
          DEFAULT: '#151719',
          secondary: '#3D4549',
          muted: '#6B7579',
        },
        // Акцент основной - SlateBlue
        tiffany: {
          DEFAULT: '#6A5ACD',
          hover: '#5A4CBD',
          light: '#8477DD',
          soft: 'rgba(106, 90, 205, 0.12)',
          glow: 'rgba(106, 90, 205, 0.4)',
        },
        // Акцент важный - Киноварь (красно-оранжевый)
        cinnabar: {
          DEFAULT: '#FF4D00',
          hover: '#E64500',
          light: '#FF7A40',
          soft: 'rgba(255, 77, 0, 0.12)',
          glow: 'rgba(255, 77, 0, 0.4)',
        },
        // Терракота (новый премиум акцент)
        terracotta: {
          DEFAULT: '#D97A52',
          hover: '#C86A3E',
          light: '#E8936B',
          soft: 'rgba(217, 122, 82, 0.1)',
          glow: 'rgba(217, 122, 82, 0.35)',
        },
        // Кнопки и интерактивные элементы - SlateBlue
        primary: {
          DEFAULT: '#6A5ACD',
          hover: '#5A4CBD',
          light: '#8477DD',
          glow: 'rgba(106, 90, 205, 0.35)',
          soft: 'rgba(106, 90, 205, 0.12)',
          50: '#F0EFFB',
          100: '#E1DEFA',
          500: '#6A5ACD',
          600: '#5A4CBD',
          700: '#4A3CB0',
        },
        // CTA кнопки - SlateBlue
        cta: {
          DEFAULT: '#6A5ACD',
          hover: '#5A4CBD',
          light: '#8477DD',
          glow: 'rgba(106, 90, 205, 0.35)',
          soft: 'rgba(106, 90, 205, 0.12)',
          50: '#F0EFFB',
          100: '#E1DEFA',
          500: '#6A5ACD',
          600: '#5A4CBD',
          700: '#4A3CB0',
        },
        // Светлая поверхность карточек
        surface: {
          DEFAULT: '#FFFFFF',
          glass: 'rgba(255, 255, 255, 0.85)',
          muted: '#FFF5F8',
          subtle: '#FFF0F5',
        },
        // Admin light theme (mobile-first)
        admin: {
          bg: '#F3F4F6',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          border: '#D1D5DB',
          hover: '#E5E7EB',
          text: '#111827',
          textSecondary: '#4B5563',
          textMuted: '#9CA3AF',
          accent: '#6A5ACD',
          accentHover: '#5A4CBD',
          accentSoft: 'rgba(106, 90, 205, 0.12)',
          danger: '#DC2626',
          success: '#059669',
          warning: '#D97706',
        },
        success: { DEFAULT: '#10b981', soft: 'rgba(16, 185, 129, 0.12)' },
        warning: { DEFAULT: '#f59e0b', soft: 'rgba(245, 158, 11, 0.12)' },
        danger: { DEFAULT: '#ef4444', soft: 'rgba(239, 68, 68, 0.12)' },
        dark: {
          DEFAULT: '#0f172a',
          deeper: '#020617',
          card: '#1e293b',
          border: '#334155'
        },
        purple: {
          DEFAULT: '#8b5cf6',
          glow: 'rgba(139, 92, 246, 0.4)'
        }
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0, 0, 0, 0.05), 0 8px 24px rgba(0, 0, 0, 0.08)',
        card: '0 4px 24px rgba(0, 0, 0, 0.1)',
        glow: '0 0 40px rgba(106, 90, 205, 0.25)',
        'glow-lg': '0 0 60px rgba(106, 90, 205, 0.3)',
        'glow-cta': '0 0 40px rgba(106, 90, 205, 0.25)',
        'card-dark': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'admin-card': '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.05)',
        'admin-glow': '0 0 40px rgba(99, 102, 241, 0.2)',
        // iOS Glass effects
        glass: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255,255,255,0.5)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255,255,255,0.4)',
        // Premium glass
        'premium-card': '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'premium-cta': '0 4px 20px rgba(217, 122, 82, 0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
        'glass': '20px',
        'glass-lg': '24px',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 100%)',
        'primary-gradient': 'linear-gradient(135deg, #6A5ACD 0%, #5A4CBD 100%)',
        'cta-gradient': 'linear-gradient(135deg, #6A5ACD 0%, #5A4CBD 100%)',
        'admin-gradient': 'linear-gradient(180deg, #0a0f1e 0%, #111827 100%)',
        'accent-glow': 'radial-gradient(ellipse at center, rgba(106,90,205,0.15) 0%, transparent 70%)',
        'cta-glow': 'radial-gradient(ellipse at center, rgba(106,90,205,0.15) 0%, transparent 70%)',
        // Premium gradient
        'premium-cta': 'linear-gradient(135deg, #D97A52 0%, #E8936B 100%)',
        'premium-shell': 'linear-gradient(160deg, #FDF9F6 0%, #F6F0EA 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'pulse-cta': 'pulseCta 3s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(106,90,205,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(106,90,205,0.4)' }
        },
        pulseCta: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(106,90,205,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(106,90,205,0.4)' }
        }
      }
    }
  },
  plugins: []
};