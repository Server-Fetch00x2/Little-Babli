import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Target, 
  Sparkles, 
  Heart, 
  Trash2, 
  Camera,
  Calendar,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { db, auth } from './lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { VisionGoal, Habit } from './types';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Input, TextArea } from './components/ui/Input';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const HABIT_ICONS = [
  { name: 'Water', icon: '💧' },
  { name: 'Walk', icon: '🚶‍♀️' },
  { name: 'Meditate', icon: '🧘‍♀️' },
  { name: 'Read', icon: '📚' },
  { name: 'Sleep', icon: '🌙' },
  { name: 'Fruit', icon: '🍎' },
  { name: 'Stretch', icon: '🤸‍♀️' },
  { name: 'Journal', icon: '✍️' },
];

const CATEGORIES = ['Personal', 'Career', 'Health', 'Travel', 'Creative'] as const;

export const SelfCareVision = () => {
  const [activeTab, setActiveTab] = useState<'habits' | 'vision'>('habits');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<VisionGoal[]>([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  
  // New Habit State
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('✨');

  // New Goal State
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'Personal' as VisionGoal['category'],
    imageUrl: '',
    targetDate: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const qHabits = query(
      collection(db, 'habits'),
      where('userId', '==', auth.currentUser.uid)
    );
    const qGoals = query(
      collection(db, 'visionGoals'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubHabits = onSnapshot(qHabits, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Habit)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'habits');
    });
    const unsubGoals = onSnapshot(qGoals, (snap) => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as VisionGoal)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'visionGoals');
    });

    return () => {
      unsubHabits();
      unsubGoals();
    };
  }, []);

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newHabitName) return;

    try {
      await addDoc(collection(db, 'habits'), {
        userId: auth.currentUser.uid,
        name: newHabitName,
        icon: selectedIcon,
        frequency: 'daily',
        completedDates: [],
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'habits');
    }

    setNewHabitName('');
    setShowAddHabit(false);
  };

  const toggleHabit = async (habit: Habit) => {
    if (!auth.currentUser) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const isCompleted = habit.completedDates.includes(today);
    
    const habitRef = doc(db, 'habits', habit.id!);
    try {
      await updateDoc(habitRef, {
        completedDates: isCompleted ? arrayRemove(today) : arrayUnion(today)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `habits/${habit.id}`);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newGoal.title) return;

    try {
      await addDoc(collection(db, 'visionGoals'), {
        userId: auth.currentUser.uid,
        ...newGoal,
        isCompleted: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'visionGoals');
    }

    setNewGoal({ title: '', description: '', category: 'Personal', imageUrl: '', targetDate: '' });
    setShowAddGoal(false);
  };

  const toggleGoal = async (goal: VisionGoal) => {
    try {
      await updateDoc(doc(db, 'visionGoals', goal.id!), {
        isCompleted: !goal.isCompleted
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `visionGoals/${goal.id}`);
    }
  };

  const deleteItem = async (id: string, type: 'habit' | 'goal') => {
    const coll = type === 'habit' ? 'habits' : 'visionGoals';
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${coll}/${id}`);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-serif text-slate-800">Growth & Vision</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button 
              onClick={() => setActiveTab('habits')}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'habits' ? "bg-white text-lavender-600 shadow-sm" : "text-slate-600 hover:text-slate-700"
              )}
            >
              Self-Care
            </button>
            <button 
              onClick={() => setActiveTab('vision')}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'vision' ? "bg-white text-lavender-600 shadow-sm" : "text-slate-600 hover:text-slate-700"
              )}
            >
              Vision Board
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'habits' ? (
          <motion.div
            key="habits"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif text-slate-700">Daily Rituals</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAddHabit(!showAddHabit)}
                className="text-lavender-600"
              >
                <PlusCircle size={20} className="mr-2" /> Add Ritual
              </Button>
            </div>

            {showAddHabit && (
              <Card className="p-4 md:p-6 border-lavender-100 bg-lavender-50/30">
                <form onSubmit={handleAddHabit} className="space-y-4">
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
                    {HABIT_ICONS.map(i => (
                      <button
                        key={i.name}
                        type="button"
                        onClick={() => setSelectedIcon(i.icon)}
                        className={clsx(
                          "p-3 rounded-xl text-2xl transition-all",
                          selectedIcon === i.icon ? "bg-white shadow-md scale-110" : "hover:bg-white/50"
                        )}
                      >
                        {i.icon}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="What's your new ritual?" 
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit">Add</Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="grid gap-4">
              {habits.length === 0 && !showAddHabit && (
                <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                  <Heart className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-600">Start your self-care journey by adding a ritual.</p>
                </div>
              )}
              {habits.map(habit => {
                const isCompleted = habit.completedDates.includes(format(new Date(), 'yyyy-MM-dd'));
                return (
                  <Card 
                    key={habit.id} 
                    className={clsx(
                      "p-4 flex items-center justify-between transition-all group",
                      isCompleted ? "bg-emerald-50/30 border-emerald-100" : "hover:border-lavender-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleHabit(habit)}
                        className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all",
                          isCompleted ? "bg-emerald-100 scale-95" : "bg-slate-100 group-hover:bg-lavender-100"
                        )}
                      >
                        {habit.icon}
                      </button>
                      <div>
                        <h4 className={clsx("font-medium", isCompleted && "text-emerald-700 line-through opacity-60")}>
                          {habit.name}
                        </h4>
                        <p className="text-xs text-slate-600">Daily Ritual</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => deleteItem(habit.id!, 'habit')}
                        className="p-2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => toggleHabit(habit)}
                        className={clsx(
                          "p-2 transition-colors",
                          isCompleted ? "text-emerald-500" : "text-slate-300 hover:text-lavender-400"
                        )}
                      >
                        {isCompleted ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="vision"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif text-slate-700">Vision Board</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAddGoal(!showAddGoal)}
                className="text-lavender-600"
              >
                <Sparkles size={20} className="mr-2" /> Manifest Goal
              </Button>
            </div>

            {showAddGoal && (
              <Card className="p-4 md:p-6 border-amber-100 bg-amber-50/30">
                <form onSubmit={handleAddGoal} className="space-y-4">
                  <Input 
                    placeholder="What do you want to achieve?" 
                    value={newGoal.title}
                    onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select 
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-white text-sm focus:border-lavender-400 outline-none transition-all"
                      value={newGoal.category}
                      onChange={e => setNewGoal({...newGoal, category: e.target.value as any})}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Input 
                      type="date" 
                      value={newGoal.targetDate}
                      onChange={e => setNewGoal({...newGoal, targetDate: e.target.value})}
                    />
                  </div>
                  <TextArea 
                    placeholder="Describe your vision..." 
                    value={newGoal.description}
                    onChange={e => setNewGoal({...newGoal, description: e.target.value})}
                  />
                  <Input 
                    placeholder="Image URL (optional)" 
                    value={newGoal.imageUrl}
                    onChange={e => setNewGoal({...newGoal, imageUrl: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add to Vision</Button>
                    <Button variant="outline" onClick={() => setShowAddGoal(false)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.length === 0 && !showAddGoal && (
                <div className="col-span-full text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                  <Target className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-600">Your vision board is waiting for your dreams.</p>
                </div>
              )}
              {goals.map(goal => (
                <Card 
                  key={goal.id} 
                  className={clsx(
                    "overflow-hidden group transition-all",
                    goal.isCompleted ? "opacity-60 grayscale" : "hover:shadow-xl hover:-translate-y-1"
                  )}
                >
                  {goal.imageUrl ? (
                    <div className="h-40 overflow-hidden relative">
                      <img 
                        src={goal.imageUrl} 
                        alt={goal.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {goal.category}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-lavender-100 to-blush-100 flex items-center justify-center relative">
                      <Sparkles className="text-white" size={48} />
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {goal.category}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={clsx("text-lg font-serif text-slate-800", goal.isCompleted && "line-through")}>
                        {goal.title}
                      </h4>
                      <button 
                        onClick={() => toggleGoal(goal)}
                        className={clsx(
                          "p-2 rounded-full transition-colors",
                          goal.isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-500"
                        )}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{goal.description}</p>
                    <div className="flex items-center justify-between">
                      {goal.targetDate && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar size={14} />
                          {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                        </div>
                      )}
                      <button 
                        onClick={() => deleteItem(goal.id!, 'goal')}
                        className="p-2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-auto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
