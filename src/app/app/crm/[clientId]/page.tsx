'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveChecklist, fetchPrograms, BANK_SLUGS, CATEGORY_LABELS, type ChecklistItem, type CreditProgram } from '@/lib/credit-programs'
import DocumentViewer from './DocumentViewer'
import IdentificacaoSection from './sections/IdentificacaoSection'
import ImoveisSection from './sections/ImoveisSection'
import SemovEntesSection from './sections/SemovEntesSection'
import BensMoveisSection from './sections/BensMoveisSection'
import { ProdAgricolaSection } from './sections/ProdAgricolaSection'
import { ProdPecuariaSection } from './sections/ProdPecuariaSection'
import FinanceiroSection from './sections/FinanceiroSection'

type ClientData = {
  id: string; name: string; initials: string; whatsapp: string; email: string
  city: string; state: string; farmName: string; farmAddress: string
  assignedTo: string; cpf: string
  // Pessoa & Contato extended fields
  cnpj: string; razaoSocial: string; cnae: string; naturezaJuridica: string
  dateOfBirth: string; cpfStatus: string
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; ibgeCode: string; comoConheceu: string
}

type AppData = {
  id: string; program: string; programCode: string; bank: string; status: string; created: string
  amount: number; commission: number; docsComplete: number; docsTotal: number
  docChecklist: ChecklistItem[] | null
}

const CLIENT_EMPTY: ClientData = {
  id: '', name: '…', initials: '?', whatsapp: '', email: '',
  city: '', state: '', farmName: '', farmAddress: '',
  assignedTo: '', cpf: '',
  cnpj: '', razaoSocial: '', cnae: '', naturezaJuridica: '',
  dateOfBirth: '', cpfStatus: '',
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', ibgeCode: '', comoConheceu: '',
}

const STATUS_CFG: Record<string, { color: string; bg: string; cls: string }> = {
  'Rascunho':           { color: '#878C91', bg: '#F3F3F3',  cls: 'badge badge-draft' },
  'Docs Pendentes':     { color: '#d97706', bg: '#fffbeb',  cls: 'badge badge-pending' },
  'Em análise':         { color: '#2563eb', bg: '#eff6ff',  cls: 'badge badge-analysis' },
  'Formulário Gerado':  { color: '#7c3aed', bg: '#f5f3ff',  cls: 'badge badge-generated' },
  'Enviado':            { color: '#B95B37', bg: '#FDF0EB',  cls: 'badge badge-sent' },
  'Aprovado':           { color: '#16a34a', bg: '#f0fdf4',  cls: 'badge badge-approved' },
}

const ORG_ID = 'a0000000-0000-0000-0000-000000000001'
const BANKS  = ['Banco do Brasil', 'Bradesco', 'Sicoob', 'Cresol', 'BNB']

type UploadedDoc = {
  id: string
  doc_type: string
  file_name: string
  file_path: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  expiry_date: string | null
  extracted_fields: Record<string, any> | null
  created_at: string
}

