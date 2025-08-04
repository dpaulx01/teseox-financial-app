import React, { ErrorBoundary } from 'react';

interface SafeAnimationWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

class SafeAnimationBoundary extends React.Component<
  SafeAnimationWrapperProps,
  { hasError: boolean }
> {
  constructor(props: SafeAnimationWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Silent error handling - animation failures are non-critical
  }

  render() {
    if (this.state.hasError || this.props.showFallback) {
      // Return the fallback UI or nothing
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

const SafeAnimationWrapper: React.FC<SafeAnimationWrapperProps> = ({ 
  children, 
  fallback = null, 
  showFallback = false 
}) => {
  // Check if we should disable animations in this environment
  const shouldDisableAnimations = 
    typeof window === 'undefined' || 
    !window.performance || 
    !window.requestAnimationFrame ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (shouldDisableAnimations || showFallback) {
    return <>{fallback}</>;
  }

  return (
    <SafeAnimationBoundary fallback={fallback}>
      {children}
    </SafeAnimationBoundary>
  );
};

export default SafeAnimationWrapper;