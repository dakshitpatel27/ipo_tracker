import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.995 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="h-full flex flex-col"
    >
      {children}
    </motion.div>
  );
}