const DOC_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: 'Enviado',       color: '#878C91',                       bg: '#F3F3F3',                        icon: '↑' },
  processing: { label: 'Processando…', color: 'var(--status-sent-color)',     bg: 'var(--status-sent-bg)',          icon: '⟳' },
  completed:  { label: 'Processado',    color: 'var(--status-approved-color)', bg: 'var(--status-approved-bg)',      icon: '✓' },
  failed:     { label: 'Erro',          color: '#dc2626',                      bg: '#fef2f2',                        icon: '!' },
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function expiryDaysLeft(dateStr: string): number {
  if (!dateStr) return Infinity
  const expiry = new Date(dateStr)
  const today  = new Date()
  return (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
}

function expiryStatus(dateStr: string): 'ok' | 'soon' | 'expired' | 'none' {
  if (!dateStr) return 'none'
  const diff = expiryDaysLeft(dateStr)
  if (diff < 0)  return 'expired'
  if (diff < 30) return 'soon'
  return 'ok'
}

function expiryLabel(dateStr: string): string {
  if (!dateStr) return ''
  const diff = expiryDaysLeft(dateStr)
  if (diff < 0)  return 'Vencido'
  if (diff < 30) return `Vence em ${Math.ceil(diff)} dias`
  return 'Válido'
}

const EXPIRY_COLOR: Record<string, string> = {
  ok:      '#16a34a',
  soon:    '#d97706',
  expired: '#dc2626',
  none:    '#d1d5db',
}

/* ─── Cadastro tab types & helpers ──────────────────────────────────────── */
type CadastroSection = 'identificacao' | 'imoveis' | 'semoventes' | 'bens_moveis' | 'prod_agricola' | 'prod_pecuaria' | 'financeiro'

const CADASTRO_NAV: { id: CadastroSection; label: string; icon: string }[] = [
  { id: 'identificacao', label: 'Identificação',   icon: '👤' },
  { id: 'imoveis',       label: 'Imóveis Rurais',  icon: '🏡' },
  { id: 'semoventes',    label: 'Semoventes',      icon: '🐄' },
  { id: 'bens_moveis',   label: 'Bens Móveis',     icon: '🚜' },
  { id: 'prod_agricola', label: 'Prod. Agrícola',  icon: '🌾' },
  { id: 'prod_pecuaria', label: 'Prod. Pecuária',  icon: '🐖' },
  { id: 'financeiro',    label: 'Financeiro',      icon: '💰' },
]

type Completeness = 'complete' | 'partial' | 'empty'

const DOT: Record<Completeness, { symbol: string; color: string }> = {
  complete: { symbol: '●', color: '#16a34a' },
  partial:  { symbol: '◐', color: '#d97706' },
  empty:    { symbol: '○', color: '#d1d5db' },
}

function sectionCompleteness(
  section: CadastroSection,
  client: ClientData,
  propCount: number,
): Completeness {
  switch (section) {
    case 'identificacao': {
      const filled = [client.name, client.cpf, client.whatsapp, client.email].filter(Boolean)
      if (filled.length === 4) return 'complete'
      if (filled.length > 0)  return 'partial'
      return 'empty'
    }
    case 'imoveis':
      return propCount > 0 ? 'partial' : 'empty'
    default:
      return 'empty'
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function ClientProfilePage() {
  const { clientId }  = useParams()
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const supabase      = createClient()

  const [clientData,   setClientData]  = useState<ClientData>(CLIENT_EMPTY)
  const [applications, setApplications] = useState<AppData[]>([])
  const [dataLoading,  setDataLoading] = useState(true)

  // Fetch current user name for notes
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      setCurrentUser(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário')
    })
  }, [])

  // Load client + applications from Supabase
  useEffect(() => {
    if (!clientId) return
    async function load() {
      setDataLoading(true)
      const [clientRes, appsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('applications').select('*, documents(id), program_code, doc_checklist').eq('client_id', clientId).order('created_at'),
      ])
      if (clientRes.data) {
        const c = clientRes.data
        const name = c.name ?? ''
        const parts = name.trim().split(' ')
        const initials = parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase()
        setClientData({
          id: c.id, name, initials,
          whatsapp:         c.whatsapp          ?? '',
          email:            c.email             ?? '',
          city:             c.city              ?? '',
          state:            c.state             ?? '',
          farmName:         c.farm_name         ?? '',
          farmAddress:      c.farm_address      ?? '',
          assignedTo:       '',
          cpf:              c.cpf               ?? '',
          cnpj:             c.cnpj              ?? '',
          razaoSocial:      c.razao_social       ?? '',
          cnae:             c.cnae              ?? '',
          naturezaJuridica: c.natureza_juridica  ?? '',
          dateOfBirth:      c.date_of_birth     ?? '',
          cpfStatus:        c.cpf_status        ?? '',
          cep:              c.cep               ?? '',
          logradouro:       c.logradouro        ?? '',
          numero:           c.numero            ?? '',
          complemento:      c.complemento       ?? '',
          bairro:           c.bairro            ?? '',
          ibgeCode:         c.ibge_code         ?? '',
          comoConheceu:     c.como_conheceu     ?? '',
        })
      }
      if (appsRes.data) {
        setApplications(appsRes.data.map((a: any) => ({
          id:          a.id,
          program:     a.loan_type   ?? '',
          programCode: a.program_code ?? '',
          bank:        a.bank        ?? '',
          status:      a.status      ?? 'Rascunho',
          created:     new Date(a.created_at).toLocaleDateString('pt-BR'),
          amount:      a.amount      ?? 0,
          commission:  a.commission_pct ?? 0,
          docsComplete: (a.documents ?? []).length,
          docsTotal:   (a.doc_checklist ?? []).length || 1,
          docChecklist: a.doc_checklist ?? null,
        })))
      }
      setDataLoading(false)
    }
    load()
  }, [clientId])

  // Use loaded applications or empty array for derived state
  const APPLICATIONS = applications

  const [currentUser,  setCurrentUser]  = useState('')
  const [editOpen,     setEditOpen]    = useState(false)
  const [editForm,     setEditForm]    = useState({ name: '', whatsapp: '', email: '', cpf: '', city: '', state: '', farmName: '', farmAddress: '' })
  const [editSaving,   setEditSaving]  = useState(false)
  const [editError,    setEditError]   = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting,     setDeleting]    = useState(false)
  const [tab,          setTab]         = useState<'overview' | 'docs' | 'cadastro'>('overview')
  const [cadastroSection, setCadastroSection] = useState<CadastroSection>('identificacao')
  const [activeAppId,  setActiveAppId] = useState('')
  const [dragging,     setDragging]    = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [uploading,    setUploading]   = useState(false)
  const [viewerDoc,    setViewerDoc]   = useState<UploadedDoc | null>(null)
  const [appStatus,    setAppStatus]   = useState<Record<string, string>>(
    Object.fromEntries(APPLICATIONS.map(a => [a.id, a.status]))
  )
  const [newSolDrawer,  setNewSolDrawer]  = useState(false)
  const [newSolForm,    setNewSolForm]    = useState({ category: 'custeio', programCode: '', bank: 'Banco do Brasil', amount: '', commission: '' })
  const [newSolSaving,  setNewSolSaving]  = useState(false)
  const [newSolError,   setNewSolError]   = useState('')
  const [programs,      setPrograms]      = useState<CreditProgram[]>([])
  const [docChecklist,  setDocChecklist]  = useState<ChecklistItem[]>([])
  const [editSolId,     setEditSolId]     = useState<string | null>(null)
  const [editSolForm,   setEditSolForm]   = useState({ amount: '', commission: '' })
  const [editSolSaving, setEditSolSaving] = useState(false)
  const [editSolError,  setEditSolError]  = useState('')
  const [deleteSolId,   setDeleteSolId]   = useState<string | null>(null)
  const [deletingSol,   setDeletingSol]   = useState(false)

  // ── Property count for completeness indicator ──
  const [propCount, setPropCount] = useState(0)

  // Read ?tab=docs from URL (after "Salvar e fazer upload")
  useEffect(() => {
    if (searchParams.get('tab') === 'docs') setTab('docs')
  }, [searchParams])

  // Sync activeAppId when applications load
  useEffect(() => {
    if (applications.length > 0 && !activeAppId) {
      setActiveAppId(applications[0].id)
    }
  }, [applications])

  // Load credit programs for the Nova Solicitação drawer
  useEffect(() => {
    fetchPrograms(supabase, BANK_SLUGS[newSolForm.bank] ?? 'banco_do_brasil').then(progs => {
      setPrograms(progs)
      // Pre-select first custeio program
      const first = progs.find(p => p.category === 'custeio')
      if (first) setNewSolForm(f => ({ ...f, programCode: first.code }))
    })
  }, [newSolForm.bank])

  // Load checklist when active application changes
  useEffect(() => {
    if (!activeAppId) return
    const app = applications.find(a => a.id === activeAppId)
    if (!app) return
    if (app.docChecklist && app.docChecklist.length > 0) {
      setDocChecklist(app.docChecklist)
    } else if (app.programCode) {
      // Legacy fallback: fetch live if no snapshot
      const bankSlug = BANK_SLUGS[app.bank] ?? 'banco_do_brasil'
      resolveChecklist(supabase, app.programCode, bankSlug).then(setDocChecklist)
    } else {
      setDocChecklist([])
    }
  }, [activeAppId, applications])

  // Load uploaded documents when active application changes
  useEffect(() => {
    if (!activeAppId) { setUploadedDocs([]); return }
    async function loadDocs() {
      const { data } = await supabase
        .from('documents')
        .select('id, doc_type, file_name, file_path, status, expiry_date, created_at, extracted_fields(fields)')
        .eq('application_id', activeAppId)
        .order('created_at')
      if (data) {
        setUploadedDocs(data.map((d: any) => ({
          id: d.id,
          doc_type: d.doc_type,
          file_name: d.file_name,
          file_path: d.file_path,
          status: d.status,
          expiry_date: d.expiry_date,
          extracted_fields: d.extracted_fields?.[0]?.fields ?? d.extracted_fields?.fields ?? null,
          created_at: d.created_at,
        })))
      }
    }
    loadDocs()
  }, [activeAppId])

  // Supabase Realtime: listen for document status changes
  useEffect(() => {
    if (!activeAppId) return
    const channel = supabase
      .channel(`docs-${activeAppId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'documents',
        filter: `application_id=eq.${activeAppId}`,
      }, async (payload) => {
        const updated = payload.new as any
        // Update the doc in state
        setUploadedDocs(prev => prev.map(d =>
          d.id === updated.id
            ? { ...d, doc_type: updated.doc_type, status: updated.status, expiry_date: updated.expiry_date }
            : d
        ))
        // Fetch extracted_fields for this document
        const { data: ef } = await supabase
          .from('extracted_fields')
          .select('fields')
          .eq('document_id', updated.id)
          .maybeSingle()
        if (ef) {
          setUploadedDocs(prev => prev.map(d =>
            d.id === updated.id ? { ...d, extracted_fields: ef.fields } : d
          ))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeAppId])


  // Derived: lookup of uploaded docs by doc_type
  const docsByKey: Record<string, UploadedDoc[]> = {}
  for (const d of uploadedDocs) {
    if (!docsByKey[d.doc_type]) docsByKey[d.doc_type] = []
    docsByKey[d.doc_type].push(d)
  }

  const activeApp    = APPLICATIONS.find(a => a.id === activeAppId) ?? APPLICATIONS[0]
  // Progress: count unique doc_keys with at least one completed upload
  const completedDocKeys = new Set(uploadedDocs.filter(d => d.status === 'completed' && d.doc_type !== 'unknown').map(d => d.doc_type))
  const appPct       = activeApp && docChecklist.length > 0
    ? Math.round((completedDocKeys.size / docChecklist.length) * 100)
    : 0
  const projectedFee = activeApp ? activeApp.amount * activeApp.commission / 100 : 0

  // Missing docs for active application (no uploaded doc or no completed doc)
  const missingDocs  = docChecklist.filter(d => {
    const docs = docsByKey[d.doc_key]
    return !docs || !docs.some(ud => ud.status === 'completed')
  })
  const expiringDocs = docChecklist.filter(d => {
    if (!d.has_expiry) return false
    const docs = docsByKey[d.doc_key]
    if (!docs) return false
    const latestCompleted = docs.filter(ud => ud.status === 'completed' && ud.expiry_date).pop()
    if (!latestCompleted?.expiry_date) return false
    const status = expiryStatus(latestCompleted.expiry_date)
    return status === 'soon' || status === 'expired'
  })

  // Upload handler
  async function handleUpload(files: FileList | File[]) {
    if (!activeAppId) return
    setUploading(true)
    for (const file of Array.from(files)) {
      // Optimistic: add pending entry
      const tempId = crypto.randomUUID()
      setUploadedDocs(prev => [...prev, {
        id: tempId,
        doc_type: 'unknown',
        file_name: file.name,
        file_path: '',
        status: 'pending',
        expiry_date: null,
        extracted_fields: null,
        created_at: new Date().toISOString(),
      }])

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('application_id', activeAppId)
        const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Upload failed')
        const doc = json.document
        // Replace temp entry with real data
        setUploadedDocs(prev => prev.map(d =>
          d.id === tempId ? { ...d, id: doc.id, file_path: doc.file_path, status: doc.status } : d
        ))
      } catch (err: any) {
        console.error('[upload] Error:', err)
        // Mark temp entry as failed
        setUploadedDocs(prev => prev.map(d =>
          d.id === tempId ? { ...d, status: 'failed' as const } : d
        ))
      }
    }
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
  }

  function openEdit() {
    setEditForm({
      name:        clientData.name,
      whatsapp:    clientData.whatsapp,
      email:       clientData.email,
      cpf:         clientData.cpf,
      city:        clientData.city,
      state:       clientData.state,
      farmName:    clientData.farmName,
      farmAddress: clientData.farmAddress,
    })
    setEditError('')
    setDeleteConfirm(false)
    setEditOpen(true)
  }

  async function handleEditSave() {
    if (!editForm.name.trim()) { setEditError('Nome é obrigatório.'); return }
    setEditSaving(true)
    setEditError('')
    const { error } = await supabase
      .from('clients')
      .update({
        name:         editForm.name,
        whatsapp:     editForm.whatsapp || null,
        email:        editForm.email    || null,
        cpf:          editForm.cpf      || null,
        city:         editForm.city     || null,
        state:        editForm.state    || null,
        farm_name:    editForm.farmName    || null,
        farm_address: editForm.farmAddress || null,
      })
      .eq('id', clientId as string)
    if (error) {
      setEditError('Erro ao salvar. Tente novamente.')
      setEditSaving(false)
      return
    }
    // Refresh client data in-place
    const parts = editForm.name.trim().split(/\s+/)
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : editForm.name.slice(0, 2).toUpperCase()
    setClientData(prev => ({ ...prev, ...editForm, farmName: editForm.farmName, farmAddress: editForm.farmAddress, initials }))
    setEditSaving(false)
    setEditOpen(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', clientId as string)
    router.push('/app/crm')
  }

  async function handleCreateSol() {
    if (!newSolForm.programCode) { setNewSolError('Selecione um programa de crédito.'); return }
    setNewSolSaving(true)
    setNewSolError('')

    const bankSlug   = BANK_SLUGS[newSolForm.bank] ?? 'banco_do_brasil'
    const amountNum  = parseFloat(newSolForm.amount.replace(/\./g, '').replace(',', '.')) || null
    const commNum    = parseFloat(newSolForm.commission.replace(',', '.')) || null

    // Resolve checklist snapshot before INSERT
    const checklist = await resolveChecklist(supabase, newSolForm.programCode, bankSlug)

    // Display name for the selected program
    const selectedProg = programs.find(p => p.code === newSolForm.programCode)
    const displayName  = selectedProg?.display_name ?? newSolForm.programCode

    const { data, error } = await supabase
      .from('applications')
      .insert({
        organization_id: ORG_ID,
        client_id:       clientId as string,
        loan_type:       displayName,
        program_code:    newSolForm.programCode,
        bank:            newSolForm.bank,
        amount:          amountNum,
        commission_pct:  commNum,
        status:          'Rascunho',
        doc_checklist:   checklist,
      })
      .select('id, loan_type, program_code, bank, status, created_at, amount, commission_pct')
      .single()
    if (error) { setNewSolError(error.message); setNewSolSaving(false); return }

    const newApp: AppData = {
      id:          data.id,
      program:     data.loan_type   ?? '',
      programCode: data.program_code ?? '',
      bank:        data.bank         ?? '',
      status:      data.status       ?? 'Rascunho',
      created:     new Date(data.created_at).toLocaleDateString('pt-BR'),
      amount:      data.amount       ?? 0,
      commission:  data.commission_pct ?? 0,
      docsComplete: 0,
      docsTotal:   checklist.length,
      docChecklist: checklist,
    }
    setApplications(prev => [...prev, newApp])
    setActiveAppId(data.id)
    setDocChecklist(checklist)
    setAppStatus(prev => ({ ...prev, [data.id]: 'Rascunho' }))
    setNewSolDrawer(false)
    const firstProg = programs.find(p => p.category === 'custeio')
    setNewSolForm({ category: 'custeio', programCode: firstProg?.code ?? '', bank: 'Banco do Brasil', amount: '', commission: '' })
    setNewSolSaving(false)
    setTab('docs')
  }

  function openEditSol(app: AppData) {
    setEditSolForm({
      amount:     app.amount     > 0 ? app.amount.toLocaleString('pt-BR')     : '',
      commission: app.commission > 0 ? app.commission.toString()              : '',
    })
    setEditSolError('')
    setEditSolId(app.id)
  }

  async function handleEditSolSave() {
    if (!editSolId) return
    setEditSolSaving(true)
    setEditSolError('')
    const amountNum = parseFloat(editSolForm.amount.replace(/\./g, '').replace(',', '.')) || null
    const commNum   = parseFloat(editSolForm.commission.replace(',', '.')) || null
    const { error } = await supabase
      .from('applications')
      .update({ amount: amountNum, commission_pct: commNum })
      .eq('id', editSolId)
    if (error) { setEditSolError(error.message); setEditSolSaving(false); return }
    setApplications(prev => prev.map(a =>
      a.id === editSolId ? { ...a, amount: amountNum ?? 0, commission: commNum ?? 0 } : a
    ))
    setEditSolId(null)
    setEditSolSaving(false)
  }

  async function handleDeleteSol() {
    if (!deleteSolId) return
    setDeletingSol(true)
    await supabase.from('applications').delete().eq('id', deleteSolId)
    const remaining = applications.filter(a => a.id !== deleteSolId)
    setApplications(remaining)
    setDeleteSolId(null)
    setDeletingSol(false)
    if (activeAppId === deleteSolId) {
      setActiveAppId(remaining[0]?.id ?? '')
      setDocChecklist(remaining[0]?.docChecklist ?? [])
    }
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
        <span style={{ color: '#010205', fontWeight: 600 }}>{clientData.name}</span>
      </div>

      {/* ── Client header card ── */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px 28px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FDF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#B95B37', flexShrink: 0 }}>
              {clientData.initials}
            </div>
            <div>
              <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '22px', color: '#010205', letterSpacing: '-0.5px', marginBottom: '2px' }}>{clientData.name}</h1>
              <div style={{ fontSize: '13px', color: '#878C91' }}>{clientData.farmName} · {clientData.city}, {clientData.state}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={openEdit} style={{ padding: '9px 16px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#010205' }}>
              Editar
            </button>
            <button
              onClick={() => setNewSolDrawer(true)}
              style={{ padding: '9px 16px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Nova Solicitação
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <TabBtn id="overview"  label="Visão Geral" />
        <TabBtn id="docs"      label="Solicitações" />
        <TabBtn id="cadastro"  label="Cadastro" />
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
                  { icon: '💬', label: 'WhatsApp', value: clientData.whatsapp },
                  { icon: '✉️', label: 'Email', value: clientData.email },
                  { icon: '📍', label: 'Localização', value: `${clientData.city} — ${clientData.state}` },
                  { icon: '🏡', label: 'Fazenda', value: clientData.farmName },
                  { icon: '👤', label: 'Responsável', value: clientData.assignedTo },
                  { icon: '📄', label: 'CPF', value: clientData.cpf },
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
                <button onClick={() => setNewSolDrawer(true)} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-orange)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
              {/* Total commission across all applications */}
              {APPLICATIONS.length > 1 && (() => {
                const total = APPLICATIONS.reduce((sum, app) => sum + (app.amount * app.commission / 100), 0)
                return (
                  <div style={{ background: 'var(--brand-orange-bg)', borderRadius: '10px', padding: '12px 14px', borderLeft: '3px solid var(--brand-orange)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-orange)' }}>Total comissões</span>
                      <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--brand-orange)', fontFamily: 'Manrope, sans-serif' }}>
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )
              })()}
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
                    const docs = docsByKey[doc.doc_key] ?? []
                    const latestCompleted = docs.filter(ud => ud.status === 'completed' && ud.expiry_date).pop()
                    const dateStr = latestCompleted?.expiry_date ?? ''
                    const st      = expiryStatus(dateStr)
                    const color   = EXPIRY_COLOR[st]
                    return (
                      <div key={doc.doc_key} onClick={() => setTab('docs')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: st === 'expired' ? '#fef2f2' : '#fffbeb', cursor: 'pointer' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#010205' }}>{doc.label}</div>
                        <div style={{ fontSize: '11px', color, fontWeight: 600 }}>{expiryLabel(dateStr)}</div>
                      </div>
                    )
                  })}
                  {missingDocs.map(doc => (
                    <div key={doc.doc_key} onClick={() => setTab('docs')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'var(--color-surface-3)', cursor: 'pointer' }}>
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
      {tab === 'docs' && APPLICATIONS.length === 0 && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '60px 24px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <p style={{ fontWeight: 700, fontSize: '16px', color: '#010205', marginBottom: '6px' }}>Nenhuma solicitação ainda</p>
          <p style={{ fontSize: '13px', color: '#878C91', marginBottom: '24px', lineHeight: 1.6 }}>
            Crie uma solicitação de crédito para começar a enviar documentos.
          </p>
          <button
            onClick={() => setNewSolDrawer(true)}
            style={{ padding: '10px 22px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Nova Solicitação
          </button>
        </div>
      )}

      {tab === 'docs' && APPLICATIONS.length > 0 && (
        <div>
          {/* Application selector + header */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Row 1: Program selector · action buttons · date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

              {/* Edit solicitação */}
              <button
                onClick={() => activeApp && openEditSol(activeApp)}
                style={{ padding: '8px 14px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}
              >
                Editar
              </button>

              {/* Delete solicitação */}
              <button
                onClick={() => activeApp && setDeleteSolId(activeApp.id)}
                style={{ padding: '8px 14px', border: '1.5px solid #fecaca', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}
              >
                Excluir
              </button>

              <button className="btn-secondary">Gerar Excel</button>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                Criado em {activeApp?.created}
              </div>
            </div>

            {/* Row 2: Loan amount · progress bar · status dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {/* Loan amount */}
              {activeApp && (
                <div style={{ minWidth: '160px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Valor solicitado</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'Manrope, sans-serif' }}>
                    R$ {activeApp.amount.toLocaleString('pt-BR')}
                  </div>
                </div>
              )}

              {/* Progress bar — flex-grow so it fills remaining space */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{appPct}% completo</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{activeApp?.docsComplete ?? 0} de {activeApp?.docsTotal ?? 0} docs</span>
                </div>
                <div style={{ height: '7px', background: 'var(--color-surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${appPct}%`, height: '100%', background: appPct === 100 ? '#16a34a' : 'var(--brand-orange)', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Status selector */}
              <select
                value={appStatus[activeAppId]}
                onChange={e => setAppStatus(prev => ({ ...prev, [activeAppId]: e.target.value }))}
                style={{ padding: '8px 12px', border: `1.5px solid ${STATUS_CFG[appStatus[activeAppId]]?.color ?? '#878C91'}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: STATUS_CFG[appStatus[activeAppId]]?.color ?? '#878C91', background: STATUS_CFG[appStatus[activeAppId]]?.bg ?? '#F3F3F3', cursor: 'pointer', flexShrink: 0 }}
              >
                {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>

          {/* Full-width: upload + checklist */}
          <div>
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
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '4px' }}>
                  {uploading ? 'Enviando…' : 'Arraste documentos aqui ou clique para selecionar'}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>PDF, JPG, PNG, Excel, Word — o sistema identifica o tipo automaticamente</p>
                <input
                  id="doc-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files && e.target.files.length > 0) { handleUpload(e.target.files); e.target.value = '' } }}
                />
              </div>

              {/* ── Em processamento ── */}
              {uploadedDocs.filter(d => d.status === 'pending' || d.status === 'processing').length > 0 && (
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px' }}>⟳</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>
                      Em processamento ({uploadedDocs.filter(d => d.status === 'pending' || d.status === 'processing').length})
                    </span>
                    <span style={{ fontSize: '12px', color: '#3b82f6', marginLeft: '4px' }}>— a IA está identificando os documentos, aguarde…</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {uploadedDocs.filter(d => d.status === 'pending' || d.status === 'processing').map(ud => {
                      const cfg = DOC_STATUS_CFG[ud.status]
                      return (
                        <div key={ud.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                            {cfg.icon}
                          </div>
                          <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{ud.file_name}</div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Checklist de Documentos</div>
                  {docChecklist.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {docChecklist.filter(d => d.required_level === 'mandatory').length} obrigatórios · {docChecklist.filter(d => d.required_level === 'conditional').length} condicionais
                    </div>
                  )}
                </div>
                {docChecklist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    Carregando checklist…
                  </div>
                ) : (
                  <>
                  {/* Checklist rows — each item shows sub-rows for every uploaded document */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {docChecklist.map((doc, i) => {
                      const docsForKey    = docsByKey[doc.doc_key] ?? []
                      const hasCompleted  = docsForKey.some(d => d.status === 'completed')
                      const hasProcessing = docsForKey.some(d => d.status === 'processing')
                      const hasPending    = docsForKey.some(d => d.status === 'pending')
                      const allFailed     = docsForKey.length > 0 && docsForKey.every(d => d.status === 'failed')
                      const bestKey       = hasCompleted ? 'completed' : hasProcessing ? 'processing' : hasPending ? 'pending' : allFailed ? 'failed' : null
                      const cfg           = bestKey ? DOC_STATUS_CFG[bestKey] : null
                      const hasAnyDocs    = docsForKey.length > 0

                      return (
                        <div key={doc.doc_key} style={{ borderBottom: i < docChecklist.length - 1 ? '1px solid var(--color-border-subtle)' : 'none', paddingTop: i === 0 ? 0 : '10px', paddingBottom: '10px' }}>

                          {/* Main row: status circle + label + status badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: hasAnyDocs ? 600 : 400, color: hasAnyDocs ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                                {doc.label}
                              </span>
                              {doc.required_level === 'conditional' && (
                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#d97706', background: '#fffbeb', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>condicional</span>
                              )}
                            </div>
                            {cfg && (
                              <span className="badge" style={{ color: cfg.color, background: cfg.bg, flexShrink: 0 }}>{cfg.label}</span>
                            )}
                          </div>

                          {/* Sub-rows: one per uploaded document, each clickable */}
                          {docsForKey.length > 0 && (
                            <div style={{ marginTop: '6px', paddingLeft: '34px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {docsForKey.map((ud, idx) => {
                                const udCfg  = DOC_STATUS_CFG[ud.status]
                                const udDate = ud.expiry_date ?? ''
                                const udEst  = expiryStatus(udDate)
                                const udClr  = EXPIRY_COLOR[udEst]
                                // Display name: extract acronym from summary "(RG)", "(RNM)" etc,
                                // combine with extracted person name → "RG · Marianna Alés Lopez"
                                const acronym  = ud.extracted_fields?.summary?.match(/\(([A-ZÁÉÍÓÚÃÕÂÊÔÜÇ]{2,8})\)/)?.[1]
                                const shortKey = acronym ?? doc.label.split(' ')[0]
                                const nome     = ud.extracted_fields?.nome
                                const name     = nome ? `${shortKey} · ${nome}` : (shortKey || ud.file_name)
                                return (
                                  <div
                                    key={ud.id}
                                    onClick={() => setViewerDoc(ud)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '7px', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-3)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600, width: '18px', flexShrink: 0 }}>{idx + 1}.</span>
                                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                    {udDate ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: udEst === 'expired' ? '#fef2f2' : udEst === 'soon' ? '#fffbeb' : '#f0fdf4', borderRadius: '20px', padding: '2px 8px', flexShrink: 0 }}>
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: udClr }} />
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: udClr, whiteSpace: 'nowrap' }}>
                                          {expiryLabel(udDate)} · {new Date(udDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                      </div>
                                    ) : doc.has_expiry ? (
                                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>—</span>
                                    ) : null}
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: udCfg.color, background: udCfg.bg, borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>{udCfg.label}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Unidentified documents — finished processing but doc_type still unknown or failed */}
                  {uploadedDocs.filter(d => (d.status === 'completed' && d.doc_type === 'unknown') || d.status === 'failed').length > 0 && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', marginBottom: '10px' }}>
                        Documentos não identificados ({uploadedDocs.filter(d => (d.status === 'completed' && d.doc_type === 'unknown') || d.status === 'failed').length}) — atribua o tipo manualmente
                      </div>
                      {uploadedDocs.filter(d => (d.status === 'completed' && d.doc_type === 'unknown') || d.status === 'failed').map(ud => (
                        <div key={ud.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#d97706' }}>?</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', cursor: 'pointer' }} onClick={() => setViewerDoc(ud)}>{ud.file_name}</div>
                          </div>
                          <select
                            value=""
                            onChange={async (e) => {
                              const newDocType = e.target.value
                              if (!newDocType) return
                              await fetch(`/api/documents/${ud.id}/fields`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ doc_type: newDocType }),
                              })
                              setUploadedDocs(prev => prev.map(d => d.id === ud.id ? { ...d, doc_type: newDocType } : d))
                            }}
                            style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text-secondary)' }}
                          >
                            <option value="">Atribuir tipo…</option>
                            {docChecklist.map(dc => (
                              <option key={dc.doc_key} value={dc.doc_key}>{dc.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={async () => {
                              await fetch(`/api/documents/${ud.id}`, { method: 'DELETE' })
                              setUploadedDocs(prev => prev.filter(d => d.id !== ud.id))
                            }}
                            style={{ padding: '4px 8px', fontSize: '11px', border: '1.5px solid #fecaca', borderRadius: '6px', background: '#fff', color: '#dc2626', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
                          >
                            Excluir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Edit Solicitação modal */}
          {editSolId && (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 300 }} onClick={() => setEditSolId(null)} />
              <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: '14px', padding: '28px', width: '380px', zIndex: 301, boxShadow: '0 8px 48px rgba(0,0,0,0.18)' }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#010205', marginBottom: '20px' }}>Editar Solicitação</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Valor solicitado (R$)</div>
                    <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={editSolForm.amount} onChange={e => setEditSolForm(f => ({ ...f, amount: e.target.value }))} placeholder="500.000" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Comissão (%)</div>
                    <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.1" min="0" max="20" value={editSolForm.commission} onChange={e => setEditSolForm(f => ({ ...f, commission: e.target.value }))} placeholder="2.5" />
                  </div>
                  {editSolError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>{editSolError}</div>}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button onClick={() => setEditSolId(null)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Cancelar</button>
                  <button onClick={handleEditSolSave} disabled={editSolSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: editSolSaving ? '#d4956f' : 'var(--brand-orange)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: editSolSaving ? 'not-allowed' : 'pointer' }}>
                    {editSolSaving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Delete Solicitação confirm */}
          {deleteSolId && (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 300 }} onClick={() => setDeleteSolId(null)} />
              <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: '14px', padding: '28px', width: '360px', zIndex: 301, boxShadow: '0 8px 48px rgba(0,0,0,0.18)', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗑️</div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#010205', marginBottom: '8px' }}>Excluir solicitação?</div>
                <p style={{ fontSize: '13px', color: '#878C91', marginBottom: '24px', lineHeight: 1.6 }}>Esta ação não pode ser desfeita. Todos os documentos vinculados serão removidos.</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => setDeleteSolId(null)} style={{ padding: '9px 20px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Cancelar</button>
                  <button onClick={handleDeleteSol} disabled={deletingSol} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: deletingSol ? '#f87171' : '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: deletingSol ? 'not-allowed' : 'pointer' }}>
                    {deletingSol ? 'Excluindo…' : 'Excluir'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 3 — CADASTRO                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === 'cadastro' && (
        <div>
          {/* Horizontal cadastro section nav */}
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '24px',
            scrollbarWidth: 'none' as const,
          }}>
            {CADASTRO_NAV.map(({ id, label }) => {
              const active = cadastroSection === id
              const comp = sectionCompleteness(id, clientData, propCount)
              return (
                <button
                  key={id}
                  onClick={() => setCadastroSection(id)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 20px',
                    border: 'none',
                    borderBottom: active ? '2px solid var(--brand-orange)' : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap' as const,
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: DOT[comp].color,
                    flexShrink: 0,
                  }} />
                  {label}
                </button>
              )
            })}
          </div>

          {/* Section content */}
          {cadastroSection === 'identificacao' && (
            <IdentificacaoSection
              clientId={clientId as string}
              organizationId={ORG_ID}
              onClientUpdate={(patch) => setClientData(prev => ({ ...prev, ...(patch as Partial<ClientData>) }))}
            />
          )}
          {cadastroSection === 'imoveis' && (
            <ImoveisSection
              clientId={clientId as string}
              organizationId={ORG_ID}
              onPropertyCountChange={setPropCount}
            />
          )}
          {cadastroSection === 'semoventes' && (
            <SemovEntesSection clientId={clientId as string} organizationId={ORG_ID} />
          )}
          {cadastroSection === 'bens_moveis' && (
            <BensMoveisSection clientId={clientId as string} organizationId={ORG_ID} />
          )}
          {cadastroSection === 'prod_agricola' && (
            <ProdAgricolaSection clientId={clientId as string} organizationId={ORG_ID} />
          )}
          {cadastroSection === 'prod_pecuaria' && (
            <ProdPecuariaSection clientId={clientId as string} organizationId={ORG_ID} />
          )}
          {cadastroSection === 'financeiro' && (
            <FinanceiroSection clientId={clientId as string} organizationId={ORG_ID} />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* NOVA SOLICITAÇÃO DRAWER                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      {newSolDrawer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.16)',
        transform: newSolDrawer ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            Nova Solicitação
          </div>
          <button onClick={() => setNewSolDrawer(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Banco */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Banco</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={newSolForm.bank}
              onChange={e => setNewSolForm(f => ({ ...f, bank: e.target.value, programCode: '' }))}>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Categoria (custeio / investimento / fundiario) */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Categoria</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['custeio', 'investimento', 'fundiario'] as const).map(cat => {
                const hasProgs = programs.some(p => p.category === cat)
                if (!hasProgs) return null
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      const first = programs.find(p => p.category === cat)
                      setNewSolForm(f => ({ ...f, category: cat, programCode: first?.code ?? '' }))
                    }}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: '8px', border: '1.5px solid',
                      borderColor: newSolForm.category === cat ? 'var(--brand-orange)' : 'var(--color-border)',
                      background: newSolForm.category === cat ? 'var(--brand-orange-bg)' : '#fff',
                      color: newSolForm.category === cat ? 'var(--brand-orange)' : 'var(--color-text-secondary)',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Programa */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Programa de Crédito</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={newSolForm.programCode}
              onChange={e => setNewSolForm(f => ({ ...f, programCode: e.target.value }))}>
              <option value="">Selecionar…</option>
              {programs.filter(p => p.category === newSolForm.category).map(p => (
                <option key={p.code} value={p.code}>{p.display_name}</option>
              ))}
            </select>
            {/* Program info preview */}
            {newSolForm.programCode && (() => {
              const prog = programs.find(p => p.code === newSolForm.programCode)
              if (!prog) return null
              return (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'var(--color-surface-3)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {prog.interest_rate_min != null && (
                    <div><strong>Taxa:</strong> {prog.interest_rate_min === prog.interest_rate_max ? `${prog.interest_rate_min}%` : `${prog.interest_rate_min}–${prog.interest_rate_max}%`} a.a.</div>
                  )}
                  {prog.credit_limit_text && <div><strong>Limite:</strong> {prog.credit_limit_text}</div>}
                  {prog.term_text && <div><strong>Prazo:</strong> {prog.term_text}</div>}
                </div>
              )
            })()}
          </div>

          {/* Valor solicitado */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Valor solicitado (R$)</div>
            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={newSolForm.amount} onChange={e => setNewSolForm(f => ({ ...f, amount: e.target.value }))} placeholder="500.000" />
          </div>

          {/* Comissão */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Comissão (%)</div>
            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.1" min="0" max="20" value={newSolForm.commission} onChange={e => setNewSolForm(f => ({ ...f, commission: e.target.value }))} placeholder="2.5" />
          </div>

          {newSolError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
              {newSolError}
            </div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setNewSolDrawer(false)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>
            Cancelar
          </button>
          <button onClick={handleCreateSol} disabled={newSolSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: newSolSaving ? '#d4956f' : 'var(--brand-orange)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: newSolSaving ? 'not-allowed' : 'pointer' }}>
            {newSolSaving ? 'Criando…' : 'Criar Solicitação'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* EDIT CLIENT DRAWER                                         */}
      {/* ══════════════════════════════════════════════════════════ */}
      {editOpen && (
        <div onClick={() => setEditOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.16)',
        transform: editOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            Editar Cliente
          </div>
          <button onClick={() => setEditOpen(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {([
            { field: 'name',        label: 'Nome completo',        placeholder: 'Ex: João da Silva',            required: true },
            { field: 'cpf',         label: 'CPF',                  placeholder: '000.000.000-00' },
            { field: 'whatsapp',    label: 'WhatsApp',             placeholder: '+55 (34) 99123-4567' },
            { field: 'email',       label: 'Email',                placeholder: 'joao@fazenda.com.br' },
            { field: 'city',        label: 'Município',            placeholder: 'Uberaba' },
            { field: 'state',       label: 'Estado (UF)',          placeholder: 'MG' },
            { field: 'farmName',    label: 'Nome da fazenda',      placeholder: 'Fazenda São João' },
            { field: 'farmAddress', label: 'Endereço / Localização', placeholder: 'Rod. MG-050, km 120' },
          ] as { field: keyof typeof editForm; label: string; placeholder: string; required?: boolean }[]).map(({ field, label, placeholder, required }) => (
            <div key={field}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                {label}{required && <span style={{ color: 'var(--brand-orange)', marginLeft: '2px' }}>*</span>}
              </div>
              <input
                className="input-field"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={editForm[field]}
                onChange={e => setEditForm(f => ({ ...f, [field]: field === 'state' ? e.target.value.toUpperCase() : e.target.value }))}
                placeholder={placeholder}
                maxLength={field === 'state' ? 2 : undefined}
              />
            </div>
          ))}

          {editError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
              {editError}
            </div>
          )}

          {/* Delete zone */}
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #fecaca', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
              >
                Excluir cliente
              </button>
            ) : (
              <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>Tem certeza?</p>
                <p style={{ fontSize: '12px', color: '#878C91', marginBottom: '14px', lineHeight: 1.5 }}>
                  Esta ação é irreversível. O cliente e todas as suas solicitações serão excluídos permanentemente.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: '9px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                    Cancelar
                  </button>
                  <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', background: '#dc2626', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                    {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setEditOpen(false)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>
            Cancelar
          </button>
          <button onClick={handleEditSave} disabled={editSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: editSaving ? '#d4956f' : 'var(--brand-orange)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: editSaving ? 'not-allowed' : 'pointer' }}>
            {editSaving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DOCUMENT VIEWER PANEL                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {viewerDoc && (
        <DocumentViewer
          document={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onFieldUpdate={(docId, fields) => {
            setUploadedDocs(prev => prev.map(d =>
              d.id === docId ? { ...d, extracted_fields: fields, expiry_date: fields.effective_expiry ?? d.expiry_date } : d
            ))
            setViewerDoc(prev => prev && prev.id === docId ? { ...prev, extracted_fields: fields, expiry_date: fields.effective_expiry ?? prev.expiry_date } : prev)
          }}
          onDelete={(docId) => {
            setUploadedDocs(prev => prev.filter(d => d.id !== docId))
          }}
        />
      )}
    </div>
  )
}
