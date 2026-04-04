'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const INITIAL: Message[] = [
  {
    role: 'assistant',
    content: 'Olá! Sou o assistente de crédito rural da Projetista.Ai. Posso responder dúvidas sobre linhas de crédito (Pronaf, Pronamp, BNDES Agro, FNE/FNO/FCO), documentação necessária, taxas de juros, prazos e critérios de elegibilidade. Como posso ajudar?',
  },
]

const SUGGESTIONS = [
  'Quais documentos são necessários para o Pronaf Custeio?',
  'Qual o limite de financiamento do Pronamp?',
  'O que é CPR e como funciona?',
  'Quais são os critérios de elegibilidade do Pronaf?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '780px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '26px', color: '#010205', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Assistente IA
        </h1>
        <p style={{ color: '#878C91', fontSize: '14px' }}>Especialista em crédito rural brasileiro — Pronaf, Pronamp, BNDES Agro e mais.</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, background: '#fff', borderRadius: '14px', padding: '20px', overflowY: 'auto', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: '12px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '14px' }}>
            {m.role === 'assistant' && (
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#B95B37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 800, flexShrink: 0, marginRight: '10px', marginTop: '2px' }}>
                AI
              </div>
            )}
            <div style={{
              maxWidth: '72%', padding: '11px 15px',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? '#010205' : '#F3F3F3',
              color: m.role === 'user' ? '#fff' : '#010205',
              fontSize: '14px', lineHeight: 1.6,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#B95B37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 800, flexShrink: 0 }}>AI</div>
            <div style={{ background: '#F3F3F3', padding: '11px 15px', borderRadius: '14px 14px 14px 4px', fontSize: '14px', color: '#878C91' }}>Digitando...</div>
          </div>
        )}
        {messages.length === 1 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#878C91', marginBottom: '10px', fontWeight: 600 }}>SUGESTÕES</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{ textAlign: 'left', padding: '10px 14px', background: '#FAFAFA', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#010205', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px', background: '#fff', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pergunte sobre Pronaf, Pronamp, documentação, taxas..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'transparent', color: '#010205' }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading ? '#B95B37' : '#e5e7eb',
            color: input.trim() && !loading ? '#fff' : '#878C91',
            border: 'none', borderRadius: '8px', padding: '8px 16px',
            fontWeight: 700, fontSize: '14px', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
