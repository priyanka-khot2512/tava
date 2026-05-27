'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Common Indian veg pantry items. Tap to add.
const QUICK_ADD = [
  'onion', 'tomato', 'garlic', 'ginger', 'green chili', 'coriander',
  'paneer', 'curd', 'milk',
  'besan', 'atta', 'rice', 'poha', 'sooji',
  'toor dal', 'moong dal', 'masoor dal', 'chana dal',
  'potato', 'eggplant', 'cauliflower', 'spinach', 'methi', 'okra', 'cabbage',
  'peanuts', 'cashews', 'jaggery', 'tamarind', 'kokum',
  'lemon', 'kadipatta',
];

const STORAGE_KEY = 'tava:pantry';
const RECENT_KEY = 'tava:recent';

export default function Home() {
  const [pantry, setPantry] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Load saved pantry + recents on mount
  useEffect(() => {
    try {
      const savedPantry = localStorage.getItem(STORAGE_KEY);
      if (savedPantry) setPantry(JSON.parse(savedPantry));
      const savedRecent = localStorage.getItem(RECENT_KEY);
      if (savedRecent) setRecent(JSON.parse(savedRecent));
    } catch {
      // localStorage unavailable or corrupt — start fresh
    }
  }, []);

  // Persist pantry to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pantry));
    } catch {
      // ignore
    }
  }, [pantry]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addItem = (item: string) => {
    const clean = item.trim().toLowerCase();
    if (!clean) return;
    if (pantry.includes(clean)) return;
    setPantry((prev) => [...prev, clean]);

    // Track in recents (most-recent first, dedupe, cap at 12)
    setRecent((prev) => {
      const next = [clean, ...prev.filter((r) => r !== clean)].slice(0, 12);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const removeItem = (item: string) => {
    setPantry((prev) => prev.filter((p) => p !== item));
  };

  const clearPantry = () => {
    setPantry([]);
  };

  const handleDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (draft.trim()) {
        addItem(draft);
        setDraft('');
      }
    } else if (e.key === 'Backspace' && draft === '' && pantry.length > 0) {
      // Backspace on empty draft removes last chip
      setPantry((prev) => prev.slice(0, -1));
    }
  };

  const handleStart = () => {
    if (pantry.length === 0) return;
    setStarted(true);
    sendMessage({
      text: `Here's what I have in my pantry/fridge:\n\n${pantry.join(', ')}\n\nWhat should I cook tonight?`,
    });
  };

  const handleNewChat = () => {
    setStarted(false);
    // Note: useChat doesn't expose a clear method in v6 — page state reset on re-render
    window.location.reload();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const getMessageText = (message: { parts: Array<{ type: string; text?: string }> }) => {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('');
  };

  // Quick-add items that aren't already in the pantry
  const availableQuickAdd = QUICK_ADD.filter((item) => !pantry.includes(item));
  const availableRecent = recent.filter(
    (item) => !pantry.includes(item) && !QUICK_ADD.includes(item)
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tava 🍳</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tell me what&apos;s in your fridge. I&apos;ll tell you what to cook.
            </p>
          </div>
          {started && (
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              New chat
            </Button>
          )}
        </header>

        {!started ? (
          <Card className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Your pantry {pantry.length > 0 && `(${pantry.length})`}
                </label>
                {pantry.length > 0 && (
                  <button
                    onClick={clearPantry}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Pantry chips + inline input */}
              <div
                className="min-h-24 p-3 border rounded-md flex flex-wrap gap-2 items-start cursor-text bg-background"
                onClick={() => draftInputRef.current?.focus()}
              >
                {pantry.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-sm"
                  >
                    {item}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item);
                      }}
                      className="text-muted-foreground hover:text-foreground ml-0.5"
                      aria-label={`Remove ${item}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  ref={draftInputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleDraftKey}
                  placeholder={pantry.length === 0 ? 'Type an item and press Enter…' : ''}
                  className="flex-1 min-w-32 bg-transparent outline-none text-sm py-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter or comma to add. Backspace to remove the last. Staples (salt, oil, basic spices) are assumed.
              </p>
            </div>

            {availableRecent.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Recently used
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableRecent.map((item) => (
                    <button
                      key={item}
                      onClick={() => addItem(item)}
                      className="px-3 py-1 text-sm border rounded-full hover:bg-muted transition-colors"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Quick add
              </p>
              <div className="flex flex-wrap gap-2">
                {availableQuickAdd.map((item) => (
                  <button
                    key={item}
                    onClick={() => addItem(item)}
                    className="px-3 py-1 text-sm border rounded-full hover:bg-muted transition-colors"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleStart}
              disabled={pantry.length === 0}
              className="w-full"
              size="lg"
            >
              {pantry.length === 0 ? 'Add some ingredients first' : 'What can I cook?'}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <Card
                  className={`p-4 max-w-[85%] ${
                    m.role === 'user' ? 'bg-muted' : 'bg-card'
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {getMessageText(m)}
                    </ReactMarkdown>
                  </div>
                </Card>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <Card className="p-4 bg-card">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />

            <form onSubmit={handleSend} className="sticky bottom-4 pt-4">
              <Card className="p-2 flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pick a dish, ask follow-up, or refine…"
                  className="min-h-12 resize-none border-0 focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSend(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  Send
                </Button>
              </Card>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}