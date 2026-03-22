import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from './components/ui/Card';
import { db, auth } from './lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { MoodLog, MOODS } from './types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { clsx } from 'clsx';

export const MoodTracker = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      
      const start = startOfMonth(currentDate).toISOString().split('T')[0];
      const end = endOfMonth(currentDate).toISOString().split('T')[0];
      
      // Fetch from moodLogs
      const qMoodLogs = query(
        collection(db, 'moodLogs'),
        where('userId', '==', auth.currentUser.uid),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      
      // Fetch from journals
      const qJournals = query(
        collection(db, 'journals'),
        where('userId', '==', auth.currentUser.uid),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end + 'T23:59:59Z')
      );
      
      try {
        const [moodLogsSnap, journalsSnap] = await Promise.all([
          getDocs(qMoodLogs),
          getDocs(qJournals)
        ]);

        const moodLogsData = moodLogsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as MoodLog[];

        const journalMoodsData = journalsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            mood: data.mood,
            date: data.createdAt.split('T')[0]
          };
        }) as MoodLog[];

        // Merge and deduplicate: one mood per day, prioritizing manual logs over journal moods
        const dailyMoods: { [date: string]: MoodLog } = {};

        // First, add journal moods as a baseline
        journalMoodsData.forEach(jm => {
          dailyMoods[jm.date] = jm;
        });

        // Then, overwrite with manual logs (manual logs are more intentional)
        moodLogsData.forEach(ml => {
          dailyMoods[ml.date] = ml;
        });

        setLogs(Object.values(dailyMoods));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'moodLogs/journals');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [currentDate]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getMoodForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return logs.find(l => l.date === dateStr);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h2 className="text-3xl font-serif text-slate-800">Mood Garden</h2>
        <div className="flex items-center gap-4 bg-white rounded-full px-4 py-2 soft-shadow">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-lavender-50 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium min-w-[120px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-lavender-50 rounded-full">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <Card className="p-4 md:p-8">
        <div className="grid grid-cols-7 gap-1 md:gap-4 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 md:gap-4">
          {/* Padding for start of month */}
          {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          
          {days.map(day => {
            const log = getMoodForDay(day);
            const moodInfo = log ? MOODS.find(m => m.label === log.mood) : null;
            
            return (
              <motion.div
                key={day.toString()}
                whileHover={{ scale: 1.1 }}
                className={clsx(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all shadow-sm",
                  moodInfo 
                    ? `${moodInfo.color} ${moodInfo.border} border-2` 
                    : "bg-slate-50/50 border-2 border-dashed border-slate-100"
                )}
              >
                <span className={clsx(
                  "text-[10px] absolute top-1 left-2 font-medium",
                  moodInfo ? moodInfo.text : "text-slate-500"
                )}>
                  {format(day, 'd')}
                </span>
                {moodInfo && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-lg md:text-2xl"
                  >
                    {moodInfo.emoji}
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {MOODS.map(m => {
          const count = logs.filter(l => l.mood === m.label).length;
          return (
            <Card key={m.label} className={clsx("p-4 flex items-center gap-4 transition-all hover:shadow-md", m.color, m.border, "border-2")}>
              <span className="text-3xl">{m.emoji}</span>
              <div>
                <p className={clsx("font-medium", m.text)}>{m.label}</p>
                <p className="text-xs text-slate-600">{count} {count === 1 ? 'day' : 'days'} this month</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
