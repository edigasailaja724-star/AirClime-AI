import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, Check, Copy, Languages, RotateCcw, Send, Trash2, X } from 'lucide-react';
import type { ChatLanguage, ChatMessage } from '../../types/environment';
import { AirClimeLogo } from '../common/AirClimeLogo';

const SUGGESTED_QUESTIONS: Record<ChatLanguage, string[]> = {
  en: [
    "Is today's air quality safe?",
    'Can I go outside now?',
    'What is causing the high AQI?',
    'How will the weather change tomorrow?',
    'Which location has cleaner air?',
    'How can I reduce my environmental impact?',
  ],
  te: [
    'ఈరోజు గాలి నాణ్యత సురక్షితంగా ఉందా?',
    'నేను ఇప్పుడు బయటకు వెళ్లవచ్చా?',
    'రేపు వాతావరణం ఎలా మారుతుంది?',
    'నా పర్యావరణ ప్రభావాన్ని ఎలా తగ్గించాలి?',
  ],
  hi: [
    'क्या आज की वायु गुणवत्ता सुरक्षित है?',
    'क्या मैं अभी बाहर जा सकता हूँ?',
    'कल मौसम कैसा बदलेगा?',
    'मैं अपना पर्यावरणीय प्रभाव कैसे कम कर सकता हूँ?',
  ],
};

export const SPECIAL_AI_ACTIONS: Array<{ id: string; label: string; prompt: string }> = [
  {
    id: 'analyze-air',
    label: 'Analyze My Air',
    prompt: 'Analyze my current air quality, dominant pollutant, and whether it is safe outdoors right now.',
  },
  {
    id: 'explain-weather',
    label: "Explain Today's Weather",
    prompt: "Explain today's current weather, comfort conditions, and how tomorrow will change.",
  },
  {
    id: 'analyze-sunlight',
    label: 'Analyze Sunlight',
    prompt: 'Analyze today’s sunlight timeline, UV risk, golden hour timing, and sun safety.',
  },
  {
    id: 'compare-cities',
    label: 'Compare Two Cities',
    prompt: 'Compare the air quality and weather across my currently compared cities and highlight the cleaner option.',
  },
  {
    id: 'eco-report',
    label: 'Give My Daily Eco Report',
    prompt: 'Give me a concise daily environmental report for my current location plus one sustainable action.',
  },
  {
    id: 'explain-risks',
    label: 'Explain Environmental Risks',
    prompt: 'Explain any active environmental alerts or elevated health/weather risks at my location.',
  },
];

const QUICK_REPLIES: Record<ChatLanguage, string[]> = {
  en: ['Outdoor precautions?', 'Explain pollutants', 'Tomorrow forecast', 'Compare cleaner city'],
  te: ['బయట జాగ్రత్తలు?', 'రేపు వాతావరణం', 'కాలుష్య వివరాలు'],
  hi: ['बाहर की सावधानियाँ?', 'कल का मौसम', 'प्रदूषक विवरण'],
};

const LANGUAGE_LABELS: Record<ChatLanguage, string> = {
  en: 'English',
  te: 'తెలుగు (Telugu)',
  hi: 'हिन्दी (Hindi)',
};

interface AtmosAiPanelProps {
  messages: ChatMessage[];
  language: ChatLanguage;
  onChangeLanguage: (lang: ChatLanguage) => void;
  onSendMessage: (text: string) => Promise<void>;
  onRetryMessage?: (failedModelMsgId: string) => Promise<void>;
  onClearChat: () => void;
  isSending: boolean;
  locationLabel: string;
  compact?: boolean;
}

