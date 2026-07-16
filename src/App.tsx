import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Eye, EyeOff, LayoutGrid, Network, Sparkles, 
  Settings2, Sun, Moon, Library, Bookmark, BookOpen, Layers
} from 'lucide-react';
import { 
  storage, PDFDocumentInfo, KnowledgeCapsuleItem, 
  KnowledgeGraphConnection, UserSettings, savePDFFile, deletePDFFile
} from './utils/storage';
import { initSeedData, SAMPLE_PDF_ID } from './utils/sampleData';
import { Dashboard } from './components/Dashboard';
import { PDFViewer } from './components/PDFViewer';
import { CapsulePanel } from './components/CapsulePanel';
import { AISidebar } from './components/AISidebar';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { runAIAction, AIResult } from './utils/ai';

export default function App() {
  // Initialize seed data on load
  useEffect(() => {
    initSeedData();
  }, []);

  // Core metadata states
  const [pdfs, setPdfs] = useState<PDFDocumentInfo[]>([]);
  const [capsules, setCapsules] = useState<KnowledgeCapsuleItem[]>([]);
  const [connections, setConnections] = useState<KnowledgeGraphConnection[]>([]);
  const [settings, setSettings] = useState<UserSettings>(storage.getSettings());
  
  // Navigation / Active View States
  const [activePdfId, setActivePdfId] = useState<string | null>(null);
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(null);
  
  // Workspace UI panel layout controls
  const [rightPanel, setRightPanel] = useState<'capsule' | 'ai' | 'graph'>('capsule');
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'reader-only' | 'graph-only'>('split');
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  
  // Selected Text Cache
  const [activeHighlightText, setActiveHighlightText] = useState<string>('');
  
  // AI processing feedback
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Load from Storage on mount
  useEffect(() => {
    setPdfs(storage.getPDFList());
    setCapsules(storage.getCapsules());
    setConnections(storage.getConnections());
  }, [activePdfId]);

  // Dark Mode Sync
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const activePdf = pdfs.find(p => p.id === activePdfId) || null;
  const selectedCapsule = capsules.find(c => c.id === selectedCapsuleId) || null;

  // Sync statistics count for dashboard
  const capsulesCount = capsules.length;
  const connectionsCount = connections.length;
  const flashcardsCount = capsules.reduce((sum, c) => sum + c.flashcards.length, 0);
  const masteredCardsCount = capsules.reduce((sum, c) => sum + c.flashcards.filter(fc => fc.mastered).length, 0);

  // Map of pdfId -> pdfName for Graph labeling
  const pdfNamesMap = pdfs.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {} as Record<string, string>);

  const handleOpenPDF = (pdfId: string, currentList?: PDFDocumentInfo[]) => {
    setActivePdfId(pdfId);
    
    const listToUse = currentList || pdfs;
    // Update last opened timestamp
    const updatedList = listToUse.map(p => 
      p.id === pdfId ? { ...p, lastOpened: new Date().toISOString() } : p
    );
    setPdfs(updatedList);
    storage.savePDFList(updatedList);
  };

  const handleUploadPDF = async (name: string, data: ArrayBuffer) => {
    const newId = `pdf-${Date.now()}`;
    const newPdf: PDFDocumentInfo = {
      id: newId,
      name: name,
      size: data.byteLength,
      uploadedAt: new Date().toISOString(),
      totalPages: 10, // Default estimated or updated during render
      lastOpened: new Date().toISOString(),
      progress: 0,
      pagesRead: [1],
      bookmarks: [],
      toc: [{ title: 'Page 1', page: 1 }]
    };

    try {
      // Save binary file buffer to IndexedDB
      await savePDFFile(newId, data);
      
      const newList = [...pdfs, newPdf];
      
      // Auto-open and pass the fresh list to bypass async state update lag
      handleOpenPDF(newId, newList);
    } catch (err) {
      console.error("PDF File Storage failed", err);
      alert("Failed to upload PDF locally to IndexedDB.");
    }
  };

  const handleDeletePDF = async (pdfId: string) => {
    try {
      // Remove binary
      await deletePDFFile(pdfId);
      
      // Update list
      const newList = pdfs.filter(p => p.id !== pdfId);
      setPdfs(newList);
      storage.savePDFList(newList);

      // Clean up metadata
      const newCapsules = capsules.filter(c => c.pdfId !== pdfId);
      setCapsules(newCapsules);
      storage.saveCapsules(newCapsules);

      const capsuleIds = capsules.filter(c => c.pdfId === pdfId).map(c => c.id);
      const newConnections = connections.filter(conn => 
        !capsuleIds.includes(conn.sourceId) && !capsuleIds.includes(conn.targetId)
      );
      setConnections(newConnections);
      storage.saveConnections(newConnections);
    } catch (err) {
      console.error("PDF deletion failed", err);
    }
  };

  // Text selection handler: Triggers creating a new capsule
  const handleSelectText = (
    text: string, 
    pageNumber: number, 
    rects: { x: number; y: number; width: number; height: number }[]
  ) => {
    if (!activePdfId) return;
    
    setActiveHighlightText(text);

    // Auto numbering: find highest number on this PDF
    const pdfCaps = capsules.filter(c => c.pdfId === activePdfId);
    const nextNum = pdfCaps.length > 0 
      ? Math.max(...pdfCaps.map(c => c.number)) + 1 
      : 1;

    const shortLabel = text.split(' ').slice(0, 3).join(' ') || 'New Concept';

    const newCapsuleId = `capsule-${Date.now()}`;
    const newCapsule: KnowledgeCapsuleItem = {
      id: newCapsuleId,
      pdfId: activePdfId,
      pageNumber: pageNumber,
      label: shortLabel,
      number: nextNum,
      highlightText: text,
      highlightRects: rects,
      notes: `### ${shortLabel}\n\nNotes about this selected text segment:\n> "${text}"`,
      personalUnderstanding: '',
      progressStatus: 'not-started',
      colorCategory: 'yellow',
      versionHistory: [
        {
          version: 1,
          timestamp: new Date().toISOString(),
          notes: 'Capsule initialized from PDF highlight selection.',
          status: 'not-started'
        }
      ],
      flashcards: [],
      references: [],
      latexEquations: [],
      codeSnippets: [],
      tags: ['New-Concept']
    };

    const updatedCapsules = [...capsules, newCapsule];
    setCapsules(updatedCapsules);
    storage.saveCapsules(updatedCapsules);

    setSelectedCapsuleId(newCapsuleId);
    setRightPanel('capsule');
  };

  const handleUpdateCapsule = (updatedCapsule: KnowledgeCapsuleItem) => {
    const updated = capsules.map(c => c.id === updatedCapsule.id ? updatedCapsule : c);
    setCapsules(updated);
    storage.saveCapsules(updated);
  };

  const handleDeleteCapsule = (id: string) => {
    const updated = capsules.filter(c => c.id !== id);
    setCapsules(updated);
    storage.saveCapsules(updated);
    
    // Cleanup graph links referring to this node
    const updatedConns = connections.filter(conn => conn.sourceId !== id && conn.targetId !== id);
    setConnections(updatedConns);
    storage.saveConnections(updatedConns);

    setSelectedCapsuleId(null);
  };

  // Graph Connections Handlers
  const handleAddConnection = (sourceId: string, targetId: string, type: string) => {
    const newConn: KnowledgeGraphConnection = {
      id: `conn-${Date.now()}`,
      sourceId,
      targetId,
      type
    };
    const updated = [...connections, newConn];
    setConnections(updated);
    storage.saveConnections(updated);
  };

  const handleDeleteConnection = (connectionId: string) => {
    const updated = connections.filter(c => c.id !== connectionId);
    setConnections(updated);
    storage.saveConnections(updated);
  };

  // Navigate to capsule from Graph click
  const handleNavigateToCapsule = (capsuleId: string, pdfId: string) => {
    setActivePdfId(pdfId);
    setSelectedCapsuleId(capsuleId);
    setRightPanel('capsule');
    setWorkspaceMode('split');
  };

  // Toggle reading bookmark on a page
  const handleToggleBookmark = (page: number) => {
    if (!activePdf) return;
    const isBookmarked = activePdf.bookmarks.includes(page);
    const newBookmarks = isBookmarked
      ? activePdf.bookmarks.filter(p => p !== page)
      : [...activePdf.bookmarks, page].sort((a, b) => a - b);
    
    const updatedList = pdfs.map(p => 
      p.id === activePdf.id ? { ...p, bookmarks: newBookmarks } : p
    );
    setPdfs(updatedList);
    storage.savePDFList(updatedList);
  };

  // Page read progress tracking handler
  const handlePageRead = (page: number) => {
    if (!activePdf) return;
    if (activePdf.pagesRead.includes(page)) return;

    const newPagesRead = [...activePdf.pagesRead, page];
    const newProgress = Math.round((newPagesRead.length / activePdf.totalPages) * 100);

    const updatedList = pdfs.map(p => 
      p.id === activePdf.id ? { ...p, pagesRead: newPagesRead, progress: newProgress } : p
    );
    setPdfs(updatedList);
    storage.savePDFList(updatedList);
  };

  // Settings handlers
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const handleDocumentLoadSuccess = (numPages: number) => {
    if (!activePdf || activePdf.totalPages === numPages) return;
    const updatedList = pdfs.map(p => 
      p.id === activePdf.id ? { ...p, totalPages: numPages } : p
    );
    setPdfs(updatedList);
    storage.savePDFList(updatedList);
  };

  // Callback when AI returns action results (e.g. auto flashcard creation)
  const handleAISuccessfulAction = (result: AIResult) => {
    if (!selectedCapsule) return;
    
    let updatedCapsule = { ...selectedCapsule };

    // Append flashcards
    if (result.flashcards) {
      const generatedCards = result.flashcards.map((fc: { question: string; answer: string }, i: number) => ({
        id: `fc-ai-${Date.now()}-${i}`,
        question: fc.question,
        answer: fc.answer,
        mastered: false
      }));
      updatedCapsule.flashcards = [...updatedCapsule.flashcards, ...generatedCards];
    }

    // Append citations
    if (result.citation) {
      updatedCapsule.references = [
        ...updatedCapsule.references,
        { citation: result.citation }
      ];
    }

    handleUpdateCapsule(updatedCapsule);
  };

  // Quick Action triggers inside editor
  const handleTriggerAIAction = async (action: 'explain' | 'simplify' | 'mnemonic') => {
    if (!selectedCapsule) return;
    setAiLoading(true);

    try {
      const result = await runAIAction({
        action,
        text: selectedCapsule.highlightText,
        apiKey: settings.apiKey,
        provider: settings.apiProvider
      });

      // Update notes with AI contents append
      const updatedNotes = `${selectedCapsule.notes}\n\n### AI Tutor Explanation (${action.toUpperCase()})\n\n${result.text}`;
      handleUpdateCapsule({
        ...selectedCapsule,
        notes: updatedNotes
      });
    } catch (e) {
      alert("AI tutor failed: " + e);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-[#0c0d12] dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. APP HEADER */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          {activePdfId ? (
            <button
              onClick={() => { setActivePdfId(null); setSelectedCapsuleId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Library</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-indigo-500/10 text-indigo-500 p-1.5 rounded-xl">
                <Layers className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-white">
                Workspace
              </span>
            </div>
          )}
          
          {activePdf && (
            <span className="text-xs text-slate-400 font-semibold line-clamp-1 max-w-[240px]">
              / {activePdf.name.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Global actions: Dark Mode & Workspace layouts */}
        <div className="flex items-center gap-3">
          {activePdfId && (
            <>
              {/* Reading Modes Selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
                {(['clean', 'study', 'research', 'review'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleUpdateSettings({ ...settings, readingMode: mode })}
                    className={`px-3 py-1 rounded-lg text-xs capitalize transition cursor-pointer font-bold ${
                      settings.readingMode === mode
                        ? 'bg-white dark:bg-slate-850 shadow-sm text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* View options Split vs Full Graph vs PDF only */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
                <button
                  onClick={() => setWorkspaceMode('split')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    workspaceMode === 'split' ? 'bg-white dark:bg-slate-850 text-indigo-500' : 'text-slate-450'
                  }`}
                  title="Split Workspace"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setWorkspaceMode('graph-only')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    workspaceMode === 'graph-only' ? 'bg-white dark:bg-slate-850 text-indigo-500' : 'text-slate-450'
                  }`}
                  title="Mind Map Workspace"
                >
                  <Network className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Dark Mode toggle */}
          <button
            onClick={() => handleUpdateSettings({ ...settings, darkMode: !settings.darkMode })}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer text-slate-500 hover:text-indigo-500"
          >
            {settings.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN APP ROUTER */}
      <main className="flex-1 overflow-hidden flex relative">
        
        {/* VIEW A: DASHBOARD VIEW */}
        {!activePdfId && (
          <div className="flex-1 overflow-y-auto">
            <Dashboard
              pdfs={pdfs}
              onOpenPDF={handleOpenPDF}
              onUploadPDF={handleUploadPDF}
              onDeletePDF={handleDeletePDF}
              capsulesCount={capsulesCount}
              connectionsCount={connectionsCount}
              flashcardsCount={flashcardsCount}
              masteredCardsCount={masteredCardsCount}
            />
          </div>
        )}

        {/* VIEW B: RESEARCH STUDY WORKSPACE VIEW */}
        {activePdfId && activePdf && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Outline Left Sidebar */}
            {showLeftSidebar && (
              <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-10 animate-slide-right">
                {/* Bookmarks Section */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5">
                    Saved Bookmarks
                  </span>
                  
                  {activePdf.bookmarks.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No bookmarked pages</p>
                  ) : (
                    <div className="space-y-1">
                      {activePdf.bookmarks.map((b) => (
                        <button
                          key={b}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-50/40 dark:hover:bg-indigo-950/15 text-slate-700 dark:text-slate-350 cursor-pointer"
                        >
                          <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-current" />
                          <span>Page {b}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Table of Contents Section */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3">
                      Table of Contents
                    </span>
                    <div className="space-y-1">
                      {activePdf.toc.map((item, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 line-clamp-2 transition-colors cursor-pointer"
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Split panels layout */}
            <div className="flex-1 flex overflow-hidden relative">
              
              {/* Left pane: PDF Reader Panel */}
              {workspaceMode !== 'graph-only' && (
                <div className="flex-1 h-full p-4 overflow-hidden">
                  <PDFViewer
                    pdfInfo={activePdf}
                    capsules={capsules}
                    readingMode={settings.readingMode}
                    onSelectText={handleSelectText}
                    onSelectCapsule={(id) => { setSelectedCapsuleId(id); setRightPanel('capsule'); }}
                    selectedCapsuleId={selectedCapsuleId}
                    onToggleBookmark={handleToggleBookmark}
                    onPageRead={handlePageRead}
                    onDocumentLoadSuccess={handleDocumentLoadSuccess}
                  />
                </div>
              )}

              {/* Right pane: Capsule Edit OR AI assistant OR Mind Map Graph */}
              {workspaceMode === 'graph-only' ? (
                <div className="flex-1 h-full p-4">
                  <KnowledgeGraph
                    capsules={capsules}
                    connections={connections}
                    pdfNames={pdfNamesMap}
                    onNavigateToCapsule={handleNavigateToCapsule}
                    onAddConnection={handleAddConnection}
                    onDeleteConnection={handleDeleteConnection}
                    activePdfId={activePdfId}
                  />
                </div>
              ) : (
                /* Side Workspace panel Drawer (Split Screen mode) */
                <div className="w-[370px] h-full p-4 pl-0 overflow-hidden flex flex-col gap-3">
                  
                  {/* Tabs select above drawer */}
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/60 text-xs">
                    <button
                      onClick={() => setRightPanel('capsule')}
                      className={`flex-1 py-1 rounded-lg text-center font-bold transition cursor-pointer ${
                        rightPanel === 'capsule'
                          ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-450 hover:text-slate-650'
                      }`}
                    >
                      Capsules ({capsules.filter(c => c.pdfId === activePdfId).length})
                    </button>
                    <button
                      onClick={() => setRightPanel('ai')}
                      className={`flex-1 py-1 rounded-lg text-center font-bold transition cursor-pointer ${
                        rightPanel === 'ai'
                          ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-450 hover:text-slate-650'
                      }`}
                    >
                      AI Assistant
                    </button>
                    <button
                      onClick={() => setRightPanel('graph')}
                      className={`flex-1 py-1 rounded-lg text-center font-bold transition cursor-pointer ${
                        rightPanel === 'graph'
                          ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-450 hover:text-slate-650'
                      }`}
                    >
                      Graph View
                    </button>
                  </div>

                  {/* Panel Drawer Container */}
                  <div className="flex-1 overflow-hidden">
                    {rightPanel === 'capsule' && (
                      selectedCapsule ? (
                        <CapsulePanel
                          capsule={selectedCapsule}
                          onUpdate={handleUpdateCapsule}
                          onDelete={handleDeleteCapsule}
                          onClose={() => setSelectedCapsuleId(null)}
                          onTriggerAIAction={handleTriggerAIAction}
                          aiLoading={aiLoading}
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-inner">
                          <BookOpen className="h-8 w-8 text-slate-350 dark:text-slate-700 animate-pulse mb-3" />
                          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Capsule Selected</h3>
                          <p className="text-[10px] text-slate-450 mt-1 max-w-[200px]">
                            Highlight text to trigger a capsule or click an existing marker in the reader.
                          </p>
                        </div>
                      )
                    )}

                    {rightPanel === 'ai' && (
                      <AISidebar
                        activeHighlightText={selectedCapsule?.highlightText || ''}
                        activeCapsuleLabel={selectedCapsule?.label || ''}
                        settings={settings}
                        onUpdateSettings={handleUpdateSettings}
                        onAISuccessfulAction={handleAISuccessfulAction}
                      />
                    )}

                    {rightPanel === 'graph' && (
                      <KnowledgeGraph
                        capsules={capsules}
                        connections={connections}
                        pdfNames={pdfNamesMap}
                        onNavigateToCapsule={handleNavigateToCapsule}
                        onAddConnection={handleAddConnection}
                        onDeleteConnection={handleDeleteConnection}
                        activePdfId={activePdfId}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
