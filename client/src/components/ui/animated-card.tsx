import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, ReactNode } from "react";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  variant?: "default" | "hover" | "glow" | "soft";
  interactive?: boolean;
  className?: string;
}

const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, variant = "default", interactive = true, className, ...props }, ref) => {
    const baseStyles = "relative overflow-hidden backdrop-blur-sm";

    const variants = {
      default: "bg-white/90 dark:bg-navy-900/90 border border-gray-200/50 dark:border-navy-700/50 shadow-soft",
      hover: "bg-white/95 dark:bg-navy-900/95 border border-electric-200/30 dark:border-electric-500/30 shadow-soft-lg",
      glow: "bg-white/90 dark:bg-navy-900/90 border border-electric-400/50 shadow-glow",
      soft: "bg-soft-100/80 dark:bg-navy-800/80 border border-soft-200/40 dark:border-navy-600/40 shadow-soft"
    };

    const motionVariants = {
      initial: {
        scale: 1,
        y: 0,
        boxShadow: variant === "glow" ? "0 0 20px rgba(109, 93, 251, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.05)"
      },
      hover: {
        scale: interactive ? 1.02 : 1,
        y: interactive ? -4 : 0,
        boxShadow: variant === "glow"
          ? "0 0 40px rgba(109, 93, 251, 0.6)"
          : "0 8px 40px rgba(0, 0, 0, 0.12)",
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      },
      tap: interactive ? {
        scale: 0.98,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      } : {}
    };

    return (
      <motion.div
        ref={ref}
        variants={motionVariants}
        initial="initial"
        whileHover={interactive ? "hover" : undefined}
        whileTap={interactive ? "tap" : undefined}
        className={cn(
          baseStyles,
          variants[variant],
          "rounded-2xl p-6",
          interactive && "cursor-pointer",
          className
        )}
        {...props}
      >
        {/* Subtle gradient overlay - reduced opacity to fix desktop hazy effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/2 to-transparent dark:from-electric-500/2 dark:to-transparent rounded-2xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>

        {/* Glow effect for glow variant */}
        {variant === "glow" && (
          <div className="absolute -inset-1 bg-gradient-to-r from-electric-400/20 to-electric-600/20 rounded-2xl blur-sm opacity-75 animate-glow-pulse pointer-events-none" />
        )}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

export { AnimatedCard };