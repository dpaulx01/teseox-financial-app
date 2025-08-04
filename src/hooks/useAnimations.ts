// Animation System Hook - Centralized animation management
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAnimation, AnimationControls } from 'framer-motion';

export interface AnimationPreset {
  name: string;
  initial: Record<string, any>;
  animate: Record<string, any>;
  exit?: Record<string, any>;
  transition?: Record<string, any>;
}

export interface AnimationSettings {
  enabled: boolean;
  reducedMotion: boolean;
  performance: 'high' | 'balanced' | 'battery';
  globalSpeed: number;
}

// Pre-defined animation presets
const ANIMATION_PRESETS: Record<string, AnimationPreset> = {
  fadeIn: {
    name: 'Fade In',
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  },
  
  slideInRight: {
    name: 'Slide In Right',
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },

  slideInLeft: {
    name: 'Slide In Left',
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },

  slideInUp: {
    name: 'Slide In Up',
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },

  slideInDown: {
    name: 'Slide In Down',
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },

  scaleIn: {
    name: 'Scale In',
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  },

  bounce: {
    name: 'Bounce',
    initial: { opacity: 0, y: -100 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 600, damping: 15 }
  },

  flipIn: {
    name: 'Flip In',
    initial: { opacity: 0, rotateY: -90 },
    animate: { opacity: 1, rotateY: 0 },
    transition: { duration: 0.6, ease: 'backOut' }
  },

  elastic: {
    name: 'Elastic',
    initial: { opacity: 0, scale: 0 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 700, damping: 10 }
  },

  glow: {
    name: 'Glow Effect',
    initial: { opacity: 0, boxShadow: '0 0 0px rgba(139, 92, 246, 0)' },
    animate: { 
      opacity: 1, 
      boxShadow: [
        '0 0 0px rgba(139, 92, 246, 0)',
        '0 0 20px rgba(139, 92, 246, 0.5)',
        '0 0 0px rgba(139, 92, 246, 0)'
      ] 
    },
    transition: { duration: 2, repeat: Infinity }
  }
};

