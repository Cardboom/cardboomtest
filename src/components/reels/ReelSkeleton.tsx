import { motion } from 'framer-motion';

export function ReelSkeleton() {
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      </div>

      {/* Center loading spinner */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="relative">
          <motion.div
            className="w-16 h-16 rounded-full border-4 border-primary/30"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </motion.div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

      {/* Right side action skeletons */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        {/* Profile skeleton */}
        <motion.div
          className="w-12 h-12 rounded-full bg-white/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Action buttons skeleton */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <motion.div
              className="w-12 h-12 rounded-full bg-white/10"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
            <motion.div
              className="w-8 h-3 rounded bg-white/10"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
          </div>
        ))}
      </div>

      {/* Bottom info skeleton */}
      <div className="absolute bottom-6 left-4 right-20">
        {/* Username skeleton */}
        <motion.div
          className="w-32 h-4 rounded bg-white/10 mb-3"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Title skeleton */}
        <motion.div
          className="w-full h-4 rounded bg-white/10 mb-2"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
        />
        <motion.div
          className="w-3/4 h-4 rounded bg-white/10 mb-4"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />

        {/* Tagged card skeleton */}
        <motion.div
          className="flex items-center gap-3 p-2 rounded-xl bg-white/5 max-w-xs"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        >
          <div className="w-10 h-14 rounded bg-white/10" />
          <div className="flex-1">
            <div className="w-24 h-3 rounded bg-white/10 mb-2" />
            <div className="w-16 h-4 rounded bg-white/10" />
          </div>
        </motion.div>
      </div>

      {/* Progress bar skeleton */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <motion.div
          className="h-full bg-primary/50"
          animate={{ width: ['0%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    </div>
  );
}
