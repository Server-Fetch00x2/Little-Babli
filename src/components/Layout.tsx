import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Book, 
  Calendar, 
  Settings, 
  Plus, 
  LogOut, 
  Moon, 
  Sun,
  Menu,
  X,
  Sparkles,
  Target,
  Gift
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Button } from './ui/Button';
import { clsx } from 'clsx';
import { SurpriseModal } from './SurpriseModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout = ({ children, activeTab, setActiveTab }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showSurprise, setShowSurprise] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const navItems = [
    { id: 'home', icon: Sparkles, label: 'Home' },
    { id: 'journal', icon: Book, label: 'Journal' },
    { id: 'mood', icon: Heart, label: 'Mood' },
    { id: 'cycle', icon: Target, label: 'Growth' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <div className="w-24 h-24 bg-blush-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Heart className="text-blush-500 w-12 h-12 fill-current" />
          </div>
          <h1 className="text-4xl font-serif mb-4 text-lavender-600">LittleBabli</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Welcome to your safe, aesthetic, and emotionally supportive digital diary.
            A personal space designed for self-love and mindfulness.
          </p>
          <Button onClick={handleLogin} className="w-full" size="lg">
            Sign in with Google
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 glass sticky top-0 z-50">
        <h1 className="text-xl font-serif text-lavender-600">LittleBabli</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSurprise(true)}
            className="p-2 text-lavender-500 hover:bg-lavender-50 rounded-full transition-colors"
          >
            <Gift size={20} />
          </button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMenuOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop) / Overlay Menu (Mobile) */}
      <AnimatePresence>
        {(isMenuOpen || !isMobile) && (
          <motion.nav
            initial={isMobile ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={clsx(
              "fixed md:sticky top-0 left-0 h-full w-64 glass z-40 p-6 flex flex-col shadow-xl md:shadow-none",
              isMobile && "pt-20", // Add padding on mobile to clear the header
              !isMenuOpen && isMobile && "hidden"
            )}
          >
            <h1 className="text-2xl font-serif text-lavender-600 mb-12 hidden md:block">LittleBabli</h1>
            
            <div className="space-y-2 flex-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all",
                    activeTab === item.id 
                      ? "bg-lavender-100 text-lavender-600 font-medium" 
                      : "text-slate-500 hover:bg-lavender-50"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
              
              <button
                onClick={() => {
                  setShowSurprise(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-lavender-500 hover:bg-lavender-50 transition-all font-medium"
              >
                <Gift size={20} />
                Surprise! ✨
              </button>
            </div>

            <div className="pt-6 border-t border-lavender-100">
              <div className="flex items-center gap-3 mb-6 px-4">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full border-2 border-blush-200"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{user.displayName}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-50 transition-all"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Floating Action Button (Mobile) */}
      {activeTab === 'journal' && (
        <Button 
          className="fixed bottom-8 right-8 md:hidden rounded-full w-14 h-14 p-0 shadow-xl"
          onClick={() => setActiveTab('new-entry')}
        >
          <Plus size={28} />
        </Button>
      )}

      <SurpriseModal isOpen={showSurprise} onClose={() => setShowSurprise(false)} />
    </div>
  );
};
