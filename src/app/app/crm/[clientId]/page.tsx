'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

/* ─── Mock data ─────────────────────────────────────────────────────────── */
const CLIENT = {
  id: '1',
  name: 'João Silva',
  initials: 'JS',
  whatsapp: '+55 (34) 99123-4567',
  email: 'joao.silva@fazenda.com.br',
  city: 'Uberaba',
  state: 'MG',
  farmName: 'Fazenda São João',
  farmAddress: 'Rodovia MG-050, km 120, Zona Rural',
  assignedTo: 'Amsel Ara',
  // Filled via documents later:
  cpf: '123.456.789-00',
  totalArea: '850 ha',
  carNumber: 'MG-3170206-9F3A2B1C4D5E6F7A',
  nirf: '1234567',
}

const APPLICATIONS = [
  {
    id: '1', program: 'Pronaf Custeio', bank: 'Banco do Brasil',
    status: 'Em análise', created: '15/03/2026',
    amount: 320000, commission: 2.5,
    docsComplete: 9, docsTotal: 13,
  },
  {
    id: '2', program: 'Pronaf Investimento', bank: 'Banco do Brasil',
    status: 'Rascunho', created: '28/03/2026',
    amount: 180000, commission: 2.0,
    docsComplete: 2, docsTotal: 13,
  },
]

const STATUS_CFG: Record<string, { color: string; bg: string; cls: string }> = {
  'Rascunho':           { color: '#878C91', bg: '#F3F3F3',  cls: 'badge badge-draft' },
  'Docs Pendentes':     { color: '#d97706', bg: '#fffbeb',  cls: 'badge badge-pending' },
  'Em análise':         { color: '#2563eb', bg: '#eff6ff',  cls: 'badge badge-analysis' },
  'Formulário Gerado':  { color: '#7c3aed', bg: '#f5f3ff',  cls: 'badge badge-generated' },
  'Enviado':            { color: '#B95B37', bg: '#FDF0EB',  cls: 'badge badge-sent' },
  'Aprovado':           { color: '#16a34a', bg: '#f0fdf4',  cls: 'badge badge-approved' },
}

/* ─── Document checklist ─────────────────────────────────────────────────── */
const DOC_TYPES = [
  { key: 'car',          label: 'Recibo do CAR',                        hasExpiry: true },
  { key: 'car_dem',      label: 'Demonstrativo CAR',                    hasExpiry: false },
  { key: 'itr',          label: 'ITR (Imposto Territorial Rural)',       hasExpiry: true },
  { key: 'ccir',         label: 'CCIR 2024 (quitado)',                  hasExpiry: true },
  { key: 'matricula',    label: 'Matrícula atualizada do imóvel',        hasExpiry: false },
  { key: 'arrendamento', label: 'Contrato de arrendamento/comodato',     hasExpiry: true },
  { key: 'sanitaria',    label: 'Ficha sanitária animal',               hasExpiry: true },
  { key: 'sintegra',     label: 'Sintegra',                             hasExpiry: true },
  { key: 'licenca',      label: 'Licenciamento Ambiental',              hasExpiry: true },
  { key: 'outorga',      label: "Outorga d'água",                       hasExpiry: true },
  { key: 'vegetacao',    label: 'Laudo de Vegetação Nativa',            hasExpiry: true },
  { key: 'projeto',      label: 'Projeto técnico',                      hasExpiry: false },
  { key: 'producao',     label: 'Laudo de produção',                    hasExpiry: false },
]

const MOCK_UPLOADED: Record<string, { name: string; status: 'completed' | 'processing' | 'needs_review'; expiry?: string }> = {
  car:          { name: 'CAR_Fazenda_São_João.pdf',  status: 'completed',    expiry: '2026-12-31' },
  itr:          { name: 'ITR_2024.pdf',              status: 'completed',    expiry: '2025-04-15' }, // expired
  ccir:         { name: 'CCIR_2024_quitado.pdf',     status: 'completed',    expiry: '2026-05-01' }, // expiring soon
  matricula:    { name: 'Matricula_atualizada.pdf',  status: 'needs_review', expiry: '' },
  sintegra:     { name: 'Sintegra_export.pdf',       status: 'processing',   expiry: '' },
  arrendamento: { name: 'Contrato_arrendamento.pdf', status: 'completed',    expiry: '2027-06-30' },
  sanitaria:    { name: 'Ficha_sanitaria.pdf',       status: 'completed',    expiry: '2026-09-01' },
  licenca:      { name: 'Licenca_ambiental.pdf',     status: 'completed',    expiry: '2028-01-01' },
  outorga:      { name: 'Outorga_agua.pdf',          status: 'completed',    expiry: '2027-03-15' },
}

