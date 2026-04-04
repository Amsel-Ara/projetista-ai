'use client'

import { useState } from 'react'
import Link from 'next/link'

const CLIENTS = [
  { id: '1', name: 'João Silva',    cpf: '123.456.789-00', city: 'Uberaba',                  state: 'MG', apps: 2, lastActivity: '31/03/2026', status: 'Em análise' },
  { id: '2', name: 'Maria Costa',   cpf: '234.567.890-11', city: 'Sorriso',                   state: 'MT', apps: 1, lastActivity: '30/03/2026', status: 'Docs Pendentes' },
  { id: '3', name: 'Pedro Alves',   cpf: '345.678.901-22', city: 'Rio Verde',                 state: 'GO', apps: 1, lastActivity: '29/03/2026', status: 'Docs Pendentes' },
  { id: '4', name: 'Ana Lima',      cpf: '456.789.012-33', city: 'Barreiras',                 state: 'BA', apps: 3, lastActivity: '28/03/2026', status: 'Enviado' },
  { id: '5', name: 'Carlos Souza',  cpf: '567.890.123-44', city: 'Luís Eduardo Magalhães',    state: 'BA', apps: 1, lastActivity: '27/03/2026', status: 'Aprovado' },
  { id: '6', name: 'Luiz Ferreira', cpf: '678.901.234-55', city: 'Rondonópolis',              state: 'MT', apps: 2, lastActivity: '26/03/2026', status: 'Em análise' },
  { id: '7', name: 'Rosa Martins',  cpf: '789.012.345-66', city: 'Palmas',                    state: 'TO', apps: 1, lastActivity: '25/03/2026', status: 'Rascunho' },
  { id: '8', name: 'Marcos Rocha',  cpf: '890.123.456-77', city: 'Cascavel',                  state: 'PR', apps: 2, lastActivity: '24/03/2026', status: 'Formulário Gerado' },
]

/* Maps status label → CSS class suffix and display text */
const STATUS_CFG: Record<string, { cls: string }> = {
  'Rascunho':          { cls: 'badge badge-draft' },
  'Docs Pendentes':    { cls: 'badge badge-pending' },
  'Em análise':        { cls: 'badge badge-analysis' },
  'Formulário Gerado': { cls: 'badge badge-generated' },
  'Enviado':           { cls: 'badge badge-sent' },
  'Aprovado':          { cls: 'badge badge-approved' },
}

export default function CrmPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')

  const statuses = ['Todos', ...Object.keys(STATUS_CFG)]
  const filtered = CLIENTS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search)
    const matchFilter = filter === 'Todos' || c.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-subtitle">Gerencie seus clientes e solicitações de crédito.</p>
        </div>
        <button className="btn-primary">+ Novo Cliente</button>
      </div>

      {/* Search + status filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="input-field"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          style={{ flex: 1, minWidth: '200px' }}
        />
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'background 0.15s, color 0.15s',
                background: filter === s ? 'var(--color-text-primary)' : 'var(--color-surface)',
                color: filter === s ? '#fff' : 'var(--color-text-secondary)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Client table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-subtle)' }}>
              {['Cliente', 'CPF', 'Localidade', 'Solicitações', 'Última atividade', 'Status', ''].map((h, i) => (
                <th key={i} style={{
                  padding: '13px 16px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const cfg = STATUS_CFG[c.status] || { cls: 'badge badge-draft' }
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none', transition: 'background 0.1s', cursor: 'default' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Name + avatar */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar">
                        {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{c.cpf}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{c.city}, {c.state}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{c.apps}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{c.lastActivity}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={cfg.cls}>{c.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link href={`/app/crm/${c.id}`} style={{ textDecoration: 'none', color: 'var(--brand-orange)', fontSize: '13px', fontWeight: 600 }}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </div>
  )
}
