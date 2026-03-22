import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, ArrowRight, Quote, Book } from 'lucide-react';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { db, auth } from './lib/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { MOODS } from './types';
import { clsx } from 'clsx';

export const Home = ({ 
  onStartJournaling, 
  selectedMood, 
  setSelectedMood 
}: { 
  onStartJournaling: () => void,
  selectedMood: string | null,
  setSelectedMood: (mood: string | null) => void
}) => {
  const affirmations = [
    "You are enough, just as you are.",
    "Your feelings are valid and important.",
    "Be kind to yourself today. 🌸",
    "You are growing, even when it doesn't feel like it. ✨",
    "Small steps are still progress. 👣",
    "You deserve all the love you give to others. 💖",
    "Take a deep breath. You're doing great. 🌬️",
    "Your potential is limitless. 💫",
    "Believe in the magic of new beginnings. 🌿",
    "You are strong, capable, and beautiful. 💪",
    "It's okay to take a break. 🍵",
    "Your heart is a beautiful place. ❤️"
  ];
  const [affirmationIndex, setAffirmationIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAffirmationIndex((prev) => {
        let next = Math.floor(Math.random() * affirmations.length);
        while (next === prev) {
          next = Math.floor(Math.random() * affirmations.length);
        }
        return next;
      });
    }, 5 * 60 * 1000); // Change every 5 minutes (300,000 ms)

    return () => clearInterval(interval);
  }, [affirmations.length]);

  const handleMoodCheck = async (mood: string) => {
    setSelectedMood(mood);
    if (!auth.currentUser) return;
    
    try {
      await addDoc(collection(db, 'moodLogs'), {
        userId: auth.currentUser.uid,
        date: new Date().toISOString().split('T')[0],
        mood,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'moodLogs');
    }
  };

  return (
    <div className="space-y-8">
      <header className="mb-12">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-serif text-slate-800"
        >
          Good morning, {auth.currentUser?.displayName?.split(' ')[0]} 🌸
        </motion.h2>
        <p className="text-slate-500 mt-2 italic">How is your heart feeling today?</p>
      </header>

      {/* Daily Affirmation */}
      <Card className="bg-gradient-to-br from-blush-50 to-lavender-50 border-none relative overflow-hidden min-h-[120px] flex items-center justify-center">
        <Quote className="absolute -top-4 -left-4 w-24 h-24 text-blush-100/50" />
        <div className="relative z-10 text-center py-4 w-full px-6">
          <motion.p 
            key={affirmationIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className="text-xl font-serif italic text-slate-700 leading-relaxed"
          >
            "{affirmations[affirmationIndex]}"
          </motion.p>
          <div className="mt-4 flex justify-center gap-1">
            {affirmations.slice(0, 3).map((_, i) => (
              <motion.div 
                key={i} 
                animate={{ 
                  scale: i === (affirmationIndex % 3) ? [1, 1.2, 1] : 1,
                  opacity: i === (affirmationIndex % 3) ? 1 : 0.5
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-blush-300" 
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Quick Mood Check */}
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Heart className="text-blush-400" size={18} />
          Quick Mood Check
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {MOODS.map((m) => (
            <button
              key={m.label}
              onClick={() => handleMoodCheck(m.label)}
              className={clsx(
                "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all active:scale-95",
                selectedMood === m.label 
                  ? "bg-lavender-500 text-white shadow-lg scale-105" 
                  : "bg-white hover:bg-lavender-50 text-slate-600"
              )}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Start Journaling CTA */}
      <Card className="border-2 border-lavender-100 bg-white/50 text-center py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-lavender-100 rounded-full flex items-center justify-center mx-auto mb-6 text-lavender-600">
            <Book size={28} className="md:w-8 md:h-8" />
          </div>
          <h4 className="text-xl md:text-2xl font-serif text-slate-800 mb-4">Ready to write?</h4>
          <p className="text-slate-600 mb-8">
            Your thoughts deserve a safe space. Start capturing your journey today.
          </p>
          <Button onClick={onStartJournaling} size="lg" className="gap-2 px-8">
            Open My Journal <ArrowRight size={20} />
          </Button>
        </div>
      </Card>
    </div>
  );
};
