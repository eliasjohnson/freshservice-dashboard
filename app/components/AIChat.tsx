'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, X, Send, Paperclip, Mic, User, Bot } from 'lucide-react'
import { Button } from './ui/button'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

interface AIChatProps {
  context: any
  filters?: any
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChat({ context, filters }: AIChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const periodLabel = useMemo(() => {
    switch (filters?.timeRange) {
      case 'today':
        return 'Today'
      case 'week':
        return 'Last 7 days'
      case 'month':
        return 'Last 4 weeks'
      case 'quarter':
        return 'This quarter'
      case 'q1':
        return 'Q1 (Jan–Mar)'
      case 'q2':
        return 'Q2 (Apr–Jun)'
      case 'q3':
        return 'Q3 (Jul–Sep)'
      case 'q4':
        return 'Q4 (Oct–Dec)'
      default:
        return 'Selected period'
    }
  }, [filters?.timeRange])

  const agentScope = useMemo(() => {
    return filters?.agentId && filters.agentId !== 'all' ? `Agent ${filters.agentId}` : 'All agents'
  }, [filters?.agentId])

  useEffect(() => {
    if (!open) return
    // Scroll to bottom on new messages
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    if (!input.trim() || loading) return
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: input.trim() }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          context,
          filters,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Request failed')
      setMessages([...nextMessages, { role: 'assistant', content: data.reply } as ChatMessage])
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          aria-label="Open AI Analyst"
          onClick={() => setOpen(true)}
          className="rounded-full h-14 w-14 p-0 shadow-2xl border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/30"
        >
          <Bot className="h-7 w-7" />
        </Button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[95vw] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="AI Analysis"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50">
              <div className="flex items-center gap-3">
                {/* Terminal logo pill */}
                <div>
                  <div className="text-sm font-semibold leading-none">AI Analyst</div>
                </div>
              </div>
              <Button aria-label="Close" variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div ref={scrollRef} className="p-5 space-y-5 max-h-[60vh] overflow-auto">
              {messages.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  Ask about trends, risks, workload balance, or recommendations.
                </div>
              )}
              {messages.map((m, idx) => (
                <div key={idx} className={`flex items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="shrink-0 h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">
                      &gt;
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-background border text-foreground' : 'bg-muted text-foreground'}`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {error && (
                <div className="text-xs text-destructive">{error}</div>
              )}
            </div>
            <div className="p-4 border-t flex items-center gap-2 bg-background/60 backdrop-blur">
              <input
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={loading ? 'Generating…' : 'Type Here'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                disabled={loading}
                aria-label="Chat input"
              />
              <Button onClick={send} size="sm" disabled={loading || !input.trim()} className="h-10 px-4">
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}


