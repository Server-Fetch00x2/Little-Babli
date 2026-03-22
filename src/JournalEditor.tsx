import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Save, 
  Lock, 
  Unlock, 
  Tag as TagIcon, 
  Image as ImageIcon,
  X,
  Download,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  List as ListIcon,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';
import { Button } from './components/ui/Button';
import { Input, TextArea } from './components/ui/Input';
import { Card } from './components/ui/Card';
import { JournalEntry, MOODS, UserProfile } from './types';
import { db, auth } from './lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import ReactQuill from 'react-quill-new';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { PasswordModal } from './components/PasswordModal';
import { jsPDF } from 'jspdf';

export const JournalEditor = ({ 
  entry, 
  onClose 
}: { 
  entry?: JournalEntry | null, 
  onClose: () => void 
}) => {
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || 'Peaceful');
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isLocked, setIsLocked] = useState(entry?.isLocked || false);
  const [isPinned, setIsPinned] = useState(entry?.isPinned || false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const quillRef = useRef<ReactQuill>(null);

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

  // Auto-save logic
  useEffect(() => {
    if (!title || !content || !auth.currentUser) return;
    
    const timer = setTimeout(() => {
      handleSave(true); // true means it's an auto-save
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(timer);
  }, [title, content]);

  const handleSave = async (isAuto = false) => {
    if (!title || !content || !auth.currentUser) return;
    if (!isAuto) setIsSaving(true);

    const entryData = {
      userId: auth.currentUser.uid,
      title,
      content,
      mood,
      tags,
      isLocked,
      isPinned,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (entry?.id) {
        await updateDoc(doc(db, 'journals', entry.id), entryData);
      } else if (!isAuto) {
        // Only create new doc on manual save to avoid empty auto-saves
        await addDoc(collection(db, 'journals'), {
          ...entryData,
          createdAt: new Date().toISOString(),
          images: [],
        });
      }
      setLastSaved(new Date());
      if (!isAuto) onClose();
    } catch (error) {
      handleFirestoreError(error, entry?.id ? OperationType.UPDATE : OperationType.CREATE, entry?.id ? `journals/${entry.id}` : 'journals');
    } finally {
      if (!isAuto) setIsSaving(false);
    }
  };

  const handleToggleLock = () => {
    if (!isLocked && !userProfile?.journalPassword) {
      setShowPasswordModal(true);
    } else {
      setIsLocked(!isLocked);
    }
  };

  const handleSetPassword = async (password: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        journalPassword: password
      });
      setUserProfile(prev => prev ? { ...prev, journalPassword: password } : null);
      setIsLocked(true);
      setShowPasswordModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              quill.insertEmbed(range.index, 'image', base64String);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const modules = {
    toolbar: {
      container: "#toolbar",
    },
  };

  const formats = [
    'header', 'bold', 'italic', 'list', 'image', 'align'
  ];

  const downloadPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const contentWidth = pageWidth - (margin * 2);
      
      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(15, 23, 42); // slate-900
      
      const titleText = title || 'Untitled Entry';
      const splitTitle = pdf.splitTextToSize(titleText, contentWidth);
      pdf.text(splitTitle, margin, 30);
      
      let currentY = 30 + (splitTitle.length * 10);
      
      // Date and Mood
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184); // slate-400
      const dateStr = `${format(new Date(), 'MMMM dd, yyyy')} • ${mood}`;
      pdf.text(dateStr, margin, currentY);
      
      currentY += 15;
      
      // Content (Strip HTML for PDF)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.innerText || tempDiv.textContent || "";
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(51, 65, 85); // slate-700
      const splitContent = pdf.splitTextToSize(plainText, contentWidth);
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      splitContent.forEach((line: string) => {
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }
        pdf.text(line, margin, currentY);
        currentY += 7;
      });
      
      pdf.save(`${title || 'journal-entry'}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to export PDF.");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between sticky top-0 bg-cream/80 backdrop-blur-sm py-4 z-10">
        <button onClick={onClose} className="p-2 hover:bg-lavender-50 rounded-full text-slate-500">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-[10px] text-slate-400 italic hidden md:block">
              Auto-saved at {format(lastSaved, 'HH:mm:ss')}
            </span>
          )}
          <Button 
            variant="ghost" 
            onClick={handleToggleLock}
            className={isLocked ? "text-lavender-600" : "text-slate-400"}
          >
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setIsPinned(!isPinned)}
            className={isPinned ? "text-amber-500" : "text-slate-400"}
          >
            {isPinned ? <Pin size={20} /> : <PinOff size={20} />}
          </Button>
          <Button variant="outline" onClick={downloadPDF} className="gap-2 hidden md:flex">
            <Download size={18} /> PDF
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isSaving} className="gap-2">
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 bg-white rounded-3xl shadow-sm border border-lavender-100 lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="mb-4 text-xs text-slate-400 font-medium uppercase tracking-widest">
              {format(new Date(), 'MMMM dd, yyyy')} • {mood}
            </div>
            <Input 
              placeholder="Title of your memory..." 
              className="text-2xl font-serif border-none bg-transparent px-0 focus:border-transparent w-full mb-4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Custom Toolbar */}
            <div id="toolbar" className="flex items-center gap-1 py-2 border-y border-lavender-100 mb-4 overflow-x-auto scrollbar-hide bg-white/50 backdrop-blur-sm sticky top-[72px] z-[5]">
              <button className="ql-bold p-2 hover:bg-lavender-50 rounded-lg text-slate-600 transition-colors" title="Bold">
                <Bold size={18} />
              </button>
              <button className="ql-italic p-2 hover:bg-lavender-50 rounded-lg text-slate-600 transition-colors" title="Italic">
                <Italic size={18} />
              </button>
              <div className="w-px h-4 bg-lavender-100 mx-1" />
              <button className="ql-header p-2 hover:bg-lavender-50 rounded-lg text-slate-600 transition-colors" value="1" title="Heading 1">
                <Heading1 size={18} />
              </button>
              <button className="ql-header p-2 hover:bg-lavender-50 rounded-lg text-slate-600 transition-colors" value="2" title="Heading 2">
                <Heading2 size={18} />
              </button>
              <div className="w-px h-4 bg-lavender-100 mx-1" />
              <button className="ql-list p-2 hover:bg-lavender-50 rounded-lg text-slate-600 transition-colors" value="ordered" title="Ordered List">
                <ListIcon size={18} />
              </button>
              <button className="ql-list p-2 hover:bg-lavender-50 rounded-lg text-slate-600 transition-colors" value="bullet" title="Bullet List">
                <ListIcon size={18} className="rotate-180" />
              </button>
              <div className="w-px h-4 bg-lavender-100 mx-1" />
              <button 
                onClick={handleImageUpload}
                className="p-2 hover:bg-lavender-50 rounded-lg text-slate-600 flex items-center gap-2 text-sm whitespace-nowrap"
                title="Insert Image"
              >
                <ImageIcon size={18} className="text-lavender-500" />
              </button>
            </div>

            <div className="editor-container min-h-[500px]">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                placeholder="Write your heart out..."
                className="font-sans text-lg leading-relaxed"
              />
            </div>
            
            {tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="text-xs text-lavender-400">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-white border-2 border-lavender-100">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              Mood
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setMood(m.label)}
                  className={clsx(
                    "px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2",
                    mood === m.label 
                      ? "bg-lavender-500 text-white shadow-md" 
                      : "bg-lavender-50 text-slate-600 hover:bg-lavender-100"
                  )}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="bg-lavender-50/50 border-2 border-lavender-100">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TagIcon size={18} className="text-lavender-500" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map(tag => (
                <span key={tag} className="bg-white px-3 py-1 rounded-full text-xs text-lavender-600 flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Add tag..." 
                className="py-2 text-sm"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
              />
              <Button size="sm" onClick={addTag}>Add</Button>
            </div>
          </Card>
        </div>
      </div>
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleSetPassword}
        mode="create"
      />
      
      <style>{`
        .ql-container.ql-snow {
          border: none !important;
          font-family: inherit;
        }
        .ql-editor {
          padding: 0 !important;
          min-height: 400px;
          font-size: 1.125rem;
          line-height: 1.75;
          color: #334155;
        }
        .ql-editor.ql-blank::before {
          left: 0 !important;
          font-style: italic;
          color: #94a3b8;
        }
        .ql-toolbar.ql-snow {
          display: none !important;
        }
        .ql-editor img {
          border-radius: 1rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          margin: 1.5rem auto;
          display: block;
          max-width: 100%;
        }
        /* Active state for custom toolbar */
        #toolbar button.ql-active {
          background-color: #ede9fe !important;
          color: #7c3aed !important;
        }
      `}</style>
    </div>
  );
};
