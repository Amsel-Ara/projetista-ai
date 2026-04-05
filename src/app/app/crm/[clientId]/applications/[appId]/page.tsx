'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const DOC_TYPES = [
  { key: 'car',          label: 'Recibo do CAR' },
  { key: 'car_dem',      label: 'Demonstrativo CAR' },
  { key: 'itr',          label: 'ITR (Imposto Territorial Rural)' },
  { key: 'ccir',         label: 'CCIR 2024 (quitado)' },
  { key: 'matricula',    label: 'Matrícula atualizada do imóvel' },
  { key: 'arrendamento', label: 'Contrato de arrendamento/comodato' },
  { key: 'sanitaria',    label: 'Ficha sanitária animal' },
  { key: 'sintegra',     label: 'Sintegra' },
  { key: 'licenca',      label: 'Licenciamento Ambiental' },
  { key: 'outorga',      label: "Outorga d'água" },
  { key: 'vegetacao',    label: 'Laudo de Vegetação Nativa' },
  { key: 'projeto',      label: 'Projeto técnico' },
  { key: 'producao',     label: 'Laudo de produção' },
]

const MOCK_UPLOADED: Record<string, { name: string; status: 'completed' | 'processing' | 'needs_review' }> = {
  car:          { name: 'CAR_Fazenda_São_João.pdf',    status: 'completed' },
  itr:          { name: 'ITR_2024.pdf',                status: 'completed' },
  ccir:         { name: 'CCIR_2024_quitado.pdf',       status: 'completed' },
  matricula:    { name: 'Matricula_atualizada.pdf',     status: 'needs_review' },
  sintegra:     { name: 'Sintegra_export.pdf',          status: 'processing' },
  arrendamento: { name: 'Contrato_arrendamento.pdf',   status: 'completed' },
  sanitaria:    { name: 'Ficha_sanitaria.pdf',          status: 'completed' },
  licenca:      { name: 'Licenca_ambiental.pdf',        status: 'completed' },
  outorga:      { name: 'Outorga_agua.pdf',             status: 'completed' },
}

const STATUS_CFG = {
  completed:    { label: 'Processado',    color: 'var(--status-approved-color)',  bg: 'var(--status-approved-bg)',  icon: '✓' },
  processing:   { label: 'Processando…', color: 'var(--status-sent-color)',      bg: 'var(--status-sent-bg)',      icon: '⟳' },
  needs_review: { label: 'Revisar',       color: 'var(--status-pending-color)',   bg: 'var(--status-pending-bg)',   icon: '!' },
}

const NOTES = [
  { author: 'Amsel Ara', date: '30/03/2026 14:32', text: 'Matrícula precisa ser atualizada — a atual está com data de 2023. Solicitei ao cliente.' },
  { author: 'Amsel Ara', date: '28/03/2026 09:15', text: 'Cliente confirmou que enviará o Sintegra até sexta-feira.' },
]

export default function ApplicationDetailPage() {
  const { clientId, appId } = useParams()
  const [dragging, setDragging] = useState(false)
  const [uploaded, setUploaded] = useState(MOCK_UPLOADED)
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState(NOTES)

  const completed = Object.keys(uploaded).length
  const total = DOC_TYPES.length
  const pct = Math.round((completed / total) * 100)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    // In production: upload to Supabase Storage, trigger AI extraction
  }

  function addNote() {
    if (!note.trim()) return
    setNotes(prev => [{ author: 'Amsel Ara', date: new Date().toLocaleString('pt-BR'), text: note }, ...prev])
    setNote('')
  }

  return (
    <div style={{ maxWidth: '1040px' }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/app/crm">CRM</Link>
        <span>›</span>
        <Link href={`/app/crm/${clientId}`}>João Silva</Link>
        <span>›</span>
        <span className="active">Pronaf Custeio</span>
      </nav>

      {/* Application header card */}
      <div className="card" style={{ padding: '22px 28px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: 'var(--color-text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            Pronaf Custeio
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            João Silva · Banco do Brasil · Criado em 15/03/2026
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Progress summary */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              {pct}% completo
            </div>
            {/* Progress bar */}
            <div style={{ width: '120px', height: '6px', background: 'var(--color-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: '3px',
                background: pct === 100 ? 'var(--status-approved-color)' : 'var(--brand-orange)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
              {completed} de {total} docs
            </div>
          </div>

          {/* Status selector */}
          <select style={{
            padding: '8px 12px',
            border: '1.5px solid var(--status-analysis-color)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--status-analysis-color)',
            background: 'var(--status-analysis-bg)',
            outline: 'none',
            cursor: 'pointer',
          }}>
            <option>Em análise</option>
            <option>Rascunho</option>
            <option>Docs Pendentes</option>
            <option>Formulário Gerado</option>
            <option>Enviado</option>
            <option>Aprovado</option>
          </select>

          <button className="btn-secondary">Gerar Excel</button>
        </div>
      </div>

      {/* Two-column layout: docs left, notes right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* Left column: upload area + checklist */}
        <div>
          {/* Drag-and-drop upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('app-file-input')?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--brand-orange)' : 'var(--color-border)'}`,
              borderRadius: '12px',
              padding: '28px',
              textAlign: 'center',
              background: dragging ? 'var(--brand-orange-bg)' : 'var(--color-surface)',
              marginBottom: '16px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Upload icon */}
            <div style={{ width: '44px', height: '44px', margin: '0 auto 12px', borderRadius: '10px', background: 'var(--brand-orange-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" fill="none" stroke="var(--brand-orange)" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
            </div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '4px' }}>
              Arraste documentos aqui ou clique para selecionar
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
              PDF, JPG, PNG — o sistema identifica o tipo automaticamente
            </p>
            <input id="app-file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} />
          </div>

          {/* Document checklist */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Checklist de Documentos</h3>
            {DOC_TYPES.map((doc, i) => {
              const up = uploaded[doc.key]
              const cfg = up ? STATUS_CFG[up.status] : null
              return (
                <div
                  key={doc.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 0',
                    borderBottom: i < DOC_TYPES.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  }}
                >
                  {/* Status circle */}
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: cfg ? cfg.bg : 'var(--color-surface-2)',
                    color: cfg ? cfg.color : 'var(--color-border)',
                    border: cfg ? 'none' : '2px solid var(--color-border)',
                  }}>
                    {cfg ? cfg.icon : ''}
                  </div>

                  {/* Label + filename */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: up ? 600 : 400, color: up ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                      {doc.label}
                    </div>
                    {up && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {up.name}
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  {cfg && (
                    <span className="badge" style={{ color: cfg.color, background: cfg.bg, flexShrink: 0 }}>
                      {cfg.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column: team notes */}
        <div>
          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Notas da Equipe</h3>

            {/* Note input */}
            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Adicionar nota..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  boxSizing: 'border-box',
                  color: 'var(--color-text-primary)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--brand-orange)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(185,91,55,0.1)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={addNote}
                className="btn-secondary"
                style={{ marginTop: '8px', width: '100%', padding: '9px' }}
              >
                Salvar nota
              </button>
            </div>

            {/* Notes list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {notes.map((n, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: '3px solid var(--brand-orange)',
                    background: 'var(--color-surface-3)',
                    borderRadius: '0 6px 6px 0',
                    padding: '10px 12px 10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{n.author}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{n.date}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
