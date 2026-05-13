import { motion } from "framer-motion";

const dots = [0, 1, 2, 3, 4];

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Analyzing sentiments..." }: LoadingSpinnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-20"
    >
      {/* Bouncing brain icon */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="rounded-full bg-primary/10 p-5"
      >
        <div className="flex h-12 w-12 items-center justify-center">
          <img src="/favicon.png" alt="Loading Logo" className="h-full w-full object-contain" />
        </div>
      </motion.div>

      {/* Bouncing dots */}
      <div className="flex gap-2">
        {dots.map((i) => (
          <motion.div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-primary"
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-sm font-medium text-muted-foreground"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
