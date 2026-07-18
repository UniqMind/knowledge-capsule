import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, FileText, Brain, Plus, Search, 
  Trash2, Award, Clock, ArrowRight, Upload, Sparkles, Library
} from 'lucide-react';
import { PDFDocumentInfo, deletePDFFile } from '../utils/storage';
import { SAMPLE_PDF_ID } from '../utils/sampleData';

interface DashboardProps {
  pdfs: PDFDocumentInfo[];
  onOpenPDF: (pdfId: string) => void;
  onUploadPDF: (name: string, data: ArrayBuffer) => void;
  onDeletePDF: (pdfId: string) => void;
  capsulesCount: number;
  connectionsCount: number;
  flashcardsCount: number;
  masteredCardsCount: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  pdfs,
  onOpenPDF,
  onUploadPDF,
  onDeletePDF,
  capsulesCount,
  connectionsCount,
  flashcardsCount,
  masteredCardsCount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics calculation
  const totalUploads = pdfs.length;
  const averageProgress = pdfs.length > 0 
    ? Math.round(pdfs.reduce((sum, pdf) => sum + pdf.progress, 0) / pdfs.length)
    : 0;

  // Streak simulation
  const streak = 5; 
  const studyMinutesToday = 27;
  const studyMinutesGoal = 45;
  const dailyProgressPercent = Math.min(100, Math.round((studyMinutesToday / studyMinutesGoal) * 100));

