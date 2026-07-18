import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Trash2, Settings2, Key, HelpCircle, Brain, Eye, EyeOff } from 'lucide-react';
import { runAIAction, AIResult } from '../utils/ai';
import { UserSettings } from '../utils/storage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AISidebarProps {
  activeHighlightText?: string;
  activeCapsuleLabel?: string;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onAISuccessfulAction?: (actionResult: AIResult) => void;
}

export const AISidebar: React.FC<AISidebarProps> = ({
  activeHighlightText = '',
  activeCapsuleLabel = '',
  settings,
  onUpdateSettings,
  onAISuccessfulAction
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your **KnowledgeCapsule AI Tutor**. Highlight any text in the PDF or click a marker to ask me questions, simplify mechanisms, create mnemonics, or generate study cards."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Local settings editor
  const [apiProvider, setApiProvider] = useState<'gemini' | 'openai'>(settings.apiProvider);
  const [apiKey, setApiKey] = useState(settings.apiKey);

  const UNIQMIND_KEYS = {
    gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
    openai: import.meta.env.VITE_OPENAI_API_KEY || ''
  };

  useEffect(() => {
    if (!apiKey || apiKey === UNIQMIND_KEYS.gemini || apiKey === UNIQMIND_KEYS.openai) {
      setApiKey(UNIQMIND_KEYS[apiProvider]);
    }
  }, [apiProvider]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputText('');
    setLoading(true);

    try {
      // Run AI chat prompt
      const result = await runAIAction({
        action: 'explain', // Treat user input as a custom request inside the context
        text: userMessage,
        context: activeHighlightText ? `The user is highlighting: "${activeHighlightText}" in the active document.` : undefined,
        apiKey: settings.apiKey,
        provider: settings.apiProvider
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message || 'Could not reach AI provider.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: 'explain' | 'simplify' | 'summarize' | 'mnemonic' | 'quiz' | 'flashcards') => {
    if (!activeHighlightText) {
      alert('Please select or highlight text in the PDF first.');
      return;
    }
    
    setLoading(true);
    const actionNames: Record<string, string> = {
      explain: 'Explain Mechanism',
      simplify: 'Analogize Concept',
      summarize: 'Summarize text',
      mnemonic: 'Generate Mnemonic',
      quiz: 'Create Quiz Question',
      flashcards: 'Generate Flashcards'
    };

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: `AI Action: **${actionNames[action]}** on highlighted text: *"${activeHighlightText.substring(0, 50)}${activeHighlightText.length > 50 ? '...' : ''}"*` 
    }]);

    try {
      const result = await runAIAction({
        action: action as any,
        text: activeHighlightText,
        context: activeCapsuleLabel ? `Active capsule is named "${activeCapsuleLabel}"` : undefined,
        apiKey: settings.apiKey,
        provider: settings.apiProvider
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
      
      // If action created flashcards or quiz, callback to save to active capsule!
      if (onAISuccessfulAction && (result.flashcards || result.quiz)) {
        onAISuccessfulAction(result);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Action failed: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    onUpdateSettings({
      ...settings,
      apiProvider,
      apiKey
    });
    setShowSettings(false);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared. Ask me anything about the active research paper."
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden animate-slide-left">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">AI Tutor Assistant</h2>
            <span className="text-[9px] text-slate-400 font-semibold block uppercase">
              {settings.apiKey ? `${settings.apiProvider} Live` : 'Mock Engine Mode'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showSettings 
                ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' 
                : 'text-slate-450 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="AI Configuration"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-slate-450 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Settings Drawer overlay */}
      {showSettings && (
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-850 space-y-4 animate-scale-up">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
            <Key className="h-4 w-4 text-indigo-500" />
            <span>Connect API Keys</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">
              Provider
            </label>
            <select
              value={apiProvider}
              onChange={(e) => setApiProvider(e.target.value as any)}
              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="gemini">Gemini API (Recommended)</option>
              <option value="openai">OpenAI GPT-4o-mini</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiProvider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-9 py-1.5 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2 text-slate-450 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveSettings}
              className="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
            >
              Save settings
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-850 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Message History list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'ml-auto bg-indigo-600 text-white rounded-br-none' 
                : 'mr-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200 rounded-bl-none'
            }`}
          >
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {msg.role === 'user' ? 'You' : 'AI Tutor'}
            </span>
            <div className="whitespace-pre-line font-normal prose prose-sm dark:prose-invert">
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Analyzing concept...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick context operations (visible when there is an active highlight) */}
      {activeHighlightText && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
            Highlight Action:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleQuickAction('explain')}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Explain Scientifically
            </button>
            <button
              onClick={() => handleQuickAction('simplify')}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-50 dark:bg-slate-850 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Explain Simply
            </button>
            <button
              onClick={() => handleQuickAction('mnemonic')}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Generate Mnemonic
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form 
        onSubmit={handleSendChat}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={activeHighlightText ? "Ask about highlight..." : "Type a message..."}
            className="flex-1 text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
