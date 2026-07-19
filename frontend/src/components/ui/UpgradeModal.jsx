import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, MessageSquare } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-card w-full max-w-md overflow-hidden relative"
          >
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/20 to-transparent pointer-events-none"></div>
            
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
            >
                ✕
            </button>
            
            <div className="p-8 text-center relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                <Lock className="text-white" size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{title || 'Premium Feature'}</h2>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                {message || "You've hit the limit for your current subscription tier. Upgrade your account to unlock higher limits and premium features."}
              </p>
              
              <div className="space-y-3">
                <a 
                  href="mailto:admin@ipotracker.com"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <Mail size={18} />
                  Contact Admin for Upgrade
                </a>
                
                <a 
                  href="https://wa.me/1234567890" // Placeholder
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20b858] transition-colors shadow-lg shadow-[#25D366]/20"
                >
                  <MessageSquare size={18} />
                  WhatsApp Support
                </a>
              </div>
              
              <button 
                 onClick={onClose}
                 className="mt-6 text-sm text-secondary hover:text-white transition-colors"
              >
                 Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
