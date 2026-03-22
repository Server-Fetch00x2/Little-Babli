import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Lock, 
  MoreVertical, 
  Trash2, 
  Edit3,
  Calendar as CalendarIcon,
  Tag,
  Pin
} from 'lucide-react';
import { db, auth } from './lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { JournalEntry, MOODS, UserProfile } from './types';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { PasswordModal } from './components/PasswordModal';

export const Journal = ({ onEditEntry, onNewEntry }: { 
  onEditEntry: (entry: JournalEntry) => void,
  onNewEntry: () => void 
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<JournalEntry | null>(null);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, 'users', auth.currentUser.uid);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'journals'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JournalEntry[];
      
      // Sort: Pinned first, then by createdAt desc
      const sortedData = [...data].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setEntries(sortedData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'journals');
    });

    return () => unsubscribe();
  }, []);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const path = `journals/${deletingId}`;
    try {
      await deleteDoc(doc(db, 'journals', deletingId));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleEntryClick = (entry: JournalEntry) => {
    if (entry.isLocked) {
      setPendingEntry(entry);
      setShowPasswordModal(true);
    } else {
      onEditEntry(entry);
    }
  };

  const handleVerifyPassword = (password: string) => {
    if (password === userProfile?.journalPassword) {
      if (pendingEntry) {
        onEditEntry(pendingEntry);
        setPendingEntry(null);
        setShowPasswordModal(false);
        setPasswordError('');
      }
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const stripHtml = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return (tempDiv.innerText || tempDiv.textContent || "").trim();
  };

  const getFirstImage = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const img = tempDiv.querySelector('img');
    return img ? img.src : null;
  };

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {deletingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          >
            <Card className="max-w-sm w-full text-center p-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-serif mb-2">Delete Memory?</h3>
              <p className="text-slate-500 mb-8 text-sm">This memory is a part of your journey. Are you sure you want to let it go?</p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setDeletingId(null)}>Keep it</Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600" onClick={confirmDelete}>Delete</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-serif text-slate-800">My Journey</h2>
        <Button onClick={onNewEntry} className="gap-2">
          <Plus size={20} /> New Entry
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <Input 
          placeholder="Search your thoughts..." 
          className="pl-12"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-lavender-200 border-t-lavender-500 rounded-full animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-lavender-100">
          <div className="w-16 h-16 bg-lavender-50 rounded-full flex items-center justify-center mx-auto mb-4 text-lavender-400">
            <Book size={32} />
          </div>
          <p className="text-slate-500">No entries found. Start capturing your moments.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry) => {
              const firstImage = getFirstImage(entry.content);
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="group hover:border-lavender-200 border-2 border-transparent transition-all cursor-pointer overflow-hidden">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1" onClick={() => handleEntryClick(entry)}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {MOODS.find(m => m.label === entry.mood)?.emoji || '🌸'}
                          </span>
                          <h3 className="text-xl font-serif text-slate-800 truncate">{entry.title}</h3>
                          {entry.isLocked && <Lock size={14} className="text-slate-400" />}
                          {entry.isPinned && <Pin size={14} className="text-amber-500 fill-amber-500" />}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={12} />
                            {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                          </span>
                          {entry.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag size={12} />
                              {entry.tags.join(', ')}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-4">
                          {firstImage && !entry.isLocked && (
                            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-lavender-100">
                              <img src={firstImage} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-slate-600 line-clamp-3 leading-relaxed flex-1">
                            {entry.isLocked ? 'This entry is private and locked.' : stripHtml(entry.content)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEntryClick(entry)}
                          className="p-2 bg-lavender-50 md:bg-transparent hover:bg-lavender-50 rounded-xl text-lavender-600 md:text-slate-400 hover:text-lavender-600"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(entry.id!)}
                          className="p-2 bg-red-50 md:bg-transparent hover:bg-red-50 rounded-xl text-red-500 md:text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingEntry(null);
          setPasswordError('');
        }}
        onSubmit={handleVerifyPassword}
        mode="verify"
        error={passwordError}
      />
    </div>
  );
};

import { Book } from 'lucide-react';
