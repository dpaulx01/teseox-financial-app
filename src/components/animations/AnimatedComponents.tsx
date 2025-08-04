// Enhanced Animation Components - Micro-interactions and smooth transitions
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  Zap
} from 'lucide-react';

// Animated Counter Component
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatFn?: (value: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2,
  formatFn = (v) => Math.round(v).toLocaleString(),
  className = '',
  prefix = '',
  suffix = ''
}) => {
  const [displayValue, setDisplayValue] = useState(value); // Initialize with the target value
  const controls = useAnimation();

  useEffect(() => {
    let isCancelled = false;
    
    // If the animation system is not available, just set the value directly
    if (!controls || typeof window === 'undefined') {
      setDisplayValue(value);
      return;
    }
    
    const animateCounter = async () => {
      try {
        await controls.start({
          from: displayValue,
          to: value,
          transition: { duration, ease: "easeOut" },
          onUpdate: (latest) => {
            if (!isCancelled) {
              setDisplayValue(typeof latest === 'number' ? latest : value);
            }
          }
        });
      } catch (error) {
        // Animation failed, set value directly
        if (!isCancelled) {
          setDisplayValue(value);
        }
      }
    };

    animateCounter();

    return () => {
      isCancelled = true;
      try {
        controls.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [value, duration, controls]);

  return (
    <motion.span
      className={className}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{formatFn(displayValue)}{suffix}
    </motion.span>
  );
};

// Morphing Button Component
interface MorphingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  className?: string;
}

export const MorphingButton: React.FC<MorphingButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isSuccess = false,
  disabled = false,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = {
    primary: 'bg-purple-500 text-white border-purple-500 hover:bg-purple-600',
    secondary: 'bg-transparent text-purple-400 border-purple-400 hover:bg-purple-400/10',
    danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <motion.button
      className={`relative overflow-hidden border rounded-lg font-medium transition-all duration-300 ${baseClasses[variant]} ${sizeClasses[size]} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={!disabled && !isLoading ? onClick : undefined}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      animate={{
        scale: isPressed ? 0.95 : 1,
        backgroundColor: isSuccess ? '#10B981' : undefined
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={disabled || isLoading}
    >
      {/* Background ripple effect */}
      <motion.div
        className="absolute inset-0 bg-white/20 rounded-lg"
        initial={{ scale: 0, opacity: 0 }}
        animate={isPressed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Content with state transitions */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span>Procesando...</span>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>¡Completado!</span>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// Floating Action Button with Tooltip
interface FloatingActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color?: string;
  size?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  position = 'bottom-right',
  color = '#8B5CF6',
  size = 56
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 17 }}
    >
      <motion.button
        className="relative rounded-full shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/50"
        style={{
          width: size,
          height: size,
          backgroundColor: color
        }}
        onClick={onClick}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-current opacity-30"
          animate={{
            scale: isHovered ? [1, 1.5, 1] : 1,
            opacity: isHovered ? [0.3, 0, 0.3] : 0.3
          }}
          transition={{
            duration: 1.5,
            repeat: isHovered ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
        
        <Icon className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        
        {/* Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute bottom-full mb-2 px-3 py-1 bg-slate-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {label}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

// Enhanced Toast Notifications
interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  position = 'top-right',
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const progressValue = useMotionValue(100);
  const progressWidth = useTransform(progressValue, [0, 100], ["0%", "100%"]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    // Progress animation
    progressValue.set(0);
    const progressAnimation = progressValue.set(0);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose, progressValue]);

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: X
  };

  const colors = {
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400'
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2'
  };

  const Icon = icons[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed ${positionClasses[position]} z-50 max-w-sm`}
          initial={{ opacity: 0, y: -50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.3 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <div className={`p-4 rounded-lg border backdrop-blur-md ${colors[type]} shadow-xl`}>
            <div className="flex items-start space-x-3">
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{message}</p>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-current opacity-50"
                style={{ width: progressWidth }}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Skeleton Loading Component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  variant = 'text',
  animation = 'pulse',
  className = ''
}) => {
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  };

  return (
    <motion.div
      className={`bg-slate-700/50 ${variantClasses[variant]} ${className}`}
      style={{
        width,
        height,
        ...(animation === 'wave' && {
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
          backgroundSize: '200% 100%'
        })
      }}
      animate={
        animation === 'pulse'
          ? { opacity: [0.5, 1, 0.5] }
          : { backgroundPosition: ['200% 0', '-200% 0'] }
      }
      transition={
        animation === 'pulse'
          ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          : { duration: 1.5, repeat: Infinity, ease: "linear" }
      }
    />
  );
};

// Parallax Container
interface ParallaxContainerProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export const ParallaxContainer: React.FC<ParallaxContainerProps> = ({
  children,
  speed = 0.5,
  className = ''
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [elementTop, setElementTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (element) {
      setElementTop(element.offsetTop);
      setClientHeight(window.innerHeight);
    }
  }, []);

  const y = useMotionValue(0);

  useEffect(() => {
    const updateY = () => {
      if (ref.current) {
        const scrolled = window.scrollY;
        const rate = scrolled * -speed;
        y.set(rate);
      }
    };

    window.addEventListener('scroll', updateY);
    return () => window.removeEventListener('scroll', updateY);
  }, [speed, y]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y }}
    >
      {children}
    </motion.div>
  );
};

// Magnetic Button Effect
interface MagneticButtonProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
  onClick?: () => void;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  strength = 20,
  className = '',
  onClick
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * strength / 100;
    const deltaY = (e.clientY - centerY) * strength / 100;

    x.set(deltaX);
    y.set(deltaY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      className={className}
      style={{ x, y }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.button>
  );
};

// Stagger Animation Container
interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.1,
  className = ''
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};