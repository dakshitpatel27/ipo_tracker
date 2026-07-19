import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail } from 'lucide-react';

const InputModal = ({ isOpen, onClose, onSubmit, title, message, placeholder = "", icon: Icon = Mail }) => {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSubmit(inputValue.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="glass-card w-full max-w-md overflow-hidden"
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <Icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">{title || "Enter Value"}</h3>
                <p className="text-sm text-secondary">{message}</p>
                <div className="mt-4 text-left">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-black/20 border border-border rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                    autoFocus
                  />
                </div>
              </div>
              <div className="bg-black/20 p-4 flex gap-3 justify-end border-t border-border">
                <button type="button" onClick={onClose} className="btn-outline flex-1 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={!inputValue.trim()} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex-1 shadow-glow shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  Submit
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InputModal;