  const filteredPdfs = pdfs.filter(pdf => 
    pdf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      alert('Only PDF files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        onUploadPDF(file.name, reader.result);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Global paste upload listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const file = files[0];
        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (isPDF) {
          processFile(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onUploadPDF]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 border-b border-[#E5E0D8] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F4C81] tracking-tight font-serif flex items-center gap-2">
            <span>KnowledgeCapsule</span>
            <span className="text-[10px] uppercase tracking-widest font-mono font-bold bg-[#0F4C81]/10 px-2 py-0.5 rounded text-[#0F4C81]">
              v1.2 // scholar
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-serif italic">
            An academic synthesis environment for researching, connecting concepts, and permanent learning.
          </p>
        </div>

        {/* Action button / Search bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm w-60 rounded-xl border border-[#E5E0D8] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/15 focus:border-[#0F4C81] transition-all font-serif"
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
        {/* Progress Ring Card */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between gap-4 lg:col-span-2 border border-[#E5E0D8]">
          <div className="flex flex-col justify-between h-full">
            <div>
              <span className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider font-mono">Today's Target</span>
              <h2 className="text-xl font-bold text-slate-800 mt-1 font-serif">Active Focus Minutes</h2>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-600">
                You've studied <strong className="text-[#0F4C81]">{studyMinutesToday} mins</strong> today.
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Daily target: {studyMinutesGoal} mins</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-3 font-semibold">
              <Award className="h-4 w-4 text-emerald-500" />
              <span>{streak} day streak</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="38"
                className="stroke-[#E5E0D8]/40 fill-none"
                strokeWidth="7"
              />
              <circle
                cx="48"
                cy="48"
                r="38"
                className="stroke-[#0F4C81] fill-none transition-all duration-500"
                strokeWidth="7"
                strokeDasharray={Math.PI * 2 * 38}
                strokeDashoffset={Math.PI * 2 * 38 * (1 - dailyProgressPercent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-base font-extrabold text-[#0F4C81]">{dailyProgressPercent}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Done</span>
            </div>
          </div>
        </div>

        {/* Small stats cards */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-[#0F4C81]/45 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-[#0F4C81]">
                <Brain className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Capsules</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-slate-800 font-serif">{capsulesCount}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Cross-PDF connections: {connectionsCount}</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-[#0F4C81]/45 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81]">
                <Library className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Flashcards</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-slate-800 font-serif">
                {masteredCardsCount}<span className="text-sm text-slate-400 font-normal">/{flashcardsCount}</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Mastery rate: {flashcardsCount > 0 ? Math.round((masteredCardsCount / flashcardsCount) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Library and Upload Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 columns: PDF Library list */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-850 mb-4 flex items-center gap-2 font-serif border-b border-[#E5E0D8] pb-2">
            <FileText className="h-4 w-4 text-[#0F4C81]" />
            <span>Research Library</span>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600">
              {pdfs.length} files
            </span>
          </h2>

          {filteredPdfs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-2 border-[#E5E0D8]">
              <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-450 mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 font-serif">No documents in library</h3>
              <p className="text-xs text-slate-400 mt-1 font-serif italic">
                {searchQuery ? 'Try matching another file name.' : 'Upload a research PDF or drag-and-drop to start annotating.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPdfs.map((pdf) => {
                const isSample = pdf.id === SAMPLE_PDF_ID;
                return (
                  <div 
                    key={pdf.id}
                    className="group glass-panel rounded-2xl overflow-hidden hover:border-[#0F4C81] transition duration-200 flex flex-col justify-between"
                  >
                    {/* Top block */}
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="p-2 bg-[#0F4C81]/10 text-[#0F4C81] rounded-xl">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          {isSample && (
                            <span className="text-[9px] bg-[#0F4C81] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" />
                              Interactive Sample
                            </span>
                          )}
                          {!isSample && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Are you sure you want to delete this PDF? All its annotations will be kept.')) {
                                  onDeletePDF(pdf.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Delete PDF"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 mt-4 line-clamp-2 group-hover:text-[#0F4C81] transition font-serif">
                        {pdf.name.replace(/_/g, ' ')}
                      </h3>
                      
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2 font-mono">
                        <span>{formatSize(pdf.size)}</span>
                        <span>•</span>
                        <span>{formatDate(pdf.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Bottom block (progress bar + open action) */}
                    <div className="bg-[#FAF8F5]/80 border-t border-[#E5E0D8] px-5 py-4 flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 font-mono">
                          <span>PROGRESS</span>
                          <span>{pdf.progress}%</span>
                        </div>
                        <div className="w-full bg-[#E5E0D8] rounded-full h-1 overflow-hidden">
                          <div 
                            className="bg-[#0F4C81] h-1 rounded-full transition-all duration-300"
                            style={{ width: `${pdf.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={() => onOpenPDF(pdf.id)}
                        className="flex items-center justify-center p-2 bg-[#0F4C81]/10 text-[#0F4C81] rounded-xl hover:bg-[#0F4C81] hover:text-white transition cursor-pointer"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Drag and Drop Upload container */}
        <div>
          <h2 className="text-lg font-bold text-slate-850 mb-4 font-serif border-b border-[#E5E0D8] pb-2">Add Document</h2>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] transition-all duration-200 ${
              isDragging 
                ? 'border-[#0F4C81] bg-[#0F4C81]/5' 
                : 'border-[#E5E0D8] bg-white hover:border-[#0F4C81]'
            }`}
          >
            <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-[#0F4C81]/15 text-[#0F4C81]' : 'bg-slate-50 text-slate-400'}`}>
              <Upload className="h-6 w-6" />
            </div>
            
            <h3 className="text-xs font-bold text-slate-800 font-serif">
              Drag and drop your PDF here
            </h3>
            <p className="text-[10px] text-slate-450 mt-1 max-w-[200px] font-serif italic">
              Or click to browse from local files. Max size 20MB.
            </p>
            
            <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold font-mono text-[#0F4C81] bg-[#0F4C81]/10 rounded-lg">
              <Clock className="h-3 w-3" />
              <span>Saves locally to your browser</span>
            </div>
          </div>

          {/* Quick learning tip/quote */}
          <div className="glass-panel p-5 rounded-2xl mt-6 border-l-4 border-l-[#0F4C81] border-[#E5E0D8]">
            <h4 className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Scholarly Workflows</span>
            </h4>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed font-serif">
              Highlight sentences to auto-generate summary flashcards. Turn on **Research Mode** to view academic citations inline directly on the text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
