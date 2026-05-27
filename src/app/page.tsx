'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Home() {
  const [pantry, setPantry] = useState('');
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStart = () => {
    if (!pantry.trim()) return;
    setStarted(true);
    sendMessage({
      text: `Here's what I have in my pantry/fridge:\n\n${pantry}\n\nWhat should I cook tonight?`,
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  // Helper to extract text from v5+ UIMessage parts array
  const getMessageText = (message: { parts: Array<{ type: string; text?: string }> }) => {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('');
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Tava 🍳</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell me what&apos;s in your fridge. I&apos;ll tell you what to cook.
          </p>
        </header>

        {!started ? (
          <Card className="p-6">
            <label className="text-sm font-medium mb-2 block">
              What&apos;s in your pantry &amp; fridge right now?
            </label>
            <Textarea
              value={pantry}
              onChange={(e) => setPantry(e.target.value)}
              placeholder="e.g. paneer, tomatoes, onions, spinach, yogurt, besan, peanuts, leftover rice..."
              className="min-h-32 mb-4"
              autoFocus
            />
            <Button onClick={handleStart} disabled={!pantry.trim()} className="w-full">
              What can I cook?
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Tip: don&apos;t list staples (salt, oil, basic spices). I assume you have those.
            </p>
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
                  placeholder="Ask a follow-up, pick a dish, or change pantry..."
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