// Hook for managing animation system
export const useAnimations = () => {
  const [settings, setSettings] = useState<AnimationSettings>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('animation-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to defaults
      }
    }

    return {
      enabled: true,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      performance: 'balanced' as const,
      globalSpeed: 1
    };
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    frameRate: 60,
    memoryUsage: 0,
    activeAnimations: 0
  });

  const activeAnimationsRef = useRef(new Set<string>());
  const performanceMonitorRef = useRef<number>();

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('animation-settings', JSON.stringify(settings));
  }, [settings]);

  // Monitor system performance
  useEffect(() => {
    if (!settings.enabled) return;

    const monitorPerformance = () => {
      // Monitor frame rate
      let lastTime = performance.now();
      let frameCount = 0;

      const measureFrameRate = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
          setPerformanceMetrics(prev => ({
            ...prev,
            frameRate: Math.round((frameCount * 1000) / (currentTime - lastTime)),
            activeAnimations: activeAnimationsRef.current.size
          }));
          
          frameCount = 0;
          lastTime = currentTime;
        }

        performanceMonitorRef.current = requestAnimationFrame(measureFrameRate);
      };

      measureFrameRate();
    };

    monitorPerformance();

    return () => {
      if (performanceMonitorRef.current) {
        cancelAnimationFrame(performanceMonitorRef.current);
      }
    };
  }, [settings.enabled]);

  // Adjust settings based on performance
  useEffect(() => {
    if (performanceMetrics.frameRate < 30 && settings.performance === 'high') {
      setSettings(prev => ({ ...prev, performance: 'balanced' }));
    } else if (performanceMetrics.frameRate < 20 && settings.performance === 'balanced') {
      setSettings(prev => ({ ...prev, performance: 'battery' }));
    }
  }, [performanceMetrics.frameRate, settings.performance]);

  // Listen for reduced motion preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Get adjusted animation preset based on settings
  const getAnimationPreset = useCallback((presetName: string): AnimationPreset | null => {
    if (!settings.enabled || settings.reducedMotion) {
      return {
        name: 'No Animation',
        initial: {},
        animate: {},
        transition: { duration: 0 }
      };
    }

    const preset = ANIMATION_PRESETS[presetName];
    if (!preset) return null;

    // Adjust for performance and speed
    const adjustedPreset: AnimationPreset = {
      ...preset,
      transition: {
        ...preset.transition,
        duration: preset.transition?.duration ? 
          preset.transition.duration / settings.globalSpeed : undefined
      }
    };

    // Performance adjustments
    if (settings.performance === 'battery') {
      adjustedPreset.transition = {
        ...adjustedPreset.transition,
        duration: (adjustedPreset.transition?.duration || 0.3) * 0.5
      };
    } else if (settings.performance === 'high') {
      // Add more complex easing for high performance
      adjustedPreset.transition = {
        ...adjustedPreset.transition,
        ease: 'backOut'
      };
    }

    return adjustedPreset;
  }, [settings]);

  // Register animation
  const registerAnimation = useCallback((id: string) => {
    activeAnimationsRef.current.add(id);
    return () => {
      activeAnimationsRef.current.delete(id);
    };
  }, []);

  // Create controlled animation
  const createAnimation = useCallback((presetName: string) => {
    const controls = useAnimation();
    const animationId = `${presetName}_${Date.now()}_${Math.random()}`;
    
    const cleanup = registerAnimation(animationId);

    const preset = getAnimationPreset(presetName);
    if (!preset) return { controls, cleanup };

    return {
      controls,
      cleanup,
      preset,
      start: () => controls.start(preset.animate),
      stop: () => controls.stop(),
      set: (values: Record<string, any>) => controls.set(values)
    };
  }, [getAnimationPreset, registerAnimation]);

  // Stagger animation helper
  const createStaggerAnimation = useCallback((
    presetName: string, 
    itemCount: number, 
    staggerDelay: number = 0.1
  ) => {
    const preset = getAnimationPreset(presetName);
    if (!preset) return null;

    return {
      container: {
        initial: 'hidden',
        animate: 'visible',
        variants: {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: staggerDelay / settings.globalSpeed,
              delayChildren: 0.2
            }
          }
        }
      },
      item: {
        variants: {
          hidden: preset.initial,
          visible: preset.animate
        }
      }
    };
  }, [getAnimationPreset, settings.globalSpeed]);

  // Sequence animation helper
  const createSequenceAnimation = useCallback((presets: string[]) => {
    const controls = useAnimation();
    
    const runSequence = async () => {
      for (const presetName of presets) {
        const preset = getAnimationPreset(presetName);
        if (preset) {
          await controls.start(preset.animate);
        }
      }
    };

    return { controls, runSequence };
  }, [getAnimationPreset]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AnimationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Quick settings toggles
  const toggleAnimations = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setPerformanceMode = useCallback((mode: AnimationSettings['performance']) => {
    setSettings(prev => ({ ...prev, performance: mode }));
  }, []);

  const setGlobalSpeed = useCallback((speed: number) => {
    setSettings(prev => ({ ...prev, globalSpeed: Math.max(0.1, Math.min(3, speed)) }));
  }, []);

  // Get available presets
  const availablePresets = useMemo(() => {
    return Object.keys(ANIMATION_PRESETS).map(key => ({
      key,
      name: ANIMATION_PRESETS[key].name
    }));
  }, []);

  return {
    // Settings
    settings,
    updateSettings,
    toggleAnimations,
    setPerformanceMode,
    setGlobalSpeed,
    
    // Performance
    performanceMetrics,
    
    // Presets
    availablePresets,
    getAnimationPreset,
    
    // Animation creation
    createAnimation,
    createStaggerAnimation,
    createSequenceAnimation,
    registerAnimation,
    
    // Utilities
    isAnimationEnabled: settings.enabled && !settings.reducedMotion,
    shouldReduceMotion: settings.reducedMotion,
    effectiveSpeed: settings.globalSpeed
  };
};

// Hook for simple preset animations
export const usePresetAnimation = (
  presetName: string, 
  options: { delay?: number; onComplete?: () => void } = {}
) => {
  const { getAnimationPreset, registerAnimation, isAnimationEnabled } = useAnimations();
  const controls = useAnimation();
  const { delay = 0, onComplete } = options;

  useEffect(() => {
    if (!isAnimationEnabled) return;

    const animationId = `preset_${presetName}_${Date.now()}`;
    const cleanup = registerAnimation(animationId);

    const preset = getAnimationPreset(presetName);
    if (preset) {
      const timer = setTimeout(() => {
        controls.start(preset.animate).then(() => {
          if (onComplete) onComplete();
          cleanup();
        });
      }, delay * 1000);

      return () => {
        clearTimeout(timer);
        cleanup();
      };
    }

    return cleanup;
  }, [presetName, delay, onComplete, controls, getAnimationPreset, registerAnimation, isAnimationEnabled]);

  const preset = getAnimationPreset(presetName);
  
  return {
    controls,
    initial: preset?.initial || {},
    animate: preset?.animate || {},
    transition: preset?.transition || {}
  };
};

// Hook for hover animations
export const useHoverAnimation = (
  hoverPreset: string = 'scaleIn',
  tapPreset?: string
) => {
  const { getAnimationPreset, isAnimationEnabled } = useAnimations();
  
  const hoverAnimation = getAnimationPreset(hoverPreset);
  const tapAnimation = tapPreset ? getAnimationPreset(tapPreset) : null;

  if (!isAnimationEnabled) {
    return {
      whileHover: {},
      whileTap: {}
    };
  }

  return {
    whileHover: hoverAnimation?.animate || { scale: 1.05 },
    whileTap: tapAnimation?.animate || { scale: 0.95 },
    transition: hoverAnimation?.transition || { type: 'spring', stiffness: 400, damping: 17 }
  };
};