const DOC_STATUS_CFG = {
  completed:    { label: 'Processado',    color: 'var(--status-approved-color)', bg: 'var(--status-approved-bg)',  icon: '✓' },
  processing:   { label: 'Processando…', color: 'var(--status-sent-color)',     bg: 'var(--status-sent-bg)',      icon: '⟳' },
  needs_review: { label: 'Revisar',       color: 'var(--status-pending-color)',  bg: 'var(--status-pending-bg)',   icon: '!' },
}

const NOTES = [
  { author: 'Amsel Ara', date: '30/03/2026 14:32', text: 'Matrícula precisa ser atualizada — a atual está com data de 2023. Solicitei ao cliente.' },
  { author: 'Amsel Ara', date: '28/03/2026 09:15', text: 'Cliente confirmou que enviará o Sintegra até sexta-feira.' },
]

/* ─── Mock extracted fields (Tab 3) ─────────────────────────────────────── */
const EXTRACTED_FIELDS = [
  { label: 'Nome completo',       value: 'João da Silva',                    source: 'CPF / RG',    verified: true },
  { label: 'CPF',                 value: '123.456.789-00',                   source: 'CPF / RG',    verified: true },
  { label: 'Número CAR',          value: 'MG-3170206-9F3A2B1C4D5E6F7A',     source: 'Recibo CAR',  verified: true },
  { label: 'Área total (CAR)',    value: '850 ha',                           source: 'Recibo CAR',  verified: true },
  { label: 'NIRF',                value: '1234567',                          source: 'CCIR 2024',   verified: false },
  { label: 'Módulo fiscal',       value: '—',                                source: 'CCIR 2024',   verified: false },
  { label: 'Número matrícula',    value: 'Pendente',                         source: 'Matrícula',   verified: false },
  { label: 'Número DAP/CAF',      value: 'Pendente',                         source: 'DAP / CAF',   verified: false },
  { label: 'Tipo de rebanho',     value: 'Pendente',                         source: 'Ficha sanitária', verified: false },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function expiryStatus(dateStr: string): 'ok' | 'soon' | 'expired' | 'none' {
  if (!dateStr) return 'none'
  const expiry = new Date(dateStr)
  const today  = new Date()
  const diff   = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0)  return 'expired'
  if (diff < 30) return 'soon'
  return 'ok'
}

