import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Navan-style electric violet theme
        electric: {
          50: '#F8F7FF',
          100: '#F3F0FF',
          200: '#E6E0FF',
          300: '#D4C8FF',
          400: '#B8A3FF',
          500: '#6D5DFB', // Primary electric violet
          600: '#5B4AD9',
          700: '#4A3AB7',
          800: '#392C95',
          900: '#2B2073',
        },
        navy: {
          50: '#F7F8FC',
          100: '#EEF1F8',
          200: '#DCE2F0',
          300: '#C5D0E5',
          400: '#A8B8D8',
          500: '#6B7794',
          600: '#4A5568',
          700: '#2D3748',
          800: '#1A202C',
          900: '#121E36', // Deep navy primary
        },
        soft: {
          50: '#FAFBFF',
          100: '#F3F6FF', // Soft background
          200: '#E8ECFF',
          300: '#DCE2FF',
          400: '#CBD5FF',
          500: '#B4C2FF',
        },
        // Legacy shadcn colors for compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(109, 93, 251, 0.3)',
        'glow-lg': '0 0 40px rgba(109, 93, 251, 0.4)',
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 8px 40px rgba(0, 0, 0, 0.08)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "slide-up": {
          from: { 
            transform: "translateY(100%)",
            opacity: "0"
          },
          to: { 
            transform: "translateY(0)",
            opacity: "1"
          },
        },
        "slide-down": {
          from: { 
            transform: "translateY(0)",
            opacity: "1"
          },
          to: { 
            transform: "translateY(100%)",
            opacity: "0"
          },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { 
            transform: "scale(0.95)",
            opacity: "0"
          },
          to: { 
            transform: "scale(1)",
            opacity: "1"
          },
        },
        "glow-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 20px rgba(109, 93, 251, 0.3)"
          },
          "50%": { 
            boxShadow: "0 0 40px rgba(109, 93, 251, 0.6)"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-down": "slide-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    function({ addUtilities }) {
      const newUtilities = {
        '.shadow-glow': {
          '--tw-shadow': '0 0 15px rgba(59, 130, 246, 0.5)',
          '--tw-shadow-colored': '0 0 15px var(--tw-shadow-color)',
          'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
        },
        '.shadow-glow-lg': {
          '--tw-shadow': '0 0 25px rgba(59, 130, 246, 0.7)',
          '--tw-shadow-colored': '0 0 25px var(--tw-shadow-color)',
          'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
        },
        '.shadow-glow-xl': {
          '--tw-shadow': '0 0 35px rgba(59, 130, 246, 0.9)',
          '--tw-shadow-colored': '0 0 35px var(--tw-shadow-color)',
          'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
        },
      }
      addUtilities(newUtilities, ['hover', 'focus'])
    }
  ],
} satisfies Config;
