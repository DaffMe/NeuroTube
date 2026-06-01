import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { Button } from "@/components/ui/button";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 15,
};

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...springTransition, delay: 0.1 }}
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <motion.a
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="flex h-8 w-8 items-center justify-center"
          >
            <img src="/favicon.png" alt="Logo" className="h-full w-full object-contain" />
          </motion.div>
          <span className="flex items-center font-extrabold tracking-tight">
            <span className="text-primary">Neuro</span>
            <span className="text-logo-tube transition-colors duration-300">Tube</span>
          </span>
        </motion.a>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} transition={springTransition}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-primary" />
            )}
          </Button>
        </motion.div>
      </div>
    </motion.header>
  );
}
