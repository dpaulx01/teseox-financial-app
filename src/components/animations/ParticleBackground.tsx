// Particle Background Effect - Animated financial data visualization
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
  type: 'dot' | 'line' | 'triangle' | 'plus' | 'diamond';
}

interface Connection {
  from: Particle;
  to: Particle;
  strength: number;
}

interface ParticleBackgroundProps {
  particleCount?: number;
  connectionDistance?: number;
  animationSpeed?: number;
  colors?: string[];
  interactive?: boolean;
  showConnections?: boolean;
  financialTheme?: boolean;
  className?: string;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 50,
  connectionDistance = 150,
  animationSpeed = 1,
  colors = ['#00F0FF', '#00FF99', '#FF0080', '#8B5CF6'],
  interactive = true,
  showConnections = true,
  financialTheme = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [performance, setPerformance] = useState({ fps: 60, particles: 0 });

  // Financial-themed particle shapes
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 1;

    const { x, y, size, type } = particle;

    switch (type) {
      case 'dot':
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.stroke();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
        ctx.fill();
        break;

      case 'plus':
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.stroke();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }, []);

  // Create particle
  const createParticle = useCallback((id: number, canvas: HTMLCanvasElement): Particle => {
    const types: Particle['type'][] = financialTheme 
      ? ['dot', 'triangle', 'plus', 'diamond']
      : ['dot'];

    return {
      id,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * animationSpeed,
      vy: (Math.random() - 0.5) * animationSpeed,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.8 + 0.2,
      life: 0,
      maxLife: Math.random() * 300 + 200,
      type: types[Math.floor(Math.random() * types.length)]
    };
  }, [animationSpeed, colors, financialTheme]);

  // Initialize particles
  const initParticles = useCallback((canvas: HTMLCanvasElement) => {
    particlesRef.current = Array.from({ length: particleCount }, (_, i) =>
      createParticle(i, canvas)
    );
  }, [particleCount, createParticle]);

  // Update particle
  const updateParticle = useCallback((particle: Particle, canvas: HTMLCanvasElement, mouseInfluence: boolean = false) => {
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Boundary collision with gentle bounce
    if (particle.x <= 0 || particle.x >= canvas.width) {
      particle.vx *= -0.8;
      particle.x = Math.max(0, Math.min(canvas.width, particle.x));
    }
    if (particle.y <= 0 || particle.y >= canvas.height) {
      particle.vy *= -0.8;
      particle.y = Math.max(0, Math.min(canvas.height, particle.y));
    }

    // Mouse interaction
    if (interactive && mouseInfluence) {
      const dx = mouseRef.current.x - particle.x;
      const dy = mouseRef.current.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        const force = (100 - distance) / 100;
        particle.vx += (dx / distance) * force * 0.02;
        particle.vy += (dy / distance) * force * 0.02;
      }
    }

    // Update life
    particle.life++;
    if (particle.life > particle.maxLife) {
      // Respawn particle
      Object.assign(particle, createParticle(particle.id, canvas));
    }

    // Update opacity based on life cycle
    const lifeFactor = particle.life / particle.maxLife;
    if (lifeFactor < 0.1) {
      particle.opacity = lifeFactor * 10;
    } else if (lifeFactor > 0.9) {
      particle.opacity = (1 - lifeFactor) * 10;
    }

    // Velocity damping
    particle.vx *= 0.999;
    particle.vy *= 0.999;
  }, [interactive, createParticle]);

  // Draw connections
  const drawConnections = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    if (!showConnections) return;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          const opacity = (1 - distance / connectionDistance) * 0.3;
          
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }, [showConnections, connectionDistance]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Performance monitoring with fallback
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    
    // Update and draw particles
    particles.forEach(particle => {
      updateParticle(particle, canvas, true);
      drawParticle(ctx, particle);
    });

    // Draw connections
    drawConnections(ctx, particles);

    // Performance tracking with fallback - throttled updates
    const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const frameTime = endTime - startTime;
    
    // Only update performance metrics every 60 frames to prevent excessive state updates
    if (particles.length > 0 && particles[0].life % 60 === 0) {
      setPerformance(prev => ({
        fps: Math.round(1000 / frameTime),
        particles: particles.length
      }));
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [isVisible, updateParticle, drawParticle, drawConnections]);

  // Handle resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Reinitialize particles for new dimensions
    initParticles(canvas);
  }, [initParticles]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, [interactive]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    setIsVisible(!document.hidden);
  }, []);

  // Initialize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Initialize particles
    initParticles(canvas);

    // Event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, handleResize, handleMouseMove, handleVisibilityChange, initParticles]);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
      
      {/* Performance Monitor (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div
          className="fixed top-4 left-4 text-xs text-gray-500 bg-black/20 p-2 rounded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <div>FPS: {performance.fps}</div>
          <div>Particles: {performance.particles}</div>
          <div>Connections: {showConnections ? 'ON' : 'OFF'}</div>
        </motion.div>
      )}

      {/* Financial Data Flow Effect */}
      {financialTheme && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2 }}
        >
          {/* Flowing data streams */}
          <div className="absolute top-0 left-0 w-full h-full">
            <motion.div
              className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "linear"
              }}
            />
            <motion.div
              className="absolute top-2/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"
              animate={{
                x: ['100%', '-100%'],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                repeatDelay: 4,
                ease: "linear",
                delay: 2
              }}
            />
            <motion.div
              className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent"
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                repeatDelay: 2,
                ease: "linear",
                delay: 4
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ParticleBackground;