import React, { useState, useEffect } from 'react';
import { 
  X, Check, Plus, Trash2, BookOpen, Clock, 
  PlusCircle, Tag, Brain, HelpCircle, FileCode, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { KnowledgeCapsuleItem, ProgressStatus, Flashcard, CapsuleReference } from '../utils/storage';

interface CapsulePanelProps {
  capsule: KnowledgeCapsuleItem;
  onUpdate: (updated: KnowledgeCapsuleItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onTriggerAIAction: (action: 'explain' | 'simplify' | 'mnemonic') => void;
  aiLoading: boolean;
}

export const CapsulePanel: React.FC<CapsulePanelProps> = ({
  capsule,
  onUpdate,
  onDelete,
  onClose,
  onTriggerAIAction,
  aiLoading
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'references' | 'history'>('notes');
  
  // Local state for editing fields
  const [label, setLabel] = useState(capsule.label);
  const [notes, setNotes] = useState(capsule.notes);
  const [personalUnderstanding, setPersonalUnderstanding] = useState(capsule.personalUnderstanding);
  const [tagInput, setTagInput] = useState('');
  
  // Local state for adding flashcards/refs/equations
  const [newFcQ, setNewFcQ] = useState('');
  const [newFcA, setNewFcA] = useState('');
  
  const [newRefCitation, setNewRefCitation] = useState('');
  const [newRefDoi, setNewRefDoi] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');

  const [newEquation, setNewEquation] = useState('');
  const [isEquationOpen, setIsEquationOpen] = useState(false);

  // Active flashcard flip states
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>({});

  // Sync state with selected capsule
  useEffect(() => {
    setLabel(capsule.label);
    setNotes(capsule.notes);
    setPersonalUnderstanding(capsule.personalUnderstanding);
    setNewFcQ('');
    setNewFcA('');
    setNewRefCitation('');
    setNewRefDoi('');
    setNewRefUrl('');
    setNewEquation('');
    setFlippedCardIds({});
  }, [capsule.id]);

  // Debounced/Triggered save of general edits
  const handleSaveGeneral = () => {
    onUpdate({
      ...capsule,
      label,
      notes,
      personalUnderstanding
    });
  };

  const handleStatusChange = (status: ProgressStatus) => {
    // Add to version history log automatically on status change
    const newVersion = (capsule.versionHistory.length > 0 
      ? Math.max(...capsule.versionHistory.map(v => v.version)) 
      : 0) + 1;
    
    const newHistoryEntry = {
      version: newVersion,
      timestamp: new Date().toISOString(),
      notes: `Updated status to: ${status.replace('-', ' ')}`,
      status
    };

    onUpdate({
      ...capsule,
      progressStatus: status,
      versionHistory: [...capsule.versionHistory, newHistoryEntry]
    });
  };

  const handleColorChange = (color: string) => {
    onUpdate({
      ...capsule,
      colorCategory: color
    });
  };

  // Tag Actions
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim() || capsule.tags.includes(tagInput.trim())) return;
    onUpdate({
      ...capsule,
      tags: [...capsule.tags, tagInput.trim()]
    });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({
      ...capsule,
      tags: capsule.tags.filter(t => t !== tagToRemove)
    });
  };

  // Flashcards Actions
  const handleAddFlashcard = () => {
    if (!newFcQ.trim() || !newFcA.trim()) return;
    const newCard: Flashcard = {
      id: `fc-${Date.now()}`,
      question: newFcQ.trim(),
      answer: newFcA.trim(),
      mastered: false
    };
    onUpdate({
      ...capsule,
      flashcards: [...capsule.flashcards, newCard]
    });
    setNewFcQ('');
    setNewFcA('');
  };

  const handleToggleCardMastered = (cardId: string) => {
    onUpdate({
      ...capsule,
      flashcards: capsule.flashcards.map(c => 
        c.id === cardId ? { ...c, mastered: !c.mastered } : c
      )
    });
  };

  const handleDeleteFlashcard = (cardId: string) => {
    onUpdate({
      ...capsule,
      flashcards: capsule.flashcards.filter(c => c.id !== cardId)
    });
  };

  const handleFlipCard = (cardId: string) => {
    setFlippedCardIds(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // References Actions
  const handleAddReference = () => {
    if (!newRefCitation.trim()) return;
    const newRef: CapsuleReference = {
      citation: newRefCitation.trim(),
      doi: newRefDoi.trim() || undefined,
      url: newRefUrl.trim() || undefined
    };
    onUpdate({
      ...capsule,
      references: [...capsule.references, newRef]
    });
    setNewRefCitation('');
    setNewRefDoi('');
    setNewRefUrl('');
  };

  const handleDeleteReference = (idx: number) => {
    onUpdate({
      ...capsule,
      references: capsule.references.filter((_, i) => i !== idx)
    });
  };

  // Equations Actions
  const handleAddEquation = () => {
    if (!newEquation.trim()) return;
    onUpdate({
      ...capsule,
      latexEquations: [...capsule.latexEquations, newEquation.trim()]
    });
    setNewEquation('');
  };

  const handleDeleteEquation = (idx: number) => {
    onUpdate({
      ...capsule,
      latexEquations: capsule.latexEquations.filter((_, i) => i !== idx)
    });
  };

  const categories = [
    { name: 'yellow', label: 'Important', bg: 'bg-yellow-400 dark:bg-yellow-500/85' },
    { name: 'blue', label: 'My Understanding', bg: 'bg-blue-400 dark:bg-blue-500/85' },
    { name: 'green', label: 'AI Explanation', bg: 'bg-green-400 dark:bg-green-500/85' },
    { name: 'purple', label: 'References', bg: 'bg-purple-400 dark:bg-purple-500/85' },
    { name: 'red', label: 'Needs Revision', bg: 'bg-rose-400 dark:bg-rose-500/85' },
    { name: 'orange', label: 'Questions', bg: 'bg-orange-400 dark:bg-orange-500/85' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden animate-slide-left">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 rounded-lg items-center justify-center bg-indigo-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-indigo-600 dark:text-indigo-400">
            {capsule.number}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              Knowledge Capsule
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleSaveGeneral}
              className="block font-bold text-sm text-slate-800 dark:text-white bg-transparent focus:outline-none focus:border-b focus:border-indigo-500 w-44"
              placeholder="Name this Capsule"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (confirm('Delete this Knowledge Capsule and clear highlight?')) {
                onDelete(capsule.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Delete Capsule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Panel Scroll Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Color Categories Picker */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
            Category
          </span>
          <div className="flex items-center gap-2">
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => handleColorChange(c.name)}
                className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center border-2 transition-all hover:scale-110 ${c.bg} ${
                  capsule.colorCategory === c.name 
                    ? 'border-indigo-600 dark:border-white scale-110 shadow-sm' 
                    : 'border-transparent'
                }`}
                title={c.label}
              >
                {capsule.colorCategory === c.name && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Status Bar */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
            Study Progress
          </span>
          <div className="grid grid-cols-5 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
            {(['not-started', 'learning', 'partial', 'understood', 'mastered'] as ProgressStatus[]).map((st) => {
              const isActive = capsule.progressStatus === st;
              const labelsMap: Record<string, string> = {
                'not-started': '⚪',
                'learning': '🟡',
                'partial': '🟠',
                'understood': '🔵',
                'mastered': '🟢'
              };
              const titlesMap: Record<string, string> = {
                'not-started': 'Not Started',
                'learning': 'Learning',
                'partial': 'Partial',
                'understood': 'Understood',
                'mastered': 'Mastered'
              };
              return (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`py-1.5 text-center text-sm rounded-lg transition cursor-pointer ${
                    isActive 
                      ? 'bg-white dark:bg-slate-850 shadow-sm font-bold border border-slate-200/50 dark:border-slate-700/50' 
                      : 'hover:bg-slate-100/50 dark:hover:bg-slate-850/30'
                  }`}
                  title={titlesMap[st]}
                >
                  <span className="block text-xs">{labelsMap[st]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Highlighted text segment */}
        <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
            <BookOpen className="h-3 w-3" />
            <span>PDF Highlight Source</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
            "{capsule.highlightText}"
          </p>
        </div>

        {/* Sidebar tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs">
          {(['notes', 'flashcards', 'references', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-2 font-semibold capitalize text-center border-b-2 transition cursor-pointer ${
                activeTab === tab 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
              }`}
            >
              {tab === 'history' ? 'Version Log' : tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        
        {/* 1. NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-5">
            {/* Rich Editor Section */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                Personal Notes & Explanations (Markdown Supported)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveGeneral}
                className="w-full min-h-[140px] text-xs leading-relaxed p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl font-mono"
                placeholder="Enter markdown notes here..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                My Synaptic Synthesis
              </label>
              <textarea
                value={personalUnderstanding}
                onChange={(e) => setPersonalUnderstanding(e.target.value)}
                onBlur={handleSaveGeneral}
                className="w-full min-h-[80px] text-xs leading-relaxed p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl"
                placeholder="Express this in your own words to solidify understanding..."
              />
            </div>

            {/* LaTeX Equations section */}
            <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <button 
                onClick={() => setIsEquationOpen(!isEquationOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/50 dark:bg-slate-950/30 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <FileCode className="h-4 w-4" />
                  LaTeX Equations ({capsule.latexEquations.length})
                </span>
                {isEquationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {isEquationOpen && (
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  {/* Equations List */}
                  {capsule.latexEquations.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No equations linked yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {capsule.latexEquations.map((eq, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/40">
                          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-350 overflow-x-auto max-w-[200px]">
                            $${eq}$$
                          </div>
                          <button 
                            onClick={() => handleDeleteEquation(i)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Equation */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. E = mc^2"
                      value={newEquation}
                      onChange={(e) => setNewEquation(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleAddEquation}
                      className="px-2.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick AI Buttons */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                Tutor AI Shortcuts
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={aiLoading}
                  onClick={() => onTriggerAIAction('explain')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
                >
                  <Brain className="h-3.5 w-3.5" />
                  Explain Mechanism
                </button>
                <button
                  disabled={aiLoading}
                  onClick={() => onTriggerAIAction('simplify')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Analogize Concept
                </button>
              </div>
            </div>

            {/* Tags section */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                Concept Tags
              </span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {capsule.tags.map((t, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg"
                  >
                    #{t}
                    <button 
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>

          </div>
        )}

        {/* 2. FLASHCARDS TAB */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Capsule Flashcards ({capsule.flashcards.length})
              </span>
              
              {/* AI Auto generator button */}
              <button
                disabled={aiLoading}
                onClick={() => onTriggerAIAction('explain')} // uses default trigger behavior
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer"
              >
                ⚡ Generate with AI
              </button>
            </div>

            {/* Flashcard Stack */}
            {capsule.flashcards.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <Brain className="h-5 w-5 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-450 italic">No flashcards created yet. Create one below or ask AI to generate them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {capsule.flashcards.map((fc) => {
                  const isFlipped = flippedCardIds[fc.id] || false;
                  return (
                    <div 
                      key={fc.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Card Content Area (click to flip) */}
                      <div 
                        onClick={() => handleFlipCard(fc.id)}
                        className="p-4 bg-slate-50/50 dark:bg-slate-900/50 min-h-[90px] flex flex-col justify-between cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/80 transition-colors"
                      >
                        <div>
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">
                            {isFlipped ? 'Answer' : 'Question'}
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed mt-1.5">
                            {isFlipped ? fc.answer : fc.question}
                          </p>
                        </div>
                        
                        <div className="text-[9px] text-slate-400 text-right mt-3 font-semibold uppercase tracking-wider select-none">
                          Click card to flip
                        </div>
                      </div>

                      {/* Card Bottom Controls */}
                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-2 bg-white dark:bg-slate-900/90 text-xs">
                        <button
                          onClick={() => handleToggleCardMastered(fc.id)}
                          className={`flex items-center gap-1 font-bold ${
                            fc.mastered 
                              ? 'text-emerald-500' 
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                          } cursor-pointer`}
                        >
                          <CheckCircle className="h-3.5 w-3.5 fill-current" />
                          <span>{fc.mastered ? 'Mastered' : 'Mark Mastered'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteFlashcard(fc.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual Flashcard Creator */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-xl border border-slate-200/80 dark:border-slate-850 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Create Flashcard
              </span>
              
              <div>
                <input
                  type="text"
                  placeholder="Question..."
                  value={newFcQ}
                  onChange={(e) => setNewFcQ(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <textarea
                  placeholder="Answer..."
                  value={newFcA}
                  onChange={(e) => setNewFcA(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                />
              </div>

              <button
                onClick={handleAddFlashcard}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                Add Flashcard
              </button>
            </div>
          </div>
        )}

        {/* 3. REFERENCES TAB */}
        {activeTab === 'references' && (
          <div className="space-y-6">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              DOI & Paper Linkages
            </span>

            {capsule.references.length === 0 ? (
              <p className="text-xs text-slate-450 italic text-center py-6">No references added yet.</p>
            ) : (
              <div className="space-y-3">
                {capsule.references.map((ref, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                        {ref.citation}
                      </p>
                      {ref.doi && (
                        <span className="inline-block text-[10px] text-indigo-500 font-mono mt-1 font-bold">
                          DOI: {ref.doi}
                        </span>
                      )}
                      {ref.url && (
                        <a 
                          href={ref.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block text-[10px] text-indigo-500 hover:underline mt-0.5 truncate max-w-[200px]"
                        >
                          {ref.url}
                        </a>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteReference(idx)}
                      className="text-slate-450 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 self-start cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual reference creator */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 rounded-xl border border-slate-200/80 dark:border-slate-850 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Link Reference
              </span>

              <div>
                <input
                  type="text"
                  placeholder="Citation description (e.g. Noble et al., 2020)..."
                  value={newRefCitation}
                  onChange={(e) => setNewRefCitation(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="DOI (e.g. 10.1038/s41582-020-0377-x)..."
                  value={newRefDoi}
                  onChange={(e) => setNewRefDoi(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="URL link (e.g. https://...)..."
                  value={newRefUrl}
                  onChange={(e) => setNewRefUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleAddReference}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                Link Citation
              </button>
            </div>
          </div>
        )}

        {/* 4. HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Understanding History Timeline
            </span>

            {capsule.versionHistory.length === 0 ? (
              <p className="text-xs text-slate-450 italic text-center py-6">No edits recorded yet.</p>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-5 py-2">
                {capsule.versionHistory.map((ver, idx) => (
                  <div key={idx} className="relative">
                    {/* Time dot indicator */}
                    <div className={`absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-slate-300 ${
                      ver.status === 'mastered' ? 'bg-emerald-500' :
                      ver.status === 'understood' ? 'bg-blue-500' :
                      ver.status === 'partial' ? 'bg-orange-500' :
                      ver.status === 'learning' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                          Version {ver.version}
                        </span>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-450 px-1.5 py-0.5 rounded font-mono">
                          {new Date(ver.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        "{ver.notes}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-xl">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Historical Sync</span>
              </span>
              <p className="text-[10px] text-slate-450 leading-relaxed mt-2">
                Every time you change the **Study Progress** status, a snapshot of your current notes and thoughts is saved to the version timeline. This lets you track how your understanding of this topic evolved.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
