import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, 
  BookOpen, Eye, EyeOff, CheckCircle, RefreshCw, Bookmark
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { getPDFFile, KnowledgeCapsuleItem, PDFDocumentInfo } from '../utils/storage';
import { SAMPLE_PDF_ID } from '../utils/sampleData';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFViewerProps {
  pdfInfo: PDFDocumentInfo;
  capsules: KnowledgeCapsuleItem[];
  readingMode: 'clean' | 'study' | 'research' | 'review';
  onSelectText: (text: string, pageNumber: number, rects: { x: number; y: number; width: number; height: number }[]) => void;
  onSelectCapsule: (capsuleId: string) => void;
  selectedCapsuleId: string | null;
  onToggleBookmark: (page: number) => void;
  onPageRead: (page: number) => void;
  onDocumentLoadSuccess?: (numPages: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfInfo,
  capsules,
  readingMode,
  onSelectText,
  onSelectCapsule,
  selectedCapsuleId,
  onToggleBookmark,
  onPageRead,
  onDocumentLoadSuccess
}) => {
  const [numPages, setNumPages] = useState<number>(pdfInfo.totalPages);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredCapsule, setHoveredCapsule] = useState<KnowledgeCapsuleItem | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSample = pdfInfo.id === SAMPLE_PDF_ID;

  // Load PDF file from IndexedDB
  useEffect(() => {
    if (isSample) return;
    
    const loadFile = async () => {
      setLoading(true);
      try {
        const data = await getPDFFile(pdfInfo.id);
        setPdfData(data);
      } catch (err) {
        console.error("Failed to load PDF file from DB", err);
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [pdfInfo.id, isSample]);

  // Page read tracking
  useEffect(() => {
    onPageRead(currentPage);
  }, [currentPage]);

  // Render PDF page using PDF.js
  useEffect(() => {
    if (isSample || !pdfData || !canvasRef.current) return;

    let renderTask: any = null;
    const renderPage = async () => {
      try {
        const loadingTask = pdfjs.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);
        if (onDocumentLoadSuccess) {
          onDocumentLoadSuccess(pdf.numPages);
        }
        
        const page = await pdf.getPage(currentPage);
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;

        // Render text layer overlay for selection
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;

          const textContent = await page.getTextContent();
          const textLayer = new pdfjs.TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport
          });
          await textLayer.render();
        }
      } catch (err) {
        console.error("Error rendering PDF page", err);
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfData, currentPage, scale, isSample]);

  // Handle Text Selection in Document
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    // Check if the selection is inside our document container
    const isInsideContainer = containerRef.current?.contains(range.commonAncestorContainer);
    if (!isInsideContainer) return;

    // Get selection client rects to position the highlight overlay
    const rects: { x: number; y: number; width: number; height: number }[] = [];
    const clientRects = range.getClientRects();
    const containerRect = containerRef.current!.getBoundingClientRect();

    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      rects.push({
        x: r.left - containerRect.left,
        y: r.top - containerRect.top + containerRef.current!.scrollTop,
        width: r.width,
        height: r.height
      });
    }

    if (rects.length > 0) {
      onSelectText(selectedText, currentPage, rects);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-started': return '#94a3b8'; // Slate
      case 'learning': return '#f59e0b'; // Amber/Yellow
      case 'partial': return '#f97316'; // Orange
      case 'understood': return '#3b82f6'; // Blue
      case 'mastered': return '#10b981'; // Emerald/Green
      default: return '#94a3b8';
    }
  };

  const getStatusTailwindColor = (status: string) => {
    switch (status) {
      case 'not-started': return 'text-slate-400 border-slate-300';
      case 'learning': return 'text-amber-500 border-amber-400';
      case 'partial': return 'text-orange-500 border-orange-400';
      case 'understood': return 'text-blue-500 border-blue-400';
      case 'mastered': return 'text-emerald-500 border-emerald-400';
      default: return 'text-slate-400 border-slate-300';
    }
  };

  const getCategoryColorClass = (cat: string) => {
    switch (cat) {
      case 'yellow': return 'hl-yellow';
      case 'blue': return 'hl-blue';
      case 'green': return 'hl-green';
      case 'purple': return 'hl-purple';
      case 'red': return 'hl-red';
      case 'orange': return 'hl-orange';
      default: return 'hl-yellow';
    }
  };

  // Filter capsules by page and reading mode filter
  const pageCapsules = capsules.filter(c => {
    if (c.pdfId !== pdfInfo.id) return false;
    if (c.pageNumber !== currentPage) return false;
    
    // In Review Mode, hide mastered concepts to focus only on incomplete/struggling items
    if (readingMode === 'review') {
      return c.progressStatus !== 'mastered';
    }
    
    return true;
  });

  const handleMarkerHover = (e: React.MouseEvent, capsule: KnowledgeCapsuleItem) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    setHoverPosition({
      x: rect.left - containerRect.left + 24,
      y: rect.top - containerRect.top + containerRef.current!.scrollTop - 40
    });
    setHoveredCapsule(capsule);
  };

  const handleMarkerLeave = () => {
    setHoveredCapsule(null);
  };

  // Render pre-packaged interactive sample
  const renderSampleContent = () => {
    // 4 Pages of Mock Scientific Paper
    if (currentPage === 1) {
      return (
        <div className="prose dark:prose-invert max-w-none px-12 py-10">
          <div className="text-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white leading-tight mb-2">
              Pathological Mechanisms of Alzheimer's Disease: Tau Hyperphosphorylation and Amyloid-Beta Cascades
            </h1>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Department of Neurobiology, Brain Research Institute | Published 2026
            </p>
          </div>

          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 mb-2">1. Abstract & Introduction</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Alzheimer's Disease (AD) is characterized pathologically by extracellular amyloid-beta deposits and intracellular neurofibrillary tangles. While these pathological marks have been documented for decades, the precise molecular kinetics coupling amyloid cleavages to cellular transport collapse remain under active debate. Understanding the biochemical switches that regulate synapse viability is paramount to developing successful disease-modifying therapies.
          </p>

          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-8 mb-2">2. The Role of Tau Hyperphosphorylation</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 relative">
            Neurons maintain a complex polar shape supported by an internal skeleton. Under physiological conditions, healthy tau protein binds to tubulin monomers, promoting microtubule polymerization. However, in pathological states, excess kinase activation alters tau folding. Specifically, 
            <span 
              onClick={() => onSelectCapsule('capsule-1')}
              className={`pdf-highlight hl-yellow font-medium transition cursor-pointer px-1 rounded ${
                selectedCapsuleId === 'capsule-1' ? 'ring-2 ring-indigo-500' : ''
              } ${readingMode === 'clean' ? 'bg-transparent text-slate-600 dark:text-slate-400 p-0 font-normal cursor-text' : ''}`}
            >
              Tau hyperphosphorylation destabilizes microtubules, disrupting axonal transport.
            </span>
            {readingMode !== 'clean' && (
              <span 
                className="inline-flex items-center justify-center ml-1 select-none relative group/marker cursor-pointer align-middle"
                onClick={(e) => { e.stopPropagation(); onSelectCapsule('capsule-1'); }}
                onMouseEnter={(e) => handleMarkerHover(e, capsules.find(c => c.id === 'capsule-1')!)}
                onMouseLeave={handleMarkerLeave}
              >
                {/* SVG Progress Ring */}
                <svg className="w-5 h-5 flex items-center justify-center">
                  <circle cx="10" cy="10" r="7" className="stroke-slate-200 dark:stroke-slate-800 fill-none" strokeWidth="2.5" />
                  <circle 
                    cx="10" cy="10" r="7" 
                    className="progress-ring-circle fill-none transition-all duration-300" 
                    stroke={getStatusColor(capsules.find(c => c.id === 'capsule-1')?.progressStatus || 'learning')}
                    strokeWidth="2.5" 
                    strokeDasharray={2 * Math.PI * 7}
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.4)} // 40% complete circle
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-slate-800 dark:text-slate-200">①</span>
              </span>
            )}
            {" "}
            This disruption halts the flow of essential organelles, including vesicles containing trophic factors and mitochondria, to synapses located up to a meter away from the cell body. Without these resources, terminals go through synaptic pruning and cellular apoptosis.
          </p>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Recent studies have focused on Glycogen Synthase Kinase 3 Beta (GSK-3β) and Cyclin-Dependent Kinase 5 (CDK5) as key drivers. Aberrant calcium entry activates calpain, which cleaves CDK5's regulatory subunit p35 to the hyperactive p25 form, causing prolonged tau phosphorylation.
          </p>
        </div>
      );
    }
    
    if (currentPage === 2) {
      return (
        <div className="prose dark:prose-invert max-w-none px-12 py-10">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">3. Amyloid-Beta Accumulation & Synaptic Toxicity</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            The processing of amyloid precursor protein (APP) determines whether toxic peptides accumulate. The amyloidogenic pathway requires initial cutting by beta-secretase (BACE1), followed by the gamma-secretase complex.
          </p>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Physiologically, alpha-secretase cleaves within the amyloid-beta sequence, producing a neuroprotective soluble APP alpha fragment. Under disease conditions, the balance shifts towards BACE1 cutting. Consequently,
            {" "}
            <span 
              onClick={() => onSelectCapsule('capsule-2')}
              className={`pdf-highlight hl-blue font-medium transition cursor-pointer px-1 rounded ${
                selectedCapsuleId === 'capsule-2' ? 'ring-2 ring-indigo-500' : ''
              } ${readingMode === 'clean' ? 'bg-transparent text-slate-600 dark:text-slate-400 p-0 font-normal cursor-text' : ''}`}
            >
              Amyloid-beta plaques accumulate extracellularly, inducing synaptic depression.
            </span>
            {readingMode !== 'clean' && (
              <span 
                className="inline-flex items-center justify-center ml-1 select-none relative group/marker cursor-pointer align-middle"
                onClick={(e) => { e.stopPropagation(); onSelectCapsule('capsule-2'); }}
                onMouseEnter={(e) => handleMarkerHover(e, capsules.find(c => c.id === 'capsule-2')!)}
                onMouseLeave={handleMarkerLeave}
              >
                <svg className="w-5 h-5 flex items-center justify-center">
                  <circle cx="10" cy="10" r="7" className="stroke-slate-200 dark:stroke-slate-800 fill-none" strokeWidth="2.5" />
                  <circle 
                    cx="10" cy="10" r="7" 
                    className="progress-ring-circle fill-none" 
                    stroke={getStatusColor(capsules.find(c => c.id === 'capsule-2')?.progressStatus || 'understood')}
                    strokeWidth="2.5" 
                    strokeDasharray={2 * Math.PI * 7}
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.75)} // 75% complete circle
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-slate-800 dark:text-slate-200">②</span>
              </span>
            )}
            {" "}
            It is critical to note that while plaques are highly visible diagnostic features, soluble Aβ oligomers represent the primary cytotoxic elements. These oligomers bind to NMDA receptors, triggering excess calcium influx and downstream calcineurin activation.
          </p>

          <div className="my-6 p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl text-center">
            <span className="text-xs font-semibold text-slate-400 block uppercase mb-1">Figure 1.1: APP Cleavage pathways</span>
            <div className="h-28 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center text-xs text-slate-400">
              [Diagram: APP → Alpha Cleavage (Non-toxic) vs. Beta/Gamma Cleavage (Aβ42 Oligomers)]
            </div>
          </div>
        </div>
      );
    }

    if (currentPage === 3) {
      return (
        <div className="prose dark:prose-invert max-w-none px-12 py-10">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">4. Mitochondrial Dysfunction & Oxidative Stress</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Neurons are heavily dependent on mitochondrial ATP production due to high energy costs of synaptic transmission and active ion transport. In AD, mitochondrial health declines long before large aggregates appear.
          </p>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Electron Transport Chain enzymes (ETC) are vulnerable to direct damage by oligomeric beta-amyloid. In particular, binding to Aβ-binding alcohol dehydrogenase (ABAD) disrupts dehydrogenase function. Thus,
            {" "}
            <span 
              onClick={() => onSelectCapsule('capsule-3')}
              className={`pdf-highlight hl-orange font-medium transition cursor-pointer px-1 rounded ${
                selectedCapsuleId === 'capsule-3' ? 'ring-2 ring-indigo-500' : ''
              } ${readingMode === 'clean' ? 'bg-transparent text-slate-600 dark:text-slate-400 p-0 font-normal cursor-text' : ''}`}
            >
              Mitochondrial dysfunction leads to the overproduction of reactive oxygen species (ROS), causing oxidative damage.
            </span>
            {readingMode !== 'clean' && (
              <span 
                className="inline-flex items-center justify-center ml-1 select-none relative group/marker cursor-pointer align-middle"
                onClick={(e) => { e.stopPropagation(); onSelectCapsule('capsule-3'); }}
                onMouseEnter={(e) => handleMarkerHover(e, capsules.find(c => c.id === 'capsule-3')!)}
                onMouseLeave={handleMarkerLeave}
              >
                <svg className="w-5 h-5 flex items-center justify-center">
                  <circle cx="10" cy="10" r="7" className="stroke-slate-200 dark:stroke-slate-800 fill-none" strokeWidth="2.5" />
                  <circle 
                    cx="10" cy="10" r="7" 
                    className="progress-ring-circle fill-none" 
                    stroke={getStatusColor(capsules.find(c => c.id === 'capsule-3')?.progressStatus || 'partial')}
                    strokeWidth="2.5" 
                    strokeDasharray={2 * Math.PI * 7}
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.5)} // 50% complete circle
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-slate-800 dark:text-slate-200">③</span>
              </span>
            )}
            {" "}
            The buildup of free radicals oxidizes intracellular lipids, membrane proteins, and mitochondrial DNA. The oxidative stress leads to lipid peroxidation, which compromises the electrical barrier of the cell membrane and leads to massive leaks, causing a collapse in cellular voltage.
          </p>
        </div>
      );
    }

    if (currentPage === 4) {
      return (
        <div className="prose dark:prose-invert max-w-none px-12 py-10">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">5. Clinical Diagnostic Biomarkers</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Early clinical diagnostics of AD are moving towards physiological neural signaling tests. Cognitive networks require highly coordinated firing between cortical hubs.
          </p>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Recent studies have used EEG recordings to look for changes in network dynamics during working memory tasks. As synapses degrade, synchronization between the prefrontal cortex and the hippocampus decays. As a direct indicator,
            {" "}
            <span 
              onClick={() => onSelectCapsule('capsule-4')}
              className={`pdf-highlight hl-red font-medium transition cursor-pointer px-1 rounded ${
                selectedCapsuleId === 'capsule-4' ? 'ring-2 ring-indigo-500' : ''
              } ${readingMode === 'clean' ? 'bg-transparent text-slate-600 dark:text-slate-400 p-0 font-normal cursor-text' : ''}`}
            >
              Electroencephalography (EEG) shows decreased coherence in the gamma band.
            </span>
            {readingMode !== 'clean' && (
              <span 
                className="inline-flex items-center justify-center ml-1 select-none relative group/marker cursor-pointer align-middle"
                onClick={(e) => { e.stopPropagation(); onSelectCapsule('capsule-4'); }}
                onMouseEnter={(e) => handleMarkerHover(e, capsules.find(c => c.id === 'capsule-4')!)}
                onMouseLeave={handleMarkerLeave}
              >
                <svg className="w-5 h-5 flex items-center justify-center">
                  <circle cx="10" cy="10" r="7" className="stroke-slate-200 dark:stroke-slate-800 fill-none" strokeWidth="2.5" />
                  <circle 
                    cx="10" cy="10" r="7" 
                    className="progress-ring-circle fill-none" 
                    stroke={getStatusColor(capsules.find(c => c.id === 'capsule-4')?.progressStatus || 'not-started')}
                    strokeWidth="2.5" 
                    strokeDasharray={2 * Math.PI * 7}
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.1)} // 10% complete circle
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-slate-800 dark:text-slate-200">④</span>
              </span>
            )}
            {" "}
            This reduction in gamma coherence (30–80 Hz) points to a loss of synaptic integrity in local cortical networks, which serves as a highly sensitive biomarker for pre-symptomatic cognitive decline.
          </p>
        </div>
      );
    }
  };

  const hasBookmark = pdfInfo.bookmarks.includes(currentPage);

  return (
    <div className="flex flex-col h-full bg-slate-100/40 dark:bg-[#0f1118]/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-inner relative">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[200px]">
            {pdfInfo.name.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-semibold uppercase">
            Mode: {readingMode}
          </span>
        </div>

        {/* Navigation & Zoom controls */}
        <div className="flex items-center gap-3">
          {/* Page nav */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
            <button 
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-slate-500">
              {currentPage} / {numPages}
            </span>
            <button 
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage(prev => Math.min(numPages, prev + 1))}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Scale controls (only for real PDFs) */}
          {!isSample && (
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-3">
              <button 
                onClick={() => setScale(prev => Math.max(0.6, prev - 0.1))}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-semibold text-slate-500 w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => setScale(prev => Math.min(2.5, prev + 0.1))}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Bookmark Button */}
          <button
            onClick={() => onToggleBookmark(currentPage)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              hasBookmark 
                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title={hasBookmark ? "Remove Bookmark" : "Add Bookmark"}
          >
            <Bookmark className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Main Document View Canvas */}
      <div 
        ref={containerRef}
        onMouseUp={handleTextSelection}
        className="flex-1 overflow-y-auto flex justify-center p-6 bg-slate-50/50 dark:bg-slate-950/20"
      >
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden max-w-2xl w-full self-start">
          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-25">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Rendering PDF page...</span>
              </div>
            </div>
          )}

          {/* 1. MOCK SAMPLE RENDERER */}
          {isSample && renderSampleContent()}

          {/* 2. REAL PDF RENDERER (Canvas + TextLayer) */}
          {!isSample && (
            <div className="relative select-text" style={{ width: canvasRef.current?.width || '100%', height: canvasRef.current?.height || 'auto' }}>
              <canvas ref={canvasRef} className="block select-none" />
              <div ref={textLayerRef} className="textLayer" />
              
              {/* Highlight overlays & markers on real PDF. Coordinates must scale with PDF.js */}
              {readingMode !== 'clean' && pageCapsules.map((capsule) => {
                const isSelected = selectedCapsuleId === capsule.id;
                return (
                  <div key={capsule.id} className="absolute inset-0 pointer-events-none">
                    {/* Draw high-fidelity highlight rectangles over text */}
                    {capsule.highlightRects.map((rect, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCapsule(capsule.id);
                        }}
                        className={`absolute pdf-highlight ${getCategoryColorClass(capsule.colorCategory)} pointer-events-auto ${
                          isSelected ? 'ring-2 ring-indigo-500' : ''
                        }`}
                        style={{
                          left: `${rect.x * scale}px`,
                          top: `${rect.y * scale}px`,
                          width: `${rect.width * scale}px`,
                          height: `${rect.height * scale}px`
                        }}
                      />
                    ))}

                    {/* Draw marker at the end of the last rectangle */}
                    {capsule.highlightRects.length > 0 && (() => {
                      const lastRect = capsule.highlightRects[capsule.highlightRects.length - 1];
                      const markerX = (lastRect.x + lastRect.width) * scale;
                      const markerY = lastRect.y * scale;

                      return (
                        <div
                          className="absolute pointer-events-auto z-10 select-none cursor-pointer flex items-center justify-center"
                          style={{
                            left: `${markerX + 4}px`,
                            top: `${markerY - 2}px`
                          }}
                          onClick={() => onSelectCapsule(capsule.id)}
                          onMouseEnter={(e) => handleMarkerHover(e, capsule)}
                          onMouseLeave={handleMarkerLeave}
                        >
                          <svg className="w-5 h-5">
                            <circle cx="10" cy="10" r="7" className="stroke-slate-200 dark:stroke-slate-800 fill-none" strokeWidth="2.5" />
                            <circle 
                              cx="10" cy="10" r="7" 
                              className="progress-ring-circle fill-none" 
                              stroke={getStatusColor(capsule.progressStatus)}
                              strokeWidth="2.5" 
                              strokeDasharray={2 * Math.PI * 7}
                              strokeDashoffset={2 * Math.PI * 7 * (1 - (capsule.progressStatus === 'mastered' ? 1.0 : capsule.progressStatus === 'understood' ? 0.75 : capsule.progressStatus === 'partial' ? 0.5 : capsule.progressStatus === 'learning' ? 0.25 : 0))}
                            />
                          </svg>
                          <span className="absolute text-[8px] font-bold text-slate-850 dark:text-slate-100">{capsule.number}</span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* Text selection indicator tooltip helper */}
          <div className="absolute bottom-4 right-4 bg-slate-900/90 text-white text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-md pointer-events-none select-none z-10 opacity-70">
            <BookOpen className="h-3 w-3 text-indigo-400" />
            <span>Highlight text to create a Capsule</span>
          </div>
        </div>

        {/* Hover Quick Preview Card */}
        {hoveredCapsule && (
          <div 
            className="absolute z-30 w-72 glass-panel p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 pointer-events-none animate-scale-up"
            style={{
              left: `${hoverPosition.x}px`,
              top: `${hoverPosition.y}px`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusTailwindColor(hoveredCapsule.progressStatus)}`}>
                <CheckCircle className="h-3 w-3" />
                {hoveredCapsule.progressStatus.replace('-', ' ').toUpperCase()}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Capsule {hoveredCapsule.number}
              </span>
            </div>
            
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
              <span>{hoveredCapsule.number}.</span>
              <span>{hoveredCapsule.label || 'Untitled'}</span>
            </h4>
            
            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {hoveredCapsule.notes.replace(/[#*`_-]/g, '').trim()}
            </p>
            
            {hoveredCapsule.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {hoveredCapsule.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
