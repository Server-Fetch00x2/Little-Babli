import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Check, Sparkles, LogOut, Download, ShieldCheck } from 'lucide-react';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { auth, db } from './lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { UserProfile } from './types';

export const Settings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, 'users', auth.currentUser.uid);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          // If createdAt is missing (for older users), set it now
          if (!data.createdAt) {
            const now = serverTimestamp();
            await updateDoc(docRef, { createdAt: now });
            data.createdAt = now;
          }
          setProfile(data);
          setDisplayName(data.name || auth.currentUser.displayName || '');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`);
      }
    };
    fetchProfile();
  }, []);

  const formatDate = (date: any) => {
    if (!date) return 'recently';
    
    // Handle Firestore Timestamp (object with toDate)
    if (date && typeof date === 'object' && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    // Handle Firestore Timestamp (plain object from some serializers)
    if (date && typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Handle ISO string or other date formats
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'recently';
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'recently';
    }
  };

  const handleUpdateName = async () => {
    if (!auth.currentUser || !profile || !displayName.trim()) return;
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: displayName.trim()
      });

      setProfile({ ...profile, name: displayName.trim() });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleDownloadData = async () => {
    if (!auth.currentUser) return;
    setIsDownloading(true);

    try {
      const uid = auth.currentUser.uid;
      const q = query(collection(db, 'journals'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      
      const journals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      let textContent = `LITTLE BABLI - MY JOURNAL BACKUP\n`;
      textContent += `Exported on: ${new Date().toLocaleString()}\n`;
      textContent += `Total Entries: ${journals.length}\n`;
      textContent += `==========================================\n\n`;

      journals.forEach((entry: any, index: number) => {
        // Strip HTML tags and decode entities for clean text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = entry.content;
        const cleanContent = tempDiv.textContent || tempDiv.innerText || "";

        textContent += `ENTRY #${journals.length - index}\n`;
        textContent += `Title: ${entry.title}\n`;
        textContent += `Date: ${new Date(entry.createdAt).toLocaleString()}\n`;
        textContent += `Mood: ${entry.mood}\n`;
        textContent += `Tags: ${entry.tags.join(', ') || 'None'}\n`;
        textContent += `------------------------------------------\n`;
        textContent += `${cleanContent}\n`;
        textContent += `\n==========================================\n\n`;
      });

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LittleBabli_MyNotes_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download Error:", error);
      alert("Something went wrong while downloading your notes. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-serif text-slate-800">Personal Space</h2>
        <p className="text-slate-500 mt-2 italic">Customize your sanctuary to feel just right.</p>
      </header>

      <div className="max-w-2xl space-y-6">
        <Card>
          <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
            <User size={20} className="text-lavender-500" />
            Profile Details
          </h3>
          <div className="flex items-center gap-6 mb-8">
            <img 
              src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${displayName}`} 
              alt="Profile" 
              className="w-20 h-20 rounded-full border-4 border-blush-100"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-xl font-serif">{displayName || auth.currentUser?.displayName}</p>
              <p className="text-slate-500 text-sm">Member since {formatDate(profile?.createdAt)}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Display Name</label>
              <div className="flex gap-2">
                <Input 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1"
                />
                <Button 
                  onClick={handleUpdateName} 
                  disabled={isSaving || !displayName.trim() || displayName === profile?.name}
                  className="shrink-0"
                >
                  {isSaving ? 'Saving...' : saveSuccess ? <Check size={18} /> : 'Save'}
                </Button>
              </div>
              {saveSuccess && <p className="text-emerald-500 text-xs mt-2">Name updated successfully!</p>}
            </div>
          </div>
        </Card>

        <Card className="bg-lavender-50/30 border-lavender-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={80} className="text-lavender-500" />
          </div>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-lavender-500" />
            About LittleBabli
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-8 relative z-10">
            LittleBabli is not just a website, it's a little space I made only for you — 
            where your thoughts are safe, your feelings matter, and every small step 
            of your growth is visible. A calm corner for you to reflect, heal, 
            and love yourself more each day.
          </p>
          <div className="pt-6 border-t border-lavender-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-lavender-100 text-lavender-600 text-[10px] font-bold uppercase tracking-widest rounded-md">v1.0</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Handcrafted Sanctuary</span>
            </div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-lavender-100"
            >
              <span className="text-xs text-slate-500">Made with</span>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-red-400"
              >
                ❤️
              </motion.span>
              <span className="text-sm font-serif italic text-lavender-600 font-bold">by Deepak</span>
            </motion.div>
          </div>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-emerald-900 flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-500" />
                Data Reliability
              </h3>
              <p className="text-sm text-emerald-600/70 mt-1">
                Your data is stored securely in the cloud, but you can always keep a local copy for your peace of mind.
              </p>
            </div>
            <Button 
              onClick={handleDownloadData}
              disabled={isDownloading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <Download size={18} />
              {isDownloading ? 'Preparing...' : 'Download My Data'}
            </Button>
          </div>
        </Card>

        <Card className="border-red-100 bg-red-50/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-red-900 flex items-center gap-2">
                <LogOut size={20} className="text-red-500" />
                Sign Out
              </h3>
              <p className="text-sm text-red-600/70 mt-1">Ready to step out of your sanctuary?</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
