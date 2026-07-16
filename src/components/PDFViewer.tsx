import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, 
  BookOpen, CheckCircle, RefreshCw, Bookmark, X,
  PenTool, Eraser, Highlighter, Edit3
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { 
  getPDFFile, KnowledgeCapsuleItem, PDFDocumentInfo,
  DrawingStroke, DrawingPoint, getPageDrawings, savePageDrawings 
} from '../utils/storage';
import { SAMPLE_PDF_ID } from '../utils/sampleData';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// 1. MODULE FOR PERSISTING AND RENDERING VECTOR DRAWING STROKES (Stylus & Finger Markup)
interface PageDrawingCanvasProps {
  pdfId: string;
  pageNumber: number;
  scale: number;
  pencilMode: boolean;
  activeTool: 'pen' | 'highlighter' | 'eraser';
  activeColor: string;
  activeWidth: number;
  dimensions?: { width: number; height: number };
}

const PageDrawingCanvas: React.FC<PageDrawingCanvasProps> = ({
  pdfId,
  pageNumber,
  scale,
  pencilMode,
  activeTool,
  activeColor,
  activeWidth,
  dimensions
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const strokesRef = useRef<DrawingStroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<DrawingPoint[]>([]);

  // Load strokes on mount or page change
  useEffect(() => {
    strokesRef.current = getPageDrawings(pdfId, pageNumber);
    drawStrokes();
  }, [pdfId, pageNumber]);

  // Prevent mobile browser scrolling and default touch behaviors when pencilMode is active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefault = (e: TouchEvent) => {
      if (pencilMode) {
        e.preventDefault();
      }
    };

    // Add native listeners with passive: false to force preventDefault support on mobile browsers
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
    };
  }, [pencilMode]);

  // Adjust dimensions dynamically
  useEffect(() => {
    if (dimensions) {
      setPageSize(dimensions);
    } else if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        // Measure parent element (used for mock sample HTML layout fit)
        setPageSize({ width: parent.clientWidth, height: parent.clientHeight });
      }
    }
  }, [dimensions, scale]);

  // Set backing canvas size scaled by DPR for Retina crispness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pageSize.width || !pageSize.height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = pageSize.width * dpr;
    canvas.height = pageSize.height * dpr;
    canvas.style.width = `${pageSize.width}px`;
    canvas.style.height = `${pageSize.height}px`;

    drawStrokes();
  }, [pageSize, scale]);

  // Render all vector strokes onto the drawing canvas
  const drawStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    strokesRef.current.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      context.beginPath();
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        context.globalAlpha = 0.45;
        context.globalCompositeOperation = 'multiply';
      } else {
        context.globalAlpha = 1.0;
        context.globalCompositeOperation = 'source-over';
      }

      const points = stroke.points;
      context.moveTo(points[0].x * scale, points[0].y * scale);
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i].x * scale, points[i].y * scale);
      }
      context.stroke();
    });

    // Reset properties to default
    context.globalAlpha = 1.0;
    context.globalCompositeOperation = 'source-over';
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pencilMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    currentPointsRef.current = [{ x, y }];

    const context = canvas.getContext('2d');
    if (context && activeTool !== 'eraser') {
      const dpr = window.devicePixelRatio || 1;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.beginPath();
      context.strokeStyle = activeColor;
      context.lineWidth = activeWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.globalAlpha = activeTool === 'highlighter' ? 0.45 : 1.0;
      context.globalCompositeOperation = activeTool === 'highlighter' ? 'multiply' : 'source-over';
      context.moveTo(x * scale, y * scale);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !pencilMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const points = currentPointsRef.current;
    if (points.length === 0) return;
    const lastPoint = points[points.length - 1];

    if (Math.hypot(x - lastPoint.x, y - lastPoint.y) < 1) return;

    points.push({ x, y });

    const context = canvas.getContext('2d');
    if (context && activeTool !== 'eraser') {
      context.lineTo(x * scale, y * scale);
      context.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (currentPointsRef.current.length >= 2) {
      if (activeTool === 'eraser') {
        eraseStrokes(currentPointsRef.current);
      } else {
        const newStroke: DrawingStroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
          color: activeColor,
          width: activeWidth,
          points: currentPointsRef.current
        };
        const updated = [...strokesRef.current, newStroke];
        strokesRef.current = updated;
        savePageDrawings(pdfId, pageNumber, updated);
        drawStrokes();
      }
    }
    currentPointsRef.current = [];
  };

  const eraseStrokes = (eraserPoints: DrawingPoint[]) => {
    const threshold = 18; // Eraser radius range
    const updated = strokesRef.current.filter((stroke) => {
      // Retain strokes that DO NOT intersect with the eraser's sweep path
      return !stroke.points.some((p1) => 
        eraserPoints.some((p2) => 
          Math.hypot(p1.x - p2.x, p1.y - p2.y) < threshold
        )
      );
    });

    if (updated.length !== strokesRef.current.length) {
      strokesRef.current = updated;
      savePageDrawings(pdfId, pageNumber, updated);
      drawStrokes();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 z-15 ${pencilMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <canvas 
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`block select-none ${pencilMode ? 'pointer-events-auto cursor-crosshair touch-none' : 'pointer-events-none'}`}
        style={{
          width: pageSize.width ? `${pageSize.width}px` : '100%',
          height: pageSize.height ? `${pageSize.height}px` : '100%',
        }}
      />
    </div>
  );
};