const EXPIRY_DOT: Record<string, { color: string; label: string }> = {
  ok:      { color: '#16a34a', label: 'Válido' },
  soon:    { color: '#d97706', label: 'Vence em breve' },
  expired: { color: '#dc2626', label: 'Vencido' },
  none:    { color: '#d1d5db', label: '' },
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function ClientProfilePage() {
  const { clientId } = useParams()
  const searchParams  = useSearchParams()

  const [tab,          setTab]         = useState<'overview' | 'docs' | 'data'>('overview')
  const [activeAppId,  setActiveAppId] = useState(APPLICATIONS[0].id)
  const [dragging,     setDragging]    = useState(false)
  const [uploaded,     setUploaded]    = useState(MOCK_UPLOADED)
  const [expiryDates,  setExpiryDates] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(MOCK_UPLOADED).map(([k, v]) => [k, v.expiry ?? '']))
  )
  const [note,         setNote]        = useState('')
  const [notes,        setNotes]       = useState(NOTES)
  const [appStatus,    setAppStatus]   = useState<Record<string, string>>(
    Object.fromEntries(APPLICATIONS.map(a => [a.id, a.status]))
  )

  // Read ?tab=docs from URL (after "Salvar e fazer upload")
  useEffect(() => {
    if (searchParams.get('tab') === 'docs') setTab('docs')
  }, [searchParams])

  const activeApp = APPLICATIONS.find(a => a.id === activeAppId) ?? APPLICATIONS[0]
  const appPct    = Math.round((activeApp.docsComplete / activeApp.docsTotal) * 100)
  const projectedFee = activeApp.amount * activeApp.commission / 100

  // Missing docs for active application
  const missingDocs  = DOC_TYPES.filter(d => !uploaded[d.key])
  const expiringDocs = DOC_TYPES.filter(d => {
    const status = expiryStatus(expiryDates[d.key] ?? '')
    return status === 'soon' || status === 'expired'
  })

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    // In production: upload to Supabase Storage
  }

  function addNote() {
    if (!note.trim()) return
    setNotes(prev => [{ author: 'Amsel Ara', date: new Date().toLocaleString('pt-BR'), text: note }, ...prev])
    setNote('')
  }

  /* ── Tab button ── */
  function TabBtn({ id, label }: { id: typeof tab; label: string }) {
    const active = tab === id
    return (
      <button onClick={() => setTab(id)} style={{
        padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
        fontSize: '14px', fontWeight: 600,
        background: active ? '#010205' : '#fff',
        color:      active ? '#fff'    : '#878C91',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'background 0.15s, color 0.15s',
      }}>
        {label}
      </button>
    )
  }

  return (
    <div style={{ maxWidth: '980px' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontSize: '13px', color: '#878C91' }}>
        <Link href="/app/crm" style={{ color: '#878C91', textDecoration: 'none' }}>CRM</Link>
        <span>›</span>
        <span style={{ color: '#010205', fontWeight: 600 }}>{CLIENT.name}</span>
      </div>

      {/* ── Client header card ── */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px 28px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FDF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#B95B37', flexShrink: 0 }}>
              {CLIENT.initials}
            </div>
            <div>
              <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '22px', color: '#010205', letterSpacing: '-0.5px', marginBottom: '2px' }}>{CLIENT.name}</h1>
              <div style={{ fontSize: '13px', color: '#878C91' }}>{CLIENT.farmName} · {CLIENT.city}, {CLIENT.state}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ padding: '9px 16px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#010205' }}>
              Editar
            </button>
            <button
              onClick={() => setTab('docs')}
              style={{ padding: '9px 16px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Nova Solicitação
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        <TabBtn id="overview" label="Visão Geral" />
        <TabBtn id="docs"     label="Documentos" />
        <TabBtn id="data"     label="Dados da Solicitação" />
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 1 — VISÃO GERAL                                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Contact card */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '16px' }}>Contato</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { icon: '💬', label: 'WhatsApp', value: CLIENT.whatsapp },
                  { icon: '✉️', label: 'Email', value: CLIENT.email },
                  { icon: '📍', label: 'Localização', value: `${CLIENT.city} — ${CLIENT.state}` },
                  { icon: '🏡', label: 'Fazenda', value: CLIENT.farmName },
                  { icon: '👤', label: 'Responsável', value: CLIENT.assignedTo },
                  { icon: '📄', label: 'CPF', value: CLIENT.cpf },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#878C91', letterSpacing: '0.5px', marginBottom: '3px', textTransform: 'uppercase' }}>
                      {f.icon} {f.label}
                    </div>
                    <div style={{ fontSize: '14px', color: '#010205', fontWeight: 500 }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Applications mini-list */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Solicitações</div>
                <button onClick={() => setTab('docs')} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-orange)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  + Nova
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {APPLICATIONS.map(app => {
                  const cfg = STATUS_CFG[app.status] ?? STATUS_CFG['Rascunho']
                  const pct = Math.round((app.docsComplete / app.docsTotal) * 100)
                  return (
                    <div
                      key={app.id}
                      onClick={() => { setActiveAppId(app.id); setTab('docs') }}
                      style={{ padding: '14px 16px', borderRadius: '10px', border: '1.5px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-orange)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(185,91,55,0.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)';  e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#010205' }}>{app.program}</div>
                        <span style={{ background: cfg.bg, color: cfg.color, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>{app.status}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '5px', background: '#F3F3F3', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : '#B95B37', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#878C91', flexShrink: 0 }}>{app.docsComplete}/{app.docsTotal} docs</span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#878C91' }}>
                        {app.bank} · R$ {app.amount.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Loan summary */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '16px' }}>Resumo Financeiro</div>
              {APPLICATIONS.map(app => (
                <div key={app.id} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#878C91', marginBottom: '8px' }}>{app.program}</div>
                  {[
                    { label: 'Valor solicitado', value: `R$ ${app.amount.toLocaleString('pt-BR')}` },
                    { label: 'Comissão', value: `${app.commission}%` },
                    { label: 'Comissão estimada', value: `R$ ${(app.amount * app.commission / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, highlight: true },
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#878C91' }}>{f.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: f.highlight ? 800 : 600, color: f.highlight ? 'var(--brand-orange)' : '#010205', fontFamily: f.highlight ? 'Manrope, sans-serif' : 'inherit' }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Pendências tracker */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '16px' }}>
                Pendências
                {(missingDocs.length + expiringDocs.length) > 0 && (
                  <span style={{ marginLeft: '8px', background: '#FDF0EB', color: 'var(--brand-orange)', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                    {missingDocs.length + expiringDocs.length}
                  </span>
                )}
              </div>

              {missingDocs.length === 0 && expiringDocs.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✓</span> Todos os documentos em dia
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {expiringDocs.map(doc => {
                    const st = expiryStatus(expiryDates[doc.key] ?? '')
                    const dotInfo = EXPIRY_DOT[st]
                    return (
                      <div key={doc.key} onClick={() => setTab('docs')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: st === 'expired' ? '#fef2f2' : '#fffbeb', cursor: 'pointer' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotInfo.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#010205' }}>{doc.label}</div>
                        <div style={{ fontSize: '11px', color: dotInfo.color, fontWeight: 600 }}>{dotInfo.label}</div>
                      </div>
                    )
                  })}
                  {missingDocs.map(doc => (
                    <div key={doc.key} onClick={() => setTab('docs')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'var(--color-surface-3)', cursor: 'pointer' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d1d5db', border: '2px solid #9ca3af', flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: '12px', color: '#878C91' }}>{doc.label}</div>
                      <div style={{ fontSize: '11px', color: '#878C91' }}>Faltando</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2 — DOCUMENTOS                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === 'docs' && (
        <div>
          {/* Application selector + header */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Application selector */}
              <select
                value={activeAppId}
                onChange={e => setActiveAppId(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', background: '#fff', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}
              >
                {APPLICATIONS.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.program} — {app.bank}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Criado em {activeApp.created}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Progress */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>{appPct}% completo</div>
                <div style={{ width: '120px', height: '5px', background: 'var(--color-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${appPct}%`, height: '100%', background: appPct === 100 ? '#16a34a' : 'var(--brand-orange)', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>{activeApp.docsComplete} de {activeApp.docsTotal} docs</div>
              </div>

              {/* Status selector */}
              <select
                value={appStatus[activeAppId]}
                onChange={e => setAppStatus(prev => ({ ...prev, [activeAppId]: e.target.value }))}
                style={{ padding: '8px 12px', border: `1.5px solid ${STATUS_CFG[appStatus[activeAppId]]?.color ?? '#878C91'}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: STATUS_CFG[appStatus[activeAppId]]?.color ?? '#878C91', background: STATUS_CFG[appStatus[activeAppId]]?.bg ?? '#F3F3F3', cursor: 'pointer' }}
              >
                {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button className="btn-secondary">Gerar Excel</button>
            </div>
          </div>

          {/* Two-column: docs + notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>

            {/* Left: upload + checklist */}
            <div>
              {/* Upload zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('doc-file-input')?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--brand-orange)' : 'var(--color-border)'}`,
                  borderRadius: '12px', padding: '28px', textAlign: 'center',
                  background: dragging ? 'var(--brand-orange-bg)' : 'var(--color-surface)',
                  marginBottom: '16px', cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ width: '44px', height: '44px', margin: '0 auto 12px', borderRadius: '10px', background: 'var(--brand-orange-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" fill="none" stroke="var(--brand-orange)" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
                  </svg>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '4px' }}>Arraste documentos aqui ou clique para selecionar</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>PDF, JPG, PNG — o sistema identifica o tipo automaticamente</p>
                <input id="doc-file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} />
              </div>

              {/* Checklist */}
              <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '16px' }}>Checklist de Documentos</div>
                {DOC_TYPES.map((doc, i) => {
                  const up   = uploaded[doc.key]
                  const cfg  = up ? DOC_STATUS_CFG[up.status] : null
                  const date = expiryDates[doc.key] ?? ''
                  const est  = doc.hasExpiry ? expiryStatus(date) : 'none'
                  const dot  = EXPIRY_DOT[est]

                  return (
                    <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: i < DOC_TYPES.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                      {/* Status circle */}
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        background: cfg ? cfg.bg : 'var(--color-surface-2)',
                        color: cfg ? cfg.color : 'var(--color-border)',
                        border: cfg ? 'none' : '2px solid var(--color-border)',
                      }}>
                        {cfg ? cfg.icon : ''}
                      </div>

                      {/* Label + filename */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: up ? 600 : 400, color: up ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                          {doc.label}
                        </div>
                        {up && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {up.name}
                          </div>
                        )}
                      </div>

                      {/* Expiry date field */}
                      {doc.hasExpiry && up && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {est !== 'none' && (
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot.color, flexShrink: 0 }} title={dot.label} />
                          )}
                          <input
                            type="date"
                            value={date}
                            onChange={e => setExpiryDates(prev => ({ ...prev, [doc.key]: e.target.value }))}
                            style={{ fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '3px 6px', color: 'var(--color-text-secondary)', background: '#fff', cursor: 'pointer', width: '120px' }}
                          />
                        </div>
                      )}

                      {/* Status badge */}
                      {cfg && !doc.hasExpiry && (
                        <span className="badge" style={{ color: cfg.color, background: cfg.bg, flexShrink: 0 }}>{cfg.label}</span>
                      )}
                      {cfg && doc.hasExpiry && (
                        <span className="badge" style={{ color: cfg.color, background: cfg.bg, flexShrink: 0 }}>{cfg.label}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: team notes */}
            <div>
              <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '16px' }}>Notas da Equipe</div>
                <div style={{ marginBottom: '20px' }}>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Adicionar nota..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box', color: 'var(--color-text-primary)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand-orange)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(185,91,55,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)';  e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <button onClick={addNote} className="btn-secondary" style={{ marginTop: '8px', width: '100%', padding: '9px' }}>
                    Salvar nota
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notes.map((n, i) => (
                    <div key={i} style={{ borderLeft: '3px solid var(--brand-orange)', padding: '10px 12px', background: 'var(--color-surface-3)', borderRadius: '0 6px 6px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
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
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 3 — DADOS DA SOLICITAÇÃO                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === 'data' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

          {/* Left: manual input */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '4px' }}>Finalidade e Dados Econômicos</div>
            <div style={{ fontSize: '12px', color: '#878C91', marginBottom: '20px' }}>Preenchido pelo projetista — complementa os dados extraídos dos documentos.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Finalidade do crédito</div>
                <textarea rows={3} placeholder="Descreva o que o produtor irá fazer com o crédito..." style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box', color: 'var(--color-text-primary)' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Cultura principal</div>
                <select style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-primary)', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Selecionar…</option>
                  {['Soja', 'Milho', 'Cana-de-açúcar', 'Café', 'Algodão', 'Gado de corte', 'Gado leiteiro', 'Outro'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {[
                { label: 'Área a financiar (ha)', placeholder: '850' },
                { label: 'Produção estimada (t)', placeholder: '3.200' },
                { label: 'Renda bruta anual estimada (R$)', placeholder: '1.200.000' },
                { label: 'Outras dívidas (R$)', placeholder: '0' },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{f.label}</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} placeholder={f.placeholder} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Garantias oferecidas</div>
                <textarea rows={2} placeholder="Ex: Penhor agrícola, hipoteca do imóvel..." style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box', color: 'var(--color-text-primary)' }} />
              </div>
              <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>Salvar dados</button>
            </div>
          </div>

          {/* Right: extracted data verification */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '4px' }}>Dados Extraídos dos Documentos</div>
            <div style={{ fontSize: '12px', color: '#878C91', marginBottom: '20px' }}>Extraídos automaticamente via leitura de documentos. Verifique e corrija se necessário.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {EXTRACTED_FIELDS.map((field, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: i < EXTRACTED_FIELDS.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#878C91', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>{field.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: field.value === 'Pendente' ? '#d1d5db' : '#010205' }}>
                      {field.value}
                    </div>
                    <div style={{ fontSize: '11px', color: '#878C91', marginTop: '1px' }}>Fonte: {field.source}</div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                    background: field.verified ? '#f0fdf4' : '#F3F3F3',
                    color:      field.verified ? '#16a34a' : '#878C91',
                  }}>
                    {field.verified ? 'Verificado ✓' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
