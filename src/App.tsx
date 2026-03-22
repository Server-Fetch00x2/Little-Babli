import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { Layout } from './components/Layout';
import { Home } from './Home';
import { Journal } from './Journal';
import { JournalEditor } from './JournalEditor';
import { MoodTracker } from './MoodTracker';
import { SelfCareVision } from './SelfCareVision';
import { Settings } from './Settings';
import { JournalEntry, UserProfile } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Initialize user profile if it doesn't exist
        const userRef = doc(db, 'users', u.uid);
        try {
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newProfile: UserProfile = {
              uid: u.uid,
              name: u.displayName || 'User',
              email: u.email || '',
              preferences: {
                theme: 'light',
                reminders: false,
                privacy: false,
              },
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
        }

        // Fetch latest mood
        try {
          const q = query(
            collection(db, 'moodLogs'),
            where('userId', '==', u.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setSelectedMood(querySnapshot.docs[0].data().mood);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'moodLogs');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lavender-200 border-t-lavender-500 rounded-full animate-spin" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home 
            onStartJournaling={() => setActiveTab('new-entry')} 
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
          />
        );
      case 'journal':
        return (
          <Journal 
            onEditEntry={(entry) => {
              setEditingEntry(entry);
              setActiveTab('edit-entry');
            }} 
            onNewEntry={() => {
              setEditingEntry(null);
              setActiveTab('new-entry');
            }}
          />
        );
      case 'new-entry':
      case 'edit-entry':
        return (
          <JournalEditor 
            entry={editingEntry} 
            onClose={() => {
              setEditingEntry(null);
              setActiveTab('journal');
            }} 
          />
        );
      case 'mood':
        return <MoodTracker />;
      case 'cycle':
        return <SelfCareVision />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Home 
            onStartJournaling={() => setActiveTab('new-entry')} 
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
          />
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