export function AtmosAiPanel({
  messages,
  language,
  onChangeLanguage,
  onSendMessage,
  onRetryMessage,
  onClearChat,
  isSending,
  locationLabel,
  compact = false,
}: AtmosAiPanelProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input]);

  const submitCurrentInput = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setInput('');
    await onSendMessage(trimmed);
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCurrentInput();
  };

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitCurrentInput();
    }
  };

  const handleQuickReply = async (text: string) => {
    if (isSending) return;
    await onSendMessage(text);
    textareaRef.current?.focus();
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const lastMessage = messages[messages.length - 1];
  const waitingFirstToken =
    isSending && (!lastMessage || lastMessage.role === 'user' || !lastMessage.content);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <AirClimeLogo variant="emblem" size="xs" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              AirClime-ai – Environmental Copilot
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Grounded in live data for {locationLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1">
            <Languages className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <select
              aria-label="Assistant language"
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as ChatLanguage)}
              className="text-xs bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              {(Object.keys(LANGUAGE_LABELS) as ChatLanguage[]).map((lang) => (
                <option key={lang} value={lang} className="bg-white dark:bg-slate-900">
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onClearChat}
            title="Clear active conversation"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Special AI Actions Bar */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto bg-emerald-50/40 dark:bg-emerald-950/20">
        {SPECIAL_AI_ACTIONS.map((act) => (
          <button
            key={act.id}
            type="button"
            disabled={isSending}
            onClick={() => void handleQuickReply(act.prompt)}
            className="px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 text-[11px] font-medium text-[#0F5132] dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {act.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${compact ? 'min-h-[210px]' : 'min-h-[340px]'}`}>
        {messages.length === 0 && (
          <div className="space-y-4 py-1">
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex flex-col items-center text-center gap-3">
              <AirClimeLogo
                variant="stacked"
                size={compact ? 'md' : 'lg'}
                showTagline
              />
              <p>
                Ask <strong>AirClime-ai</strong> about air quality, pollutant trends, sunlight &amp; UV timing, weather risks, or city comparisons. Every answer uses live data from <strong>{locationLabel}</strong>.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                Suggested Prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS[language].map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={isSending}
                    onClick={() => void handleQuickReply(q)}
                    className="text-left px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages
          .filter((msg) => msg.content.length > 0 || msg.error)
          .map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#0F5132] text-white'
                    : msg.error
                      ? 'border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                      : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                }`}
              >
                {msg.error && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold mb-1 text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Assistant Notice
                  </div>
                )}
                {msg.content}
                {msg.error && onRetryMessage && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => void onRetryMessage(msg.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                )}
                <div
                  className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] font-mono tabular-nums ${
                    msg.role === 'user' ? 'text-emerald-100/80' : 'text-slate-400'
                  }`}
                >
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.role === 'model' && !msg.error && (
                    <button
                      type="button"
                      onClick={() => void handleCopy(msg.id, msg.content)}
                      aria-label="Copy response"
                      className="inline-flex items-center gap-1 text-[10px] font-sans text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" aria-hidden="true" /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

        {waitingFirstToken && (
          <div className="flex justify-start">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="inline-flex gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:240ms]" />
              </span>
              <span>AirClime-ai is typing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Reply Bar */}
      {messages.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto bg-slate-50/40 dark:bg-slate-900/30">
          <span className="text-[10px] font-medium text-slate-400 shrink-0 mr-1">Quick reply:</span>
          {QUICK_REPLIES[language].map((q) => (
            <button
              key={q}
              type="button"
              disabled={isSending}
              onClick={() => void handleQuickReply(q)}
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-200 hover:border-emerald-500 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2 bg-white dark:bg-[#131C21]"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          aria-label="Message AirClime-ai"
          placeholder={
            language === 'te'
              ? 'AirClime-ai ని అడగండి... (Enter: పంపండి, Shift+Enter: కొత్త లైన్)'
              : language === 'hi'
                ? 'AirClime-ai से पूछें... (Enter: भेजें, Shift+Enter: नई लाइन)'
                : 'Ask AirClime-ai... (Enter to send, Shift+Enter for newline)'
          }
          disabled={isSending}
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 resize-none max-h-28 leading-snug"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          aria-label="Send message to AirClime-ai"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

interface FloatingAtmosWidgetProps {
  open: boolean;
  onToggleOpen: () => void;
  messages: ChatMessage[];
  language: ChatLanguage;
  onChangeLanguage: (lang: ChatLanguage) => void;
  onSendMessage: (text: string) => Promise<void>;
  onRetryMessage?: (failedModelMsgId: string) => Promise<void>;
  onClearChat: () => void;
  isSending: boolean;
  locationLabel: string;
}

export function FloatingAtmosWidget({
  open,
  onToggleOpen,
  messages,
  language,
  onChangeLanguage,
  onSendMessage,
  onRetryMessage,
  onClearChat,
  isSending,
  locationLabel,
}: FloatingAtmosWidgetProps) {
  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="AirClime-ai Environmental Assistant"
          className="fixed bottom-20 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[430px] h-[560px] max-h-[78vh] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131C21] shadow-2xl flex flex-col overflow-hidden print:hidden"
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#0F5132] to-emerald-700 text-white">
            <span className="inline-flex items-center gap-2 text-xs font-semibold">
              <AirClimeLogo variant="emblem" size="xs" />
              <span>AirClime-ai</span>
            </span>
            <button
              type="button"
              onClick={onToggleOpen}
              aria-label="Close AirClime-ai drawer"
              className="p-1 rounded hover:bg-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <AtmosAiPanel
              messages={messages}
              language={language}
              onChangeLanguage={onChangeLanguage}
              onSendMessage={onSendMessage}
              onRetryMessage={onRetryMessage}
              onClearChat={onClearChat}
              isSending={isSending}
              locationLabel={locationLabel}
              compact
            />
          </div>
        </div>
      )}

      {/* Floating AirClime-ai Launcher with Circular Brand Emblem */}
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label={open ? 'Close AirClime-ai assistant' : 'Open AirClime-ai assistant'}
        className="group fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 print:hidden inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full bg-gradient-to-r from-[#0F5132] via-emerald-700 to-[#0D9488] text-white shadow-[0_10px_28px_-6px_rgba(15,81,50,0.55)] ring-1 ring-emerald-300/40 hover:ring-emerald-200/70 hover:shadow-[0_14px_34px_-6px_rgba(16,185,129,0.6)] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/0 opacity-60 group-hover:opacity-90 transition-opacity"
        />
        <AirClimeLogo variant="emblem" size="xs" className="relative" />
        <span className="relative text-xs font-semibold tracking-tight whitespace-nowrap">
          AirClime-ai
        </span>
      </button>
    </>
  );
}
