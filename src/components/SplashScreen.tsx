import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { Bot } from 'lucide-react';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { language } = useAuth();
  const t = translations[language];
  const [stage, setStage] = useState<'visible' | 'blur' | 'exit'>('visible');

  useEffect(() => {
    // Show app name for 1.5 seconds
    const timer1 = setTimeout(() => {
      setStage('blur');
    }, 1500);

    // Blur for 1 second
    const timer2 = setTimeout(() => {
      setStage('exit');
    }, 2500);

    // Signal completion
    const timer3 = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage !== 'exit' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden"
        >
          {/* Animated Background Elements */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.1 }}
            className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500 rounded-full blur-[100px]"
          />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.1 }}
            className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500 rounded-full blur-[100px]"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, filter: 'blur(0px)' }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              filter: stage === 'blur' ? 'blur(20px)' : 'blur(0px)',
              transition: {
                filter: { duration: 0.8, ease: "easeInOut" },
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 }
              }
            }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30">
              <Bot size={40} />
            </div>
            
            <div className="flex flex-col items-center">
              <motion.h1 
                className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tighter"
              >
                {t.appName}
              </motion.h1>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full mt-2"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
