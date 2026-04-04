'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const CLIENT = {
  id: '1',
  name: 'João Silva',
  cpf: '123.456.789-00',
  phone: '(34) 99123-4567',
  email: 'joao.silva@fazenda.com.br',
  city: 'Uberaba',
  state: 'MG',
  propertyName: 'Fazenda São João',
  totalArea: '850 ha',
  carNumber: 'MG-3170206-9F3A2B1C4D5E6F7A',
  nirf: '1234567',
  assignedTo: 'Amsel Ara',
}

const APPLICATIONS = [
  { id: '1', program: 'Pronaf Custeio', bank: 'Banco do Brasil', status: 'Em análise', created: '15/03/2026', docsComplete: 9, docsTotal: 13 },
  { id: '2', program: 'Pronaf Investimento', bank: 'Banco do Brasil', status: 'Rascunho', created: '28/03/2026', docsComplete: 2, docsTotal: 13 },
]

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  'Rascunho':           { color: '#878C91', bg: '#F3F3F3' },
  'Docs Pendentes':     { color: '#d97706', bg: '#fffbeb' },
  'Em análise':         { color: '#2563eb', bg: '#eff6ff' },
  'Formulário Gerado':  { color: '#7c3aed', bg: '#f5f3ff' },
  'Enviado':            { color: '#B95B37', bg: '#FDF0EB' },
  'Aprovado':           { color: '#16a34a', bg: '#f0fdf4' },
}

export default function ClientProfilePage() {
  const { clientId } = useParams()
  const [tab, setTab] = useState<'info' | 'apps'>('info')

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontSize: '13px', color: '#878C91' }}>
        <Link href="/app/crm" style={{ color: '#878C91', textDecoration: 'none' }}>CRM</Link>
        <span>›</span>
        <span style={{ color: '#010205', fontWeight: 600 }}>{CLIENT.name}</span>
      </div>

      {/* Client header */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px 28px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FDF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#B95B37', flexShrink: 0 }}>
              JS
            </div>
            <div>
              <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '22px', color: '#010205', letterSpacing: '-0.5px', marginBottom: '2px' }}>{CLIENT.name}</h1>
              <div style={{ fontSize: '13px', color: '#878C91' }}>CPF: {CLIENT.cpf} · {CLIENT.city}, {CLIENT.state}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ padding: '9px 16px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#010205' }}>
              Editar
            </button>
            <button onClick={() => setTab('apps')} style={{ padding: '9px 16px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              + Nova Solicitação
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {(['info', 'apps'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            background: tab === t ? '#010205' : '#fff',
            color: tab === t ? '#fff' : '#878C91',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            {t === 'info' ? 'Informações' : `Solicitações (${APPLICATIONS.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '16px' }}>Dados Pessoais</h3>
            {[
              { label: 'Nome completo', value: CLIENT.name },
              { label: 'CPF', value: CLIENT.cpf },
              { label: 'Telefone', value: CLIENT.phone },
              { label: 'Email', value: CLIENT.email },
              { label: 'Município', value: `${CLIENT.city} — ${CLIENT.state}` },
              { label: 'Responsável', value: CLIENT.assignedTo },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#878C91', letterSpacing: '0.5px', marginBottom: '3px' }}>{f.label.toUpperCase()}</div>
                <div style={{ fontSize: '14px', color: '#010205', fontWeight: 500 }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '16px' }}>Dados do Imóvel</h3>
            {[
              { label: 'Nome da propriedade', value: CLIENT.propertyName },
              { label: 'Área total', value: CLIENT.totalArea },
              { label: 'Número CAR', value: CLIENT.carNumber },
              { label: 'NIRF', value: CLIENT.nirf },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#878C91', letterSpacing: '0.5px', marginBottom: '3px' }}>{f.label.toUpperCase()}</div>
                <div style={{ fontSize: '14px', color: '#010205', fontWeight: 500, wordBreak: 'break-all' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Applications */}
      {tab === 'apps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {APPLICATIONS.map(app => {
            const cfg = STATUS_CFG[app.status] || { color: '#878C91', bg: '#F3F3F3' }
            const pct = Math.round((app.docsComplete / app.docsTotal) * 100)
            return (
              <Link key={app.id} href={`/app/crm/${clientId}/applications/${app.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '16px', color: '#010205', marginBottom: '2px' }}>{app.program}</div>
                      <div style={{ fontSize: '13px', color: '#878C91' }}>{app.bank} · Criado em {app.created}</div>
                    </div>
                    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>{app.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#F3F3F3', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : '#B95B37', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#878C91', flexShrink: 0 }}>{app.docsComplete}/{app.docsTotal} documentos</span>
                  </div>
                </div>
              </Link>
            )
          })}
          <button style={{ background: '#fff', border: '2px dashed #e5e7eb', borderRadius: '14px', padding: '20px', color: '#878C91', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            + Nova Solicitação
          </button>
        </div>
      )}
    </div>
  )
}
