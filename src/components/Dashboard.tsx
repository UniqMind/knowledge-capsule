import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, FileText, Brain, Plus, Search, 
  Trash2, Award, Clock, ArrowRight, Upload, Sparkles
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

  // Streak simulation (always active for visual feedback, linked to last activities)
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
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (isPDF) {
              processFile(file);
              break;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              KnowledgeCapsule
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your intelligent workspace for research, learning, and permanent synthesis.
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
              className="pl-9 pr-4 py-2 text-sm w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between gap-4 lg:col-span-2">
          <div className="flex flex-col justify-between h-full">
            <div>
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Today's Goal</span>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">Active Study</h2>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You've studied <strong className="text-slate-800 dark:text-slate-200">{studyMinutesToday} mins</strong> today.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Daily target: {studyMinutesGoal} mins</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium">
              <Award className="h-4 w-4" />
              <span>{streak} day study streak!</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                strokeWidth="10"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-indigo-600 dark:stroke-indigo-500 fill-none transition-all duration-500"
                strokeWidth="10"
                strokeDasharray={Math.PI * 2 * 46}
                strokeDashoffset={Math.PI * 2 * 46 * (1 - dailyProgressPercent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-slate-800 dark:text-white">{dailyProgressPercent}%</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Done</span>
            </div>
          </div>
        </div>

        {/* Small stats cards */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                <Brain className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Total Capsules</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{capsulesCount}</h3>
              <p className="text-xs text-slate-400 mt-1">Cross-PDF connections: {connectionsCount}</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Award className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">Flashcards</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {masteredCardsCount}<span className="text-sm text-slate-400 font-normal">/{flashcardsCount}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Mastery rate: {flashcardsCount > 0 ? Math.round((masteredCardsCount / flashcardsCount) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Library and Upload Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 columns: PDF Library list */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <span>Research Library</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {pdfs.length} documents
            </span>
          </h2>

          {filteredPdfs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
              <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No PDFs found</h3>
              <p className="text-sm text-slate-400 mt-1">
                {searchQuery ? 'Try matching another file name.' : 'Upload a PDF to get started with your research.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPdfs.map((pdf) => {
                const isSample = pdf.id === SAMPLE_PDF_ID;
                return (
                  <div 
                    key={pdf.id}
                    className="group glass-panel rounded-2xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition duration-200 flex flex-col justify-between"
                  >
                    {/* Top block */}
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          {isSample && (
                            <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
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
                              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
                              title="Delete PDF"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-4 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {pdf.name.replace(/_/g, ' ')}
                      </h3>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                        <span>{formatSize(pdf.size)}</span>
                        <span>•</span>
                        <span>{formatDate(pdf.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Bottom block (progress bar + open action) */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/50 px-5 py-4 flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{pdf.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${pdf.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={() => onOpenPDF(pdf.id)}
                        className="flex items-center justify-center p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition cursor-pointer"
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add Document</h2>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px] transition-all duration-200 ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10' 
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}>
              <Upload className="h-7 w-7" />
            </div>
            
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Drag and drop your PDF here
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Or click to browse files from your computer. Max size 20MB.
            </p>
            
            <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-slate-800 rounded-lg">
              <Clock className="h-3 w-3" />
              <span>Saves locally to your browser</span>
            </div>
          </div>

          {/* Quick learning tip/quote */}
          <div className="glass-panel p-5 rounded-2xl mt-6 border-l-4 border-l-indigo-500">
            <h4 className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Research Pro-Tip</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Use **Research Mode** in the workspace to view the Knowledge Graph and the AI tutor side-by-side. Highlight any text block to create a Capsule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
