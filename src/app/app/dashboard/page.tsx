import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const PIPELINE_STATUSES = [
  { status: 'Rascunho',           color: 'var(--status-draft-color)',     bg: 'var(--status-draft-bg)' },
  { status: 'Documentos pendentes', color: 'var(--status-pending-color)', bg: 'var(--status-pending-bg)' },
  { status: 'Em análise',         color: 'var(--status-analysis-color)',  bg: 'var(--status-analysis-bg)' },
  { status: 'Formulário gerado',  color: 'var(--status-generated-color)', bg: 'var(--status-generated-bg)' },
  { status: 'Enviado',            color: 'var(--status-sent-color)',       bg: 'var(--status-sent-bg)' },
  { status: 'Aprovado',           color: 'var(--status-approved-color)',   bg: 'var(--status-approved-bg)' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Fetch stats + pipeline in parallel
  const [clientsRes, activeAppsRes, pipelineRes] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('applications').select('id', { count: 'exact', head: true }).neq('status', 'Aprovado'),
    supabase.from('applications').select('id, client_id, status, loan_type, amount, commission_pct, clients(id, name)'),
  ])

  const totalClients = clientsRes.count ?? 0
  const activeApps   = activeAppsRes.count ?? 0
  const allApps      = pipelineRes.data ?? []

  // Group applications by status for pipeline; pre-compute commission per item
  const pipeline = PIPELINE_STATUSES.map(cfg => {
    const items = allApps.filter(a => a.status === cfg.status).map(a => ({
      ...a,
      commission: ((a.amount ?? 0) * (a.commission_pct ?? 0)) / 100,
    }))
    const colTotal = items.reduce((sum, a) => sum + a.commission, 0)
    return { ...cfg, items, colTotal }
  })

  const STATS = [
    {
      label: 'Solicitações ativas', value: String(activeApps), sub: 'em andamento',
      accentColor: 'var(--brand-orange)',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    },
    {
      label: 'Total de clientes', value: String(totalClients), sub: 'cadastrados',
      accentColor: '#16a34a',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    },
    {
      label: 'Aprovadas', value: String(allApps.filter(a => a.status === 'Aprovado').length), sub: 'total aprovadas',
      accentColor: '#2563eb',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>,
    },
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today} · Visão geral das suas solicitações de crédito rural.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {STATS.map((s, i) => (
          <div key={i} className="card" style={{ padding: '22px 24px', borderLeft: `4px solid ${s.accentColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{s.label}</span>
              <span style={{ color: s.accentColor, opacity: 0.7 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '38px', fontFamily: 'var(--font-display)', fontWeight: 800, color: s.accentColor, lineHeight: 1, marginBottom: '6px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Link href="/app/crm" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ fontSize: '13px', padding: '9px 16px' }}>
            + Novo Cliente
          </button>
        </Link>
        <Link href="/app/chat" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            border: '1.5px solid var(--color-border)', borderRadius: '8px',
            padding: '9px 16px', fontFamily: 'var(--font-display)',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
          }}>
            Consultar Assistente IA
          </button>
        </Link>
      </div>

      {/* Pipeline kanban */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px' }}>
              Pipeline de Solicitações
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {allApps.length} solicitações em andamento
            </p>
          </div>
          <Link href="/app/crm" style={{ fontSize: '13px', color: 'var(--brand-orange)', fontWeight: 600, textDecoration: 'none' }}>
            Ver CRM →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {pipeline.map((col, i) => (
            <div key={i} style={{ minWidth: '140px', display: 'flex', flexDirection: 'column' }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>{col.status}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: col.color, background: col.bg, borderRadius: '10px', padding: '1px 7px', flexShrink: 0 }}>
                  {col.items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {col.items.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>Nenhuma</div>
                ) : col.items.map((a) => (
                  <Link key={a.id} href={`/app/crm/${a.client_id}`} style={{ textDecoration: 'none' }}>
                    <div className="pipeline-card" style={{ background: col.bg, border: `1px solid ${col.color}25`, borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '3px' }}>
                        {(a.clients as any)?.name ?? '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: a.commission > 0 ? '5px' : '0' }}>
                        {a.loan_type}
                      </div>
                      {a.commission > 0 && (
                        <div style={{ fontSize: '11px', fontWeight: 700, color: col.color }}>
                          R$ {a.commission.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Column total */}
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${col.color}30` }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Total
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: col.colTotal > 0 ? col.color : 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                  {col.colTotal > 0
                    ? `R$ ${col.colTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
