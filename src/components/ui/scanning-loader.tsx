import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ScanningLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

/**
 * A sleek scanning/analysis loading animation with pulsing rings
 * Used across grading, card scanning, and AI analysis features
 */
export function ScanningLoader({ 
  size = 'md', 
  text,
  className 
}: ScanningLoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const ringSize = {
    sm: 24,
    md: 40,
    lg: 64,
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        {/* Outer pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Middle pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 0.2, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.2,
          }}
        />
        
        {/* Core spinning element */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        
        {/* Center dot */}
        <motion.div
          className="absolute inset-[30%] rounded-full bg-primary"
          animate={{
            scale: [0.8, 1, 0.8],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      
      {text && (
        <motion.span
          className="text-sm font-medium text-foreground"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
}

/**
 * Inline scanning loader for buttons and compact spaces
 */
export function InlineScanningLoader({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('w-4 h-4 rounded-full border-2 border-transparent border-t-current border-r-current', className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}
