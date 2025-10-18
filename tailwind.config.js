/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores dinámicos que cambian según el tema
        // Tema Claro (Profesional)
        light: {
          // Fondos
          'bg': '#F8FAFC',
          'surface': '#F1F5F9',
          'card': '#FFFFFF',
          'glass': 'rgba(255, 255, 255, 0.8)',
          'glass-border': 'rgba(26, 54, 93, 0.1)',
          
          // Colores principales
          'primary': '#1a365d',
          'secondary': '#2c5282',
          'accent': '#3182ce',
          'warning': '#D97706',
          'danger': '#DC2626',
          'purple': '#6B46C1',
          
          // Efectos
          'primary-glow': 'rgba(26, 54, 93, 0.1)',
          'accent-glow': 'rgba(49, 130, 206, 0.1)',
          'danger-glow': 'rgba(220, 38, 38, 0.1)',
          
          // Texto
          'text-primary': '#1a202c',
          'text-secondary': '#2d3748',
          'text-light': '#4a5568',
          'text-muted': '#718096',
          'text-dim': '#a0aec0',
          
          // Bordes
          'border': 'rgba(26, 54, 93, 0.2)',
          'border-muted': 'rgba(160, 174, 192, 0.3)',
          'divider': 'rgba(226, 232, 240, 1)',
        },
        
        // Tema Oscuro (JARVIS Cyberpunk)
        dark: {
          // Fondos
          'bg': '#0A0A0F',
          'surface': '#111118',
          'card': '#1A1A25',
          'glass': 'rgba(26, 26, 37, 0.6)',
          'glass-border': 'rgba(0, 240, 255, 0.2)',
          
          // Colores principales
          'primary': '#00F0FF',
          'secondary': '#0080FF',
          'accent': '#00FF99',
          'warning': '#FFB800',
          'danger': '#FF0080',
          'purple': '#8000FF',
          
          // Efectos
          'primary-glow': 'rgba(0, 240, 255, 0.5)',
          'accent-glow': 'rgba(0, 255, 153, 0.5)',
          'danger-glow': 'rgba(255, 0, 128, 0.5)',
          
          // Texto
          'text-primary': '#FFFFFF',
          'text-secondary': '#E0E7FF',
          'text-light': '#F8FAFC',
          'text-muted': '#8B9DC3',
          'text-dim': '#5A6B8C',
          
          // Bordes
          'border': 'rgba(0, 240, 255, 0.3)',
          'border-muted': 'rgba(139, 157, 195, 0.2)',
          'divider': 'rgba(0, 240, 255, 0.1)',
        },
        
        // Colores base que se mantienen igual en ambos temas
        'dark-bg': 'var(--color-bg)',
        'dark-surface': 'var(--color-surface)',
        'dark-card': 'var(--color-card)',
        'glass': 'var(--color-glass)',
        'glass-border': 'var(--color-glass-border)',
        
        'primary': 'var(--color-primary)',
        'secondary': 'var(--color-secondary)',
        'accent': 'var(--color-accent)',
        'warning': 'var(--color-warning)',
        'danger': 'var(--color-danger)',
        'purple': 'var(--color-purple)',
        
        'primary-glow': 'var(--color-primary-glow)',
        'accent-glow': 'var(--color-accent-glow)',
        'danger-glow': 'var(--color-danger-glow)',
        
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-light': 'var(--color-text-light)',
        'text-muted': 'var(--color-text-muted)',
        'text-dim': 'var(--color-text-dim)',
        
        'border': 'var(--color-border)',
        'border-muted': 'var(--color-border-muted)',
        'divider': 'var(--color-divider)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        // Básicas
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        
        // Efectos de glow y pulse
        'pulse-glow': 'pulseGlow 2s infinite',
        'pulse-primary': 'pulsePrimary 1.5s infinite',
        'pulse-accent': 'pulseAccent 2s infinite',
        'glow-border': 'glowBorder 3s infinite',
        
        // Efectos JARVIS
        'scan-line': 'scanLine 2s infinite',
        'hologram': 'hologram 4s infinite',
        'matrix-rain': 'matrixRain 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glitch': 'glitch 0.5s ease-in-out',
        
        // Efectos de aparición
        'materialize': 'materialize 0.8s ease-out',
        'digital-in': 'digitalIn 0.6s ease-out',
        'beam-up': 'beamUp 1s ease-out',
        
        // Animación del toggle theme
        'spin-180': 'spin180 0.3s ease-in-out',
        'spin-360': 'spin360 0.5s ease-in-out',
        
        // Animaciones para modales
        'scale-in': 'scaleIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
      },
      keyframes: {
        // Básicas
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        
        // Efectos de glow sutiles
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 5px var(--color-primary-glow), 0 0 10px var(--color-primary-glow)',
            borderColor: 'var(--color-border)' 
          },
          '50%': { 
            boxShadow: '0 0 10px var(--color-primary-glow), 0 0 20px var(--color-primary-glow)',
            borderColor: 'var(--color-primary)' 
          },
        },
        pulsePrimary: {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--color-primary-glow)' },
          '70%': { boxShadow: '0 0 0 10px rgba(0, 0, 0, 0)' },
        },
        pulseAccent: {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--color-accent-glow)' },
          '70%': { boxShadow: '0 0 0 10px rgba(0, 0, 0, 0)' },
        },
        glowBorder: {
          '0%, 100%': { 
            borderColor: 'var(--color-border)',
            boxShadow: '0 0 5px var(--color-primary-glow)'
          },
          '50%': { 
            borderColor: 'var(--color-accent)',
            boxShadow: '0 0 10px var(--color-accent-glow)'
          },
        },
        
        // Efectos JARVIS
        scanLine: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        hologram: {
          '0%, 100%': { opacity: '1', filter: 'hue-rotate(0deg)' },
          '50%': { opacity: '0.8', filter: 'hue-rotate(90deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        
        // Efectos de aparición futurista
        materialize: {
          '0%': { 
            opacity: '0', 
            transform: 'scale(0.8) rotateX(90deg)',
            filter: 'blur(10px)'
          },
          '50%': { 
            opacity: '0.5', 
            transform: 'scale(1.05) rotateX(45deg)',
            filter: 'blur(5px)'
          },
          '100%': { 
            opacity: '1', 
            transform: 'scale(1) rotateX(0deg)',
            filter: 'blur(0px)'
          },
        },
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        digitalIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0) rotate(180deg)',
            filter: 'hue-rotate(180deg) brightness(0.5)'
          },
          '50%': { 
            opacity: '0.7',
            transform: 'scale(1.1) rotate(90deg)',
            filter: 'hue-rotate(90deg) brightness(1.2)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1) rotate(0deg)',
            filter: 'hue-rotate(0deg) brightness(1)'
          },
        },
        beamUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(50px) scaleY(0)',
            boxShadow: '0 0 0 rgba(0, 240, 255, 0)'
          },
          '50%': { 
            opacity: '0.8',
            transform: 'translateY(25px) scaleY(0.5)',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.5)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) scaleY(1)',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
          },
        },
        
        // Animaciones para el toggle
        spin180: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(180deg)' },
        },
        spin360: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      // Efectos adicionales
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px var(--color-primary-glow)',
        'glow-md': '0 0 20px var(--color-primary-glow)',
        'glow-lg': '0 0 30px var(--color-primary-glow)',
        'glow-xl': '0 0 40px var(--color-primary-glow)',
        'glow-accent': '0 0 20px var(--color-accent-glow)',
        'glow-danger': '0 0 20px var(--color-danger-glow)',
        'inner-glow': 'inset 0 0 10px var(--color-primary-glow)',
        'glass': '0 8px 16px 0 rgba(0, 0, 0, 0.1)',
        'glass-lg': '0 12px 24px 0 rgba(0, 0, 0, 0.15)',
        'professional': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'hologram': '0 0 50px var(--color-primary-glow), inset 0 0 20px var(--color-primary-glow)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'subtle-grid': 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
        'cyber-grid': 'linear-gradient(var(--color-primary-glow) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary-glow) 1px, transparent 1px)',
        'professional-lines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, var(--color-border) 2px, var(--color-border) 4px)',
        'hologram-lines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, var(--color-primary-glow) 2px, var(--color-primary-glow) 4px)',
      },
      backgroundSize: {
        'grid': '20px 20px',
        'grid-lg': '40px 40px',
      },
    },
  },
  plugins: [],
}