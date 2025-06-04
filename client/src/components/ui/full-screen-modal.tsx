import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface FullScreenModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  showCloseButton?: boolean;
  backdrop?: "blur" | "dark" | "light";
}

const FullScreenModal = forwardRef<HTMLDivElement, FullScreenModalProps>(
  ({ 
    children, 
    isOpen, 
    onClose, 
    title,
    className,
    showCloseButton = true,
    backdrop = "blur"
  }, ref) => {
    
    // Prevent body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const backdropVariants = {
      blur: "backdrop-blur-md bg-black/40",
      dark: "bg-black/60",
      light: "bg-white/80"
    };

    const overlayVariants = {
      hidden: { 
        opacity: 0,
        transition: {
          duration: 0.2,
          ease: "easeInOut"
        }
      },
      visible: { 
        opacity: 1,
        transition: {
          duration: 0.3,
          ease: "easeInOut"
        }
      }
    };

    const modalVariants = {
      hidden: { 
        y: "100%",
        opacity: 0,
        scale: 0.95,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.3
        }
      },
      visible: { 
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.4,
          delay: 0.1
        }
      }
    };

    return (
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Backdrop */}
            <motion.div
              className={cn("absolute inset-0", backdropVariants[backdrop])}
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal */}
            <motion.div
              ref={ref}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={cn(
                "relative w-full max-w-4xl mx-4 mb-0 sm:mb-4 max-h-[90vh] flex flex-col",
                "bg-white dark:bg-navy-900 rounded-t-3xl sm:rounded-3xl shadow-2xl",
                "border border-gray-200/50 dark:border-navy-700/50",
                className
              )}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  onClose();
                }
              }}
            >
              {/* Drag handle (mobile) */}
              <div className="sm:hidden flex justify-center py-3">
                <div className="w-8 h-1 bg-gray-300 dark:bg-navy-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-navy-700/50">
                {title && (
                  <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                    {title}
                  </h2>
                )}
                
                {showCloseButton && (
                  <motion.button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </motion.button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { delay: 0.2, duration: 0.3 }
                  }}
                  className="p-6"
                >
                  {children}
                </motion.div>
              </div>

              {/* Gradient overlay for scroll indication */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-navy-900 to-transparent pointer-events-none" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

FullScreenModal.displayName = "FullScreenModal";

export { FullScreenModal };