import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, ReactNode, useEffect, useState } from "react";
import { X, Minus } from "lucide-react";

interface SwipeableDrawerProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  snapPoints?: number[];
  defaultSnapPoint?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
}

const SwipeableDrawer = forwardRef<HTMLDivElement, SwipeableDrawerProps>(
  ({ 
    children, 
    isOpen, 
    onClose, 
    title,
    className,
    snapPoints = [0.3, 0.6, 0.9],
    defaultSnapPoint = 0.6,
    showHandle = true,
    showCloseButton = true
  }, ref) => {
    
    const [currentSnapPoint, setCurrentSnapPoint] = useState(defaultSnapPoint);
    const [isDragging, setIsDragging] = useState(false);

    // Prevent body scroll when drawer is open
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

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      
      const velocity = info.velocity.y;
      const offset = info.offset.y;
      
      // Close if dragged down significantly or with high velocity
      if (offset > 150 || velocity > 500) {
        onClose();
        return;
      }
      
      // Find closest snap point
      const windowHeight = window.innerHeight;
      const currentPosition = (windowHeight - (windowHeight * currentSnapPoint + offset)) / windowHeight;
      
      let closestSnapPoint = snapPoints[0];
      let minDistance = Math.abs(currentPosition - snapPoints[0]);
      
      snapPoints.forEach(point => {
        const distance = Math.abs(currentPosition - point);
        if (distance < minDistance) {
          minDistance = distance;
          closestSnapPoint = point;
        }
      });
      
      setCurrentSnapPoint(closestSnapPoint);
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

    const drawerVariants = {
      hidden: { 
        y: "100%",
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30
        }
      },
      visible: { 
        y: `${(1 - currentSnapPoint) * 100}%`,
        transition: {
          type: "spring",
          stiffness: isDragging ? 500 : 300,
          damping: isDragging ? 40 : 30
        }
      }
    };

    return (
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Drawer */}
            <motion.div
              ref={ref}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={cn(
                "absolute bottom-0 left-0 right-0 max-h-full overflow-hidden",
                "bg-white dark:bg-navy-900 rounded-t-3xl shadow-2xl",
                "border-t border-gray-200/50 dark:border-navy-700/50",
                className
              )}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              style={{
                height: `${currentSnapPoint * 100}vh`
              }}
            >
              {/* Drag handle */}
              {showHandle && (
                <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
                  <motion.div 
                    className="w-10 h-1.5 bg-gray-300 dark:bg-navy-600 rounded-full"
                    whileHover={{ scale: 1.1, backgroundColor: "#6D5DFB" }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-navy-700/50">
                {title && (
                  <h2 className="text-lg font-semibold text-navy-900 dark:text-white">
                    {title}
                  </h2>
                )}
                
                <div className="flex items-center space-x-2">
                  {/* Snap point indicators */}
                  <div className="flex space-x-1">
                    {snapPoints.map((point, index) => (
                      <motion.button
                        key={point}
                        onClick={() => setCurrentSnapPoint(point)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          currentSnapPoint === point 
                            ? "bg-electric-500" 
                            : "bg-gray-300 dark:bg-navy-600"
                        )}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      />
                    ))}
                  </div>
                  
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

              {/* Bottom safe area for iOS */}
              <div className="pb-safe" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

SwipeableDrawer.displayName = "SwipeableDrawer";

export { SwipeableDrawer };