// 2. MODULE FOR RENDERING A SINGLE PAGE CANVAS OF A REAL PDF
interface PageCanvasProps {
  pdf: any; // PDFDocumentProxy
  pageNumber: number;
  scale: number;
  readingMode: 'clean' | 'study' | 'research' | 'review';
  capsules: KnowledgeCapsuleItem[];
  selectedCapsuleId: string | null;
  onSelectCapsule: (id: string) => void;
  onMarkerHover: (e: React.MouseEvent, capsule: KnowledgeCapsuleItem) => void;
  onMarkerLeave: () => void;
  onSelectTextReady: (text: string, pageNumber: number, rects: { x: number; y: number; width: number; height: number }[], range: Range) => void;
  
  // Drawing Stylus mode configs
  pdfId: string;
  pencilMode: boolean;
  activeTool: 'pen' | 'highlighter' | 'eraser';
  activeColor: string;
  activeWidth: number;
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  pdf,
  pageNumber,
  scale,
  readingMode,
  capsules,
  selectedCapsuleId,
  onSelectCapsule,
  onMarkerHover,
  onMarkerLeave,
  onSelectTextReady,
  pdfId,
  pencilMode,
  activeTool,
  activeColor,
  activeWidth
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let renderTask: any = null;
    const renderPage = async () => {
      setLoading(true);
      try {
        const page = await pdf.getPage(pageNumber);
        
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });
        
