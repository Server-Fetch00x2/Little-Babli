import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, Sparkles, Heart } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

interface SurpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SurpriseModal = ({ isOpen, onClose }: SurpriseModalProps) => {
  const [code, setCode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = () => {
    if (code.toUpperCase() === 'HBD-BABLI') {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Invalid code. Try again! ✨');
    }
  };

  const handleClose = () => {
    setIsUnlocked(false);
    setCode('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="max-w-lg w-full"
          >
            <Card className="relative overflow-hidden border-none shadow-2xl bg-white p-0">
              {/* Header Decoration */}
              <div className="h-2 bg-gradient-to-r from-lavender-400 via-blush-400 to-lavender-400" />
              
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="p-8">
                {!isUnlocked ? (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-lavender-50 rounded-full flex items-center justify-center mx-auto text-lavender-500">
                      <Gift size={40} className="animate-bounce" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-serif text-slate-800 mb-2">A Special Surprise?</h2>
                      <p className="text-slate-500 text-sm">Enter the secret code to unlock something special just for you.</p>
                    </div>
                    <div className="space-y-4">
                      <Input 
                        placeholder="Enter secret code..." 
                        className="text-center text-lg tracking-widest uppercase"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                      />
                      {error && <p className="text-red-400 text-xs italic">{error}</p>}
                      <Button onClick={handleUnlock} className="w-full gap-2">
                        <Sparkles size={18} /> Unlock Surprise
                      </Button>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-6 py-4"
                  >
                    <div className="flex justify-center gap-2 mb-4">
                      <Sparkles className="text-amber-400 animate-pulse" />
                      <Heart className="text-blush-400 fill-current animate-bounce" />
                      <Sparkles className="text-amber-400 animate-pulse" />
                    </div>
                    
                    <div className="prose prose-slate max-w-none text-left bg-lavender-50/50 p-6 rounded-3xl border border-lavender-100 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-lavender-200 scrollbar-track-transparent">
                      <h2 className="text-2xl font-serif text-lavender-600 text-center mb-6">
                        🎉 Happy Birthday, Babli! 🎂
                      </h2>
                      
                      <div className="space-y-4 text-slate-700 leading-relaxed font-sans">
                        <p>
                          Today is all about celebrating someone truly special — <span className="font-bold italic text-lavender-600">you!</span> 💖
                        </p>
                        <p>
                          You have this beautiful way of bringing happiness and warmth wherever you go, and honestly, the world feels brighter because of you ✨
                        </p>
                        <p>
                          I hope this year brings you closer to all your dreams and fills your life with endless smiles, love, and unforgettable moments 🌸
                        </p>
                        <p>
                          You deserve all the happiness in the world, not just today but every single day 💫
                        </p>
                        <p>
                          Stay as amazing, kind, and wonderful as you are — because that’s what makes you so special 💕
                        </p>
                        <p className="text-center font-bold text-lavender-600 pt-4 text-lg">
                          Happy Birthday once again, Babli! 🎈
                        </p>
                      </div>
                    </div>

                    <Button onClick={handleClose} variant="outline" className="w-full">
                      Back to LittleBabli 💖
                    </Button>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
