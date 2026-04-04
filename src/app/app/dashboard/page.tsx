import Link from 'next/link'

const STATS = [
  {
    label: 'Solicitações ativas',
    value: '12',
    sub: '+3 este mês',
    accentColor: 'var(--brand-orange)',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    label: 'Documentos pendentes',
    value: '8',
    sub: 'em 5 clientes',
    accentColor: '#d97706',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  {
    label: 'Total de clientes',
    value: '24',
    sub: '2 novos esta semana',
    accentColor: '#16a34a',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
]

/* Pipeline stages — ordered by workflow step */
const PIPELINE: { status: string; color: string; bg: string; clients: { name: string; program: string }[] }[] = [
  {
    status: 'Rascunho', color: 'var(--status-draft-color)', bg: 'var(--status-draft-bg)',
    clients: [
      { name: 'João Silva', program: 'Pronaf Custeio' },
      { name: 'Maria Costa', program: 'Pronamp' },
    ],
  },
  {
    status: 'Docs Pendentes', color: 'var(--status-pending-color)', bg: 'var(--status-pending-bg)',
    clients: [
      { name: 'Pedro Alves', program: 'Pronaf Investimento' },
      { name: 'Ana Lima', program: 'BNDES Agro' },
      { name: 'Carlos Souza', program: 'Pronaf Custeio' },
    ],
  },
  {
    status: 'Em Análise', color: 'var(--status-analysis-color)', bg: 'var(--status-analysis-bg)',
    clients: [
      { name: 'Luiz Ferreira', program: 'Pronamp' },
      { name: 'Rosa Martins', program: 'FNE Rural' },
    ],
  },
  {
    status: 'Formulário Gerado', color: 'var(--status-generated-color)', bg: 'var(--status-generated-bg)',
    clients: [
      { name: 'Marcos Rocha', program: 'Pronaf Custeio' },
    ],
  },
  {
    status: 'Enviado', color: 'var(--status-sent-color)', bg: 'var(--status-sent-bg)',
    clients: [
      { name: 'Tereza Nunes', program: 'BNDES Agro' },
      { name: 'Paulo Mendes', program: 'Pronaf Investimento' },
    ],
  },
  {
    status: 'Aprovado', color: 'var(--status-approved-color)', bg: 'var(--status-approved-bg)',
    clients: [
      { name: 'Fernanda Gomes', program: 'Pronaf Custeio' },
      { name: 'Roberto Castro', program: 'Pronamp' },
    ],
  },
]

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today} · Visão geral das suas solicitações de crédito rural.</p>
      </div>

      {/* Stat cards — 3 columns */}
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

      {/* Quick actions row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Link href="/app/crm" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ fontSize: '13px', padding: '9px 16px' }}>
            + Novo Cliente
          </button>
        </Link>
        <Link href="/app/chat" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '8px',
            padding: '9px 16px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
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
              {PIPELINE.reduce((acc, col) => acc + col.clients.length, 0)} solicitações em andamento
            </p>
          </div>
          <Link href="/app/crm" style={{ fontSize: '13px', color: 'var(--brand-orange)', fontWeight: 600, textDecoration: 'none' }}>
            Ver CRM →
          </Link>
        </div>

        {/* Kanban columns — horizontally scrollable on smaller viewports */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {PIPELINE.map((col, i) => (
            <div key={i} style={{ minWidth: '140px' }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>{col.status}</span>
                {/* Count badge */}
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: col.color,
                  background: col.bg,
                  borderRadius: '10px',
                  padding: '1px 7px',
                  flexShrink: 0,
                }}>
                  {col.clients.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.clients.map((c, j) => (
                  <Link key={j} href="/app/crm/1" style={{ textDecoration: 'none' }}>
                    <div className="pipeline-card" style={{
                      background: col.bg,
                      border: `1px solid ${col.color}25`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '3px' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{c.program}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
