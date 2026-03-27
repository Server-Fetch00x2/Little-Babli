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
  Pin,
  X,
  Download,
  Book
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { db, auth } from './lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { JournalEntry, UserProfile } from './types';
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
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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

  const getFilterRange = () => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (filterType === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (filterType === 'week') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (filterType === 'month') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (filterType === 'custom') {
      start = startDate ? new Date(startDate) : null;
      end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const { start, end } = getFilterRange();

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const entryDate = new Date(e.createdAt);
    
    const matchesStartDate = !start || entryDate >= start;
    const matchesEndDate = !end || entryDate <= end;
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setStartDate('');
    setEndDate('');
  };

  const downloadAllPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);

      const checkPageBreak = (neededHeight: number, currentY: number) => {
        if (currentY + neededHeight > pageHeight - 25) {
          pdf.addPage();
          return 25;
        }
        return currentY;
      };

      const wrapText = (text: string, maxWidth: number) => {
        const paragraphs = text.split('\n');
        const allLines: string[] = [];
        
        paragraphs.forEach(paragraph => {
          const words = paragraph.split(/\s+/);
          let currentLine = '';
          
          words.forEach(word => {
            if (!word) return;
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = pdf.getTextWidth(testLine);
            if (width <= maxWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) allLines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) allLines.push(currentLine);
          else if (paragraph === '') allLines.push('');
        });
        
        return allLines;
      };

      const processNode = async (node: Node, y: number): Promise<number> => {
        let nextY = y;
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            const lines = wrapText(text, contentWidth);
            for (const line of lines) {
              nextY = checkPageBreak(7, nextY);
              pdf.text(line, margin, nextY);
              nextY += 7;
            }
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.tagName === 'IMG') {
            const src = (element as HTMLImageElement).src;
            if (src.startsWith('data:image')) {
              try {
                const imgProps = pdf.getImageProperties(src);
                const imgWidth = Math.min(contentWidth, 120);
                const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                nextY = checkPageBreak(imgHeight + 10, nextY);
                pdf.addImage(src, 'PNG', (pageWidth - imgWidth) / 2, nextY, imgWidth, imgHeight);
                nextY += imgHeight + 10;
              } catch (e) {}
            }
          } else if (['H1', 'H2', 'H3'].includes(element.tagName)) {
            pdf.setFont('times', 'bold');
            const fontSize = element.tagName === 'H1' ? 16 : 14;
            pdf.setFontSize(fontSize);
            const lines = wrapText(element.innerText, contentWidth);
            for (const line of lines) {
              nextY = checkPageBreak(fontSize / 2 + 5, nextY);
              pdf.text(line, margin, nextY);
              nextY += fontSize / 2 + 5;
            }
            pdf.setFont('times', 'normal');
            pdf.setFontSize(11);
          } else {
            for (const child of Array.from(element.childNodes)) {
              nextY = await processNode(child, nextY);
            }
            if (['P', 'DIV', 'LI', 'BR'].includes(element.tagName)) nextY += 3;
          }
        }
        return nextY;
      };

      // Cover Page
      pdf.setFillColor(249, 250, 251);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setFont('times', 'bold');
      pdf.setFontSize(36);
      pdf.setTextColor(31, 41, 55);
      pdf.text("My Journal Collection", pageWidth / 2, pageHeight / 3, { align: 'center' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Exported on ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });
      pdf.text(`${filteredEntries.length} entries included`, pageWidth / 2, pageHeight / 3 + 22, { align: 'center' });

      for (const entry of filteredEntries) {
        pdf.addPage();
        let currentY = 30;

        // Entry Header
        pdf.setFont('times', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(31, 41, 55);
        const splitTitle = wrapText(entry.title, contentWidth);
        pdf.text(splitTitle, margin, currentY);
        currentY += (splitTitle.length * 10) + 5;

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text(format(new Date(entry.createdAt), 'MMMM dd, yyyy'), margin, currentY);
        currentY += 15;

        // Content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = entry.content;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(55, 65, 81);

        for (const node of Array.from(tempDiv.childNodes)) {
          currentY = await processNode(node, currentY);
        }
      }

      // Page Numbers
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save(`my-journal-export-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error("Bulk PDF Export Error:", error);
      alert("Failed to export PDF.");
    }
  };

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
        <div className="flex gap-2">
          {filteredEntries.length > 0 && (
            <Button variant="outline" onClick={downloadAllPDF} className="gap-2">
              <Download size={20} /> Export All
            </Button>
          )}
          <Button onClick={onNewEntry} className="gap-2">
            <Plus size={20} /> New Entry
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input 
              placeholder="Search your thoughts..." 
              className="pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx("gap-2", (filterType !== 'all' || startDate || endDate) && "border-lavender-400 text-lavender-600 bg-lavender-50")}
          >
            <Filter size={20} />
            <span className="hidden md:inline">Filters</span>
          </Button>
          {(searchTerm || filterType !== 'all' || startDate || endDate) && (
            <Button variant="ghost" onClick={clearFilters} className="text-slate-400 hover:text-slate-600 p-2">
              <X size={20} />
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-4 bg-lavender-50/30 border-lavender-100 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'Last Week' },
                    { id: 'month', label: 'Last Month' },
                    { id: 'custom', label: 'Custom Range' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setFilterType(option.id as any)}
                      className={clsx(
                        "px-4 py-2 rounded-full text-xs font-medium transition-all",
                        filterType === option.id 
                          ? "bg-lavender-500 text-white shadow-sm" 
                          : "bg-white text-slate-600 hover:bg-lavender-50 border border-lavender-100"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {filterType === 'custom' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">From Date</label>
                      <Input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">To Date</label>
                      <Input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
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
                          <h3 className="text-xl font-serif text-slate-800 truncate">{entry.title}</h3>
                          {entry.isLocked && <Lock size={14} className="text-slate-400" />}
                          {entry.isPinned && <Pin size={14} className="text-amber-500 fill-amber-500" />}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
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
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-lavender-100">
                              <img src={firstImage} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-slate-600 line-clamp-1 leading-relaxed flex-1 text-sm">
                            {entry.isLocked 
                              ? 'This entry is private and locked.' 
                              : stripHtml(entry.content).length > 50 
                                ? stripHtml(entry.content).substring(0, 50) + '...' 
                                : stripHtml(entry.content)
                            }
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
