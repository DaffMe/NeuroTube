import { motion } from "framer-motion";

const dots = [0, 1, 2, 3, 4];

interface LoadingSpinnerProps {
  message?: string;
  progress?: number;
}

export function LoadingSpinner({ message = "Analyzing sentiments...", progress }: LoadingSpinnerProps) {
  const hasProgress = typeof progress === "number";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-20 w-full max-w-md mx-auto"
    >
      {/* Bouncing brain icon */}
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2.0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="rounded-full bg-primary/10 p-5 shadow-inner"
      >
        <div className="flex h-12 w-12 items-center justify-center">
          <img src="/favicon.png" alt="Loading Logo" className="h-full w-full object-contain" />
        </div>
      </motion.div>

      {/* Progress Bar or Bouncing dots */}
      {hasProgress ? (
        <div className="w-full space-y-2">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/80">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-primary via-accent to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                boxShadow: "0 0 8px hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      ) : (
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
      )}

      <motion.p
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-sm font-semibold text-muted-foreground text-center"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
