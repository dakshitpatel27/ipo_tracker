import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete" }) => {
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
            className="glass-card w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">{title || "Are you sure?"}</h3>
              <p className="text-sm text-secondary">{message}</p>
            </div>
            <div className="bg-black/20 p-4 flex gap-3 justify-end border-t border-border">
              <button onClick={onClose} className="btn-outline flex-1">
                Cancel
              </button>
              <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors flex-1 shadow-glow shadow-rose-500/20">
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
