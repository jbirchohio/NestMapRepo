import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface PrimaryButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ 
    children, 
    variant = "primary", 
    size = "md", 
    loading = false, 
    disabled = false,
    className, 
    ...props 
  }, ref) => {
    
    const baseStyles = "relative overflow-hidden font-medium rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-electric-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary: "bg-electric-500 hover:bg-electric-600 text-white border-electric-500 hover:border-electric-600 shadow-glow hover:shadow-glow-lg",
      secondary: "bg-white dark:bg-navy-800 hover:bg-soft-100 dark:hover:bg-navy-700 text-navy-900 dark:text-white border-gray-200 dark:border-navy-600 hover:border-electric-300 dark:hover:border-electric-400 shadow-soft",
      ghost: "bg-transparent hover:bg-electric-50 dark:hover:bg-electric-900/20 text-electric-600 dark:text-electric-400 border-transparent hover:border-electric-200 dark:hover:border-electric-700",
      danger: "bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600 shadow-soft"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
      xl: "px-8 py-4 text-lg"
    };

    const motionVariants = {
      initial: { 
        scale: 1,
        filter: variant === "primary" ? "brightness(1)" : "brightness(1)"
      },
      hover: { 
        scale: 1.02,
        filter: variant === "primary" ? "brightness(1.1)" : "brightness(1.05)",
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      },
      tap: { 
        scale: 0.98,
        filter: "brightness(0.95)",
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      }
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        variants={motionVariants}
        initial="initial"
        whileHover={!isDisabled ? "hover" : undefined}
        whileTap={!isDisabled ? "tap" : undefined}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {/* Background glow effect for primary variant */}
        {variant === "primary" && (
          <div className="absolute inset-0 bg-gradient-to-r from-electric-400 to-electric-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
        )}
        
        {/* Inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-xl pointer-events-none" />
        
        {/* Content */}
        <div className="relative flex items-center justify-center space-x-2">
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          <span className={loading ? "opacity-70" : ""}>
            {children}
          </span>
        </div>

        {/* Ripple effect overlay */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
        </div>
      </motion.button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";

export { PrimaryButton };