import React from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle } from 'lucide-react';

interface InsightBubbleProps {
  type: 'info' | 'warning' | 'critical';
  message: string;
}

const InsightBubble: React.FC<InsightBubbleProps> = ({ type, message }) => {
  const config = {
    info: {
      icon: <Info className="w-4 h-4" />,
      color: 'bg-blue-500',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'bg-yellow-500',
    },
    critical: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'bg-red-500',
    },
  };

  const bubbleConfig = config[type];

  if (!bubbleConfig) {
    return null; // Don't render if the type is invalid
  }

  return (
    <motion.div 
      className={`relative mx-2 w-5 h-5 rounded-full ${bubbleConfig.color} flex items-center justify-center text-white cursor-pointer`}
      whileHover={{ scale: 1.2 }}
    >
      {bubbleConfig.icon}
      <div className="absolute bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {message}
      </div>
    </motion.div>
  );
};

export default InsightBubble;