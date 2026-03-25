import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, Key, ArrowRight, Sparkles, LogOut } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

interface SecurityGateProps {
  children: React.ReactNode;
  user: User | null;
}

export const SecurityGate: React.FC<SecurityGateProps> = ({ children, user }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      if (!user) {
        setHasPassword(null);
        setIsVerified(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setHasPassword(!!data.accessPassword);
        } else {
          setHasPassword(false);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    };

    checkSecurity();
  }, [user]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        accessPassword: password
      }, { merge: true });
      setHasPassword(true);
      setIsVerified(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      setError('Failed to save password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.accessPassword === password) {
          setIsVerified(true);
        } else {
          setError('Incorrect password. Please try again.');
          setPassword('');
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      setError('Something went wrong. Please try again.');
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lavender-200 border-t-lavender-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-lavender-200 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blush-200 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 shadow-xl border-lavender-100">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-lavender-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="text-lavender-600" size={32} />
            </div>
            <h2 className="text-2xl font-serif text-slate-800">
              {hasPassword ? 'Welcome Back' : 'Secure Your Sanctuary'}
            </h2>
            <p className="text-slate-500 mt-2 text-sm italic">
              {hasPassword 
                ? 'Please enter your security password to continue.' 
                : 'Create a security password to keep your sanctuary private.'}
            </p>
          </div>

          <form onSubmit={hasPassword ? handleVerifyPassword : handleSetPassword} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                  {hasPassword ? 'Security Password' : 'New Password'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {!hasPassword && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Confirm Password</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 text-xs text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg flex items-center justify-center gap-2"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : (
                <>
                  {hasPassword ? 'Unlock Sanctuary' : 'Create Password'}
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
            <div className="flex items-center gap-1 text-lavender-400">
              <Sparkles size={14} />
              <span className="text-[10px] uppercase tracking-widest font-bold">LittleBabli Security</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