        setPageSize({ width: viewport.width, height: viewport.height });

        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;

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
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error("Error rendering PDF page " + pageNumber, err);
        }
      } finally {
        setLoading(false);
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, scale]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim() || pencilMode) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    const isInsideContainer = containerRef.current?.contains(range.commonAncestorContainer);
    if (!isInsideContainer) return;

    const rects: { x: number; y: number; width: number; height: number }[] = [];
    const clientRects = range.getClientRects();
    const containerRect = containerRef.current!.getBoundingClientRect();

    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      rects.push({
        x: (r.left - containerRect.left) / scale,
        y: (r.top - containerRect.top) / scale,
        width: r.width / scale,
        height: r.height / scale
      });
    }

    if (rects.length > 0) {
      onSelectTextReady(selectedText, pageNumber, rects, range);
    }
  };

  const pageCapsules = capsules.filter(c => {
    if (c.pageNumber !== pageNumber) return false;
    if (readingMode === 'review') {
      return c.progressStatus !== 'mastered';
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-started': return '#94a3b8';
      case 'learning': return '#f59e0b';
      case 'partial': return '#f97316';
      case 'understood': return '#3b82f6';
      case 'mastered': return '#10b981';
      default: return '#94a3b8';
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

  return (
    <div 
      ref={containerRef}
      onMouseUp={handleTextSelection}
      className="relative select-text bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden mx-auto" 
      style={{ 
        width: pageSize.width ? `${pageSize.width}px` : '100%', 
        height: pageSize.height ? `${pageSize.height}px` : 'auto',
        minHeight: pageSize.height ? `${pageSize.height}px` : '500px'
      }}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 flex items-center justify-center z-25">
          <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className="block select-none" />
      <div ref={textLayerRef} className="textLayer" />
      
      {readingMode !== 'clean' && pageCapsules.map((capsule) => {
        const isSelected = selectedCapsuleId === capsule.id;
        return (
          <div key={capsule.id} className="absolute inset-0 pointer-events-none">
            {capsule.highlightRects.map((rect, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCapsule(capsule.id);
                }}
                className={`absolute pdf-highlight ${getCategoryColorClass(capsule.colorCategory)} pointer-events-auto cursor-pointer ${
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

            {capsule.highlightRects.length > 0 && (() => {
              const lastRect = capsule.highlightRects[capsule.highlightRects.length - 1];
              const markerX = (lastRect.x + lastRect.width) * scale;
              const markerY = lastRect.y * scale;

              return (
                <div
                  className="absolute pointer-events-auto z-10 select-none cursor-pointer flex items-center justify-center animate-scale-up"
                  style={{
                    left: `${markerX + 4}px`,
                    top: `${markerY - 2}px`
                  }}
                  onClick={() => onSelectCapsule(capsule.id)}
                  onMouseEnter={(e) => onMarkerHover(e, capsule)}
                  onMouseLeave={onMarkerLeave}
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
                  <span className="absolute text-[8px] font-bold text-slate-800 dark:text-slate-100">{capsule.number}</span>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* Persistence Stylus Drawing Layer */}
      <PageDrawingCanvas
        pdfId={pdfId}
        pageNumber={pageNumber}
        scale={scale}
        pencilMode={pencilMode}
        activeTool={activeTool}
        activeColor={activeColor}
        activeWidth={activeWidth}
        dimensions={pageSize.width && pageSize.height ? pageSize : undefined}
      />
    </div>
  );
};

// 3. MAIN FLOW READER CONTAINER (WITH CONTAINER-FIT & MARKUP TOOLS)
interface PDFViewerProps {
  pdfInfo: PDFDocumentInfo;
  capsules: KnowledgeCapsuleItem[];
  readingMode: 'clean' | 'study' | 'research' | 'review';
  onSelectText: (text: string, pageNumber: number, rects: { x: number; y: number; width: number; height: number }[], label: string, color: string) => void;
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
  const [scale, setScale] = useState<number>(1.1); 
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredCapsule, setHoveredCapsule] = useState<KnowledgeCapsuleItem | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating markup settings
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  const [drawingTool, setDrawingTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [drawingColor, setDrawingColor] = useState<string>('#6366f1'); // default: Indigo
  const [drawingWidth, setDrawingWidth] = useState<number>(3.5);

  // Floating Creator Dialog State
  const [activeSelection, setActiveSelection] = useState<{
    text: string;
    pageNumber: number;
    rects: { x: number; y: number; width: number; height: number }[];
    x: number;
    y: number;
  } | null>(null);
  const [newCapsuleLabel, setNewCapsuleLabel] = useState('');
  const [newCapsuleColor, setNewCapsuleColor] = useState('yellow');

  const containerRef = useRef<HTMLDivElement>(null);
  const isSample = pdfInfo.id === SAMPLE_PDF_ID;

  // Sync stroke width to tool changes
  useEffect(() => {
    if (drawingTool === 'pen') {
      setDrawingWidth(3.5);
    } else if (drawingTool === 'highlighter') {
      setDrawingWidth(18);
    }
  }, [drawingTool]);

  // Fit scale helper matching container width
  const fitScaleToContainer = async (width: number, pdfDoc = pdfDocument) => {
    if (!pdfDoc) return;
    const isClientWidth = containerRef.current && width === containerRef.current.clientWidth;
    const containerWidth = width - (isClientWidth ? 72 : 24); // Subtract padding + scrollbar margin for clientWidth, or just scrollbar margin for contentRect
    if (containerWidth <= 0) return;

    try {
      const page = await pdfDoc.getPage(1);
      const originalViewport = page.getViewport({ scale: 1.0 });
      const fittedScale = containerWidth / originalViewport.width;
      setScale(Math.max(0.4, Math.min(2.0, fittedScale)));
    } catch (err) {
      console.error("Failed to fit scale", err);
    }
  };

  // Load PDF file from IndexedDB
  useEffect(() => {
    setPdfDocument(null);
    setPdfData(null);
    setActiveSelection(null);
    setIsAutoFit(true);
    setPencilMode(false);
    if (isSample) return;
    
    const loadFile = async () => {
      setLoading(true);
      try {
        const data = await getPDFFile(pdfInfo.id);
        setPdfData(data);
        
        if (data) {
          const loadingTask = pdfjs.getDocument({ data });
          const pdf = await loadingTask.promise;
          setPdfDocument(pdf);
          setNumPages(pdf.numPages);
          
          if (onDocumentLoadSuccess) {
            onDocumentLoadSuccess(pdf.numPages);
          }
          
          if (containerRef.current) {
            await fitScaleToContainer(containerRef.current.clientWidth, pdf);
          }
        }
      } catch (err) {
        console.error("Failed to load PDF file", err);
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [pdfInfo.id, isSample]);

  // ResizeObserver: fits scale on toggles or screen rotations
  useEffect(() => {
    if (isSample || !pdfDocument || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!isAutoFit) return;

      for (let entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          fitScaleToContainer(width);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [pdfDocument, isSample, isAutoFit]);

  // Page read tracking
  useEffect(() => {
    onPageRead(currentPage);
  }, [currentPage]);

  // Detect current page on scroll
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const pageElements = container.querySelectorAll('[data-page]');
    if (pageElements.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const viewportCenter = containerRect.top + containerRect.height / 2;

    let closestPage = 1;
    let minDistance = Infinity;

    pageElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const pageCenter = rect.top + rect.height / 2;
      const distance = Math.abs(viewportCenter - pageCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestPage = parseInt(el.getAttribute('data-page') || '1');
      }
    });

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  };

  const scrollToPage = (pageNumber: number) => {
    const container = containerRef.current;
    if (!container) return;

    const targetEl = container.querySelector(`[data-page="${pageNumber}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNumber);
    }
  };

  const handleSelectTextReady = (
    text: string, 
    pageNumber: number, 
    rects: { x: number; y: number; width: number; height: number }[],
    range: Range
  ) => {
    if (pencilMode) return; // Disable text annotations while stylus is writing
    const container = containerRef.current;
    if (!container) return;

    const selectionRect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const tooltipX = selectionRect.left - containerRect.left + container.scrollLeft + (selectionRect.width / 2) - 128;
    const tooltipY = selectionRect.top - containerRect.top + container.scrollTop;

    setActiveSelection({
      text,
      pageNumber,
      rects,
      x: Math.max(10, Math.min(container.clientWidth - 270, tooltipX)),
      y: tooltipY
    });
    setNewCapsuleLabel('');
    setNewCapsuleColor('yellow');
  };

  const handleConfirmCreateCapsule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeSelection) return;

    const label = newCapsuleLabel.trim() || 'Concept';
    onSelectText(
      activeSelection.text,
      activeSelection.pageNumber,
      activeSelection.rects,
      label,
      newCapsuleColor
    );
    setActiveSelection(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-started': return '#94a3b8';
      case 'learning': return '#f59e0b';
      case 'partial': return '#f97316';
      case 'understood': return '#3b82f6';
      case 'mastered': return '#10b981';
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

  // Selection handler for sample HTML view
  const handleSampleTextSelection = (pageNumber: number) => {
    if (pencilMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    const rects: { x: number; y: number; width: number; height: number }[] = [];
    const clientRects = range.getClientRects();
    
    const pageEl = containerRef.current?.querySelector(`[data-page="${pageNumber}"]`);
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();

    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      rects.push({
        x: r.left - pageRect.left,
        y: r.top - pageRect.top,
        width: r.width,
        height: r.height
      });
    }

    if (rects.length > 0) {
      handleSelectTextReady(selectedText, pageNumber, rects, range);
    }
  };

  // Render individual mock sample page
  const renderSamplePage = (p: number) => {
    if (p === 1) {
      return (
        <div 
          className="prose dark:prose-invert max-w-none px-12 py-10 select-text"
          onMouseUp={() => handleSampleTextSelection(1)}
        >
          <div className="text-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
            <h1 className="text-2xl font-extrabold text-slate-855 dark:text-white leading-tight mb-2">
              Pathological Mechanisms of Alzheimer's Disease: Tau Hyperphosphorylation and Amyloid-Beta Cascades
            </h1>
            <p className="text-xs font-semibold text-slate-405 dark:text-slate-500 uppercase tracking-widest">
              Department of Neurobiology, Brain Research Institute | Published 2026
            </p>
          </div>

          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-205 mt-6 mb-2">1. Abstract & Introduction</h3>
          <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed mb-4">
            Alzheimer's Disease (AD) is characterized pathologically by extracellular amyloid-beta deposits and intracellular neurofibrillary tangles. While these pathological marks have been documented for decades, the precise molecular kinetics coupling amyloid cleavages to cellular transport collapse remain under active debate. Understanding the biochemical switches that regulate synapse viability is paramount to developing successful disease-modifying therapies.
          </p>

          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-205 mt-8 mb-2">2. The Role of Tau Hyperphosphorylation</h3>
          <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed mb-4 relative">
            Neurons maintain a complex polar shape supported by an internal skeleton. Under physiological conditions, healthy tau protein binds to tubulin monomers, promoting microtubule polymerization. However, in pathological states, excess kinase activation alters tau folding. Specifically, 
            {" "}
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
                <svg className="w-5 h-5 flex items-center justify-center">
                  <circle cx="10" cy="10" r="7" className="stroke-slate-200 dark:stroke-slate-800 fill-none" strokeWidth="2.5" />
                  <circle 
                    cx="10" cy="10" r="7" 
                    className="progress-ring-circle fill-none transition-all duration-300" 
                    stroke={getStatusColor(capsules.find(c => c.id === 'capsule-1')?.progressStatus || 'learning')}
                    strokeWidth="2.5" 
                    strokeDasharray={2 * Math.PI * 7}
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.4)}
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-slate-800 dark:text-slate-200">①</span>
              </span>
            )}
            {" "}
            This disruption halts the flow of essential organelles, including vesicles containing trophic factors and mitochondria, to synapses located up to a meter away from the cell body. Without these resources, terminals go through synaptic pruning and cellular apoptosis.
          </p>
        </div>
      );
    }
    
    if (p === 2) {
      return (
        <div 
          className="prose dark:prose-invert max-w-none px-12 py-10 select-text"
          onMouseUp={() => handleSampleTextSelection(2)}
        >
          <h3 className="text-lg font-bold text-slate-855 dark:text-slate-205 mb-2">3. Amyloid-Beta Accumulation & Synaptic Toxicity</h3>
          <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed mb-4">
            The processing of amyloid precursor protein (APP) determines whether toxic peptides accumulate. The amyloidogenic pathway requires initial cutting by beta-secretase (BACE1), followed by the gamma-secretase complex.
          </p>
          
          <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed mb-4">
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
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.75)}
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-slate-800 dark:text-slate-250">②</span>
              </span>
            )}
            {" "}
            It is critical to note that while plaques are highly visible diagnostic features, soluble Aβ oligomers represent the primary cytotoxic elements. These oligomers bind to NMDA receptors, triggering excess calcium influx and downstream calcineurin activation.
          </p>
        </div>
      );
    }

    if (p === 3) {
      return (
        <div 
          className="prose dark:prose-invert max-w-none px-12 py-10 select-text"
          onMouseUp={() => handleSampleTextSelection(3)}
        >
          <h3 className="text-lg font-bold text-slate-855 dark:text-slate-200 mb-2">4. Mitochondrial Dysfunction & Oxidative Stress</h3>
          <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed mb-4">
            Neurons are heavily dependent on mitochondrial ATP production due to high energy costs of synaptic transmission and active ion transport. In AD, mitochondrial health declines long before large aggregates appear.
          </p>

          <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed mb-4">
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
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.5)}
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

    if (p === 4) {
      return (
        <div 
          className="prose dark:prose-invert max-w-none px-12 py-10 select-text"
          onMouseUp={() => handleSampleTextSelection(4)}
        >
          <h3 className="text-lg font-bold text-slate-855 dark:text-slate-200 mb-2">5. Clinical Diagnostic Biomarkers</h3>
          <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed mb-4">
            Early clinical diagnostics of AD are moving towards physiological neural signaling tests. Cognitive networks require highly coordinated firing between cortical hubs.
          </p>

          <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed mb-4">
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
                    strokeDashoffset={2 * Math.PI * 7 * (1 - 0.1)}
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-slate-855 dark:text-slate-100">④</span>
              </span>
            )}
            {" "}
            This reduction in gamma coherence (30–80 Hz) points to a loss of synaptic integrity in local cortical networks, which serves as a highly sensitive biomarker for pre-symptomatic cognitive decline.
          </p>
        </div>
      );
    }
    return null;
  };

  const hasBookmark = pdfInfo.bookmarks.includes(currentPage);
  const categories = [
    { name: 'yellow', bg: 'bg-yellow-400' },
    { name: 'blue', bg: 'bg-blue-400' },
    { name: 'green', bg: 'bg-green-400' },
    { name: 'purple', bg: 'bg-purple-400' },
    { name: 'red', bg: 'bg-rose-405' },
    { name: 'orange', bg: 'bg-orange-400' }
  ];

  // Colors lists
  const penColors = [
    { name: 'indigo', hex: '#6366f1' },
    { name: 'dark', hex: '#0f172a' },
    { name: 'blue', hex: '#2563eb' },
    { name: 'red', hex: '#dc2626' },
    { name: 'green', hex: '#16a34a' }
  ];

  const highlighterColors = [
    { name: 'yellow', hex: '#eab308' },
    { name: 'green', hex: '#22c55e' },
    { name: 'pink', hex: '#ec4899' },
    { name: 'blue', hex: '#3b82f6' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-100/40 dark:bg-[#0f1118]/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-inner relative select-none">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[70px] sm:max-w-[200px]">
            {pdfInfo.name.replace(/_/g, ' ')}
          </span>
          <span className="hidden sm:inline-block text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-450 font-semibold uppercase">
            Flow Mode
          </span>
        </div>

        {/* Navigation, Zoom & Drawing toggles */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Stylus Pencil Drawing mode trigger */}
          <button
            onClick={() => setPencilMode(!pencilMode)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              pencilMode 
                ? 'bg-indigo-550 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
            title={pencilMode ? "Disable Stylus Markup" : "Enable Stylus Markup / Pen mode"}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          
          {/* Page scrolling selector */}
          <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 sm:pr-3">
            <button 
              disabled={currentPage <= 1}
              onClick={() => scrollToPage(currentPage - 1)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-855 disabled:opacity-30 disabled:hover:bg-transparent text-slate-655 dark:text-slate-400 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-slate-550 w-11 text-center select-none">
              {currentPage} / {numPages}
            </span>
            <button 
              disabled={currentPage >= numPages}
              onClick={() => scrollToPage(currentPage + 1)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-855 disabled:opacity-30 disabled:hover:bg-transparent text-slate-655 dark:text-slate-400 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Scale controls */}
          {!isSample && (
            <div className="hidden md:flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 sm:pr-3">
              <button 
                onClick={() => {
                  setIsAutoFit(false);
                  setScale(prev => Math.max(0.4, prev - 0.15));
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-855 text-slate-655 dark:text-slate-400 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-semibold text-slate-500 w-10 text-center select-none">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => {
                  setIsAutoFit(false);
                  setScale(prev => Math.min(2.5, prev + 0.15));
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-855 text-slate-655 dark:text-slate-400 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              {/* Fit Width toggle shortcut */}
              {!isAutoFit && (
                <button
                  onClick={() => {
                    setIsAutoFit(true);
                    if (containerRef.current) {
                      fitScaleToContainer(containerRef.current.clientWidth);
                    }
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                  title="Fit to Width"
                >
                  Fit Width
                </button>
              )}
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

      {/* Main Flow Scrollable Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col items-center gap-8 p-6 bg-slate-100/50 dark:bg-slate-950/20 scroll-smooth w-full"
      >
        {/* Loading Indicator */}
        {loading && !pdfDocument && !isSample && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">Reading PDF structures...</span>
          </div>
        )}

        {/* 1. INTERACTIVE MOCK SAMPLE PAPER (Flow Mode) */}
        {isSample && (
          <div className="flex flex-col gap-8 w-full max-w-2xl">
            {[1, 2, 3, 4].map((p) => (
              <div 
                key={p} 
                data-page={p}
                className={`page-container bg-white dark:bg-slate-900 border shadow-sm rounded-xl overflow-hidden w-full relative transition-all duration-300 ${
                  currentPage === p ? 'border-slate-300 dark:border-slate-750' : 'border-slate-200 dark:border-slate-855'
                }`}
              >
                {renderSamplePage(p)}
                {/* stylus drawing layer for mock pages */}
                <PageDrawingCanvas
                  pdfId={pdfInfo.id}
                  pageNumber={p}
                  scale={1.0}
                  pencilMode={pencilMode}
                  activeTool={drawingTool}
                  activeColor={drawingColor}
                  activeWidth={drawingWidth}
                />
              </div>
            ))}
          </div>
        )}

        {/* 2. REAL PDF FLOW RENDERER */}
        {!isSample && pdfDocument && (
          <div className="flex flex-col gap-8 w-full items-center">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <div 
                key={p} 
                data-page={p}
                className={`page-container flex justify-center w-full transition-all duration-300 ${
                  currentPage === p ? 'opacity-100 scale-100' : 'opacity-90'
                }`}
              >
                <PageCanvas
                  pdf={pdfDocument}
                  pageNumber={p}
                  scale={scale}
                  readingMode={readingMode}
                  capsules={capsules}
                  selectedCapsuleId={selectedCapsuleId}
                  onSelectCapsule={onSelectCapsule}
                  onMarkerHover={handleMarkerHover}
                  onMarkerLeave={handleMarkerLeave}
                  onSelectTextReady={handleSelectTextReady}
                  
                  // Stylus parameters
                  pdfId={pdfInfo.id}
                  pencilMode={pencilMode}
                  activeTool={drawingTool}
                  activeColor={drawingColor}
                  activeWidth={drawingWidth}
                />
              </div>
            ))}
          </div>
        )}

        {/* Text selection indicator tooltip helper */}
        <div className="fixed bottom-8 right-8 bg-slate-900/90 text-white text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-md pointer-events-none select-none z-10 opacity-70">
          <BookOpen className="h-3 w-3 text-indigo-400" />
          <span>{pencilMode ? "Pencil Mode Active - Draw on page" : "Select text anywhere to create a Capsule"}</span>
        </div>

        {/* Floating Annotation Creator Tooltip Dialog */}
        {activeSelection && (
          <form 
            onSubmit={handleConfirmCreateCapsule}
            className="absolute z-40 w-64 glass-panel p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 animate-scale-up"
            style={{
              left: `${activeSelection.x}px`,
              top: `${activeSelection.y - 120}px`
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-widest">
                Create Capsule
              </span>
              <button 
                type="button"
                onClick={() => setActiveSelection(null)}
                className="text-slate-400 hover:text-slate-650 p-0.5 rounded hover:bg-slate-105 dark:hover:bg-slate-800"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Name this concept..."
              value={newCapsuleLabel}
              onChange={(e) => setNewCapsuleLabel(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
              autoFocus
              required
            />

            <div className="flex items-center justify-between gap-2 mt-1 border-t border-slate-100 dark:border-slate-800 pt-2.5">
              <div className="flex items-center gap-1">
                {categories.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setNewCapsuleColor(c.name)}
                    className={`w-3.5 h-3.5 rounded-full cursor-pointer flex items-center justify-center border transition hover:scale-110 ${c.bg} ${
                      newCapsuleColor === c.name ? 'border-slate-700 dark:border-white scale-115' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="px-3 py-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </form>
        )}
      </div>

      {/* FLOATING MARKUP PALETTE (Apple-style pencil toolbar overlay at bottom) */}
      {pencilMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel px-5 py-3 rounded-2xl shadow-2xl border border-slate-250 dark:border-slate-800 flex items-center gap-4 animate-scale-up touch-none">
          
          {/* 1. Tools Selectors */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3.5">
            <button
              onClick={() => setDrawingTool('pen')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                drawingTool === 'pen'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Pen tool"
            >
              <PenTool className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDrawingTool('highlighter')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                drawingTool === 'highlighter'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Highlight drawing marker"
            >
              <Highlighter className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDrawingTool('eraser')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                drawingTool === 'eraser'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Object Eraser"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>

          {/* 2. Colors List Picker */}
          {drawingTool !== 'eraser' && (
            <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3.5">
              {drawingTool === 'pen' ? (
                penColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setDrawingColor(color.hex)}
                    className={`w-5 h-5 rounded-full cursor-pointer border transition-all hover:scale-115 ${
                      drawingColor === color.hex ? 'ring-2 ring-indigo-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))
              ) : (
                highlighterColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setDrawingColor(color.hex)}
                    className={`w-5 h-5 rounded-full cursor-pointer border transition-all hover:scale-115 ${
                      drawingColor === color.hex ? 'ring-2 ring-indigo-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))
              )}
            </div>
          )}

          {/* 3. Width adjuster slider */}
          {drawingTool !== 'eraser' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold">Width</span>
              <input
                type="range"
                min={drawingTool === 'pen' ? 1.0 : 8}
                max={drawingTool === 'pen' ? 8.0 : 35}
                step={0.5}
                value={drawingWidth}
                onChange={(e) => setDrawingWidth(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
              />
              <span className="text-[10px] text-slate-500 font-bold w-6">{drawingWidth}</span>
            </div>
          )}

          {/* 4. Reset/Done trigger */}
          <button
            onClick={() => setPencilMode(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 cursor-pointer ml-1"
            title="Close Markup toolbar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
          
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-205 mb-1 flex items-center gap-1">
            <span>{hoveredCapsule.number}.</span>
            <span>{hoveredCapsule.label || 'Untitled'}</span>
          </h4>
          
          <p className="text-[10px] text-slate-505 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {hoveredCapsule.notes.replace(/[#*`_-]/g, '').trim()}
          </p>
          
          {hoveredCapsule.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {hoveredCapsule.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-505 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
