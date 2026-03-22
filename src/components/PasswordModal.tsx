import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, ShieldCheck, Key } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  mode: 'create' | 'verify';
  error?: string;
}

export const PasswordModal = ({ isOpen, onClose, onSubmit, mode, error }: PasswordModalProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (mode === 'create') {
      if (password.length < 4) {
        setLocalError('Password must be at least 4 characters');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
    }

    onSubmit(password);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-sm"
          >
            <Card className="p-8 relative overflow-hidden">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-lavender-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lavender-600">
                  {mode === 'create' ? <ShieldCheck size={32} /> : <Lock size={32} />}
                </div>
                <h3 className="text-2xl font-serif text-slate-800">
                  {mode === 'create' ? 'Secure Your Diary' : 'Private Entry'}
                </h3>
                <p className="text-slate-600 text-sm mt-2">
                  {mode === 'create' 
                    ? 'Create a password to protect your private thoughts.' 
                    : 'Enter your password to unlock this memory.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <Input
                    type="password"
                    placeholder={mode === 'create' ? "Choose password" : "Enter password"}
                    className="pl-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>

                {mode === 'create' && (
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      className="pl-12"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}

                {(error || localError) && (
                  <p className="text-red-500 text-xs text-center font-medium">
                    {error || localError}
                  </p>
                )}

                <Button type="submit" className="w-full py-6 text-lg">
                  {mode === 'create' ? 'Set Password' : 'Unlock'}
                </Button>
              </form>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
