'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ORG_ID = 'a0000000-0000-0000-0000-000000000001'

type Client = {
  id: string
  name: string
  cpf: string
  city: string
  state: string
  status: string
  apps: number
  lastActivity: string
  totalCommission: number
}

const STATUS_CFG: Record<string, { cls: string }> = {
  'Rascunho':          { cls: 'badge badge-draft' },
  'Docs Pendentes':    { cls: 'badge badge-pending' },
  'Em análise':        { cls: 'badge badge-analysis' },
  'Formulário Gerado': { cls: 'badge badge-generated' },
  'Enviado':           { cls: 'badge badge-sent' },
  'Aprovado':          { cls: 'badge badge-approved' },
}

const LOAN_TYPES = ['Pronaf Custeio', 'Pronaf Investimento', 'Pronamp', 'BNDES Agro', 'FNE Rural']
const BANKS      = ['Banco do Brasil', 'Bradesco', 'Sicoob', 'Cresol', 'BNB']

type Step = 1 | 2 | 3

const EMPTY_FORM = {
  name: '', whatsapp: '', email: '', city: '', state: '',
  farmName: '', farmAddress: '',
  loanType: 'Pronaf Custeio', bank: 'Banco do Brasil', amount: '', commission: '',
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
      {text}{required && <span style={{ color: 'var(--brand-orange)', marginLeft: '2px' }}>*</span>}
    </div>
  )
}

export default function CrmPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [clients,    setClients]    = useState<Client[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('Todos')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [step,       setStep]       = useState<Step>(1)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)

  // Load clients from Supabase
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('clients')
        .select('id, name, cpf, city, state, status, updated_at, applications(id, amount, commission_pct, updated_at)')
        .order('created_at', { ascending: false })

      if (data) {
        setClients(data.map((c: any) => {
          const apps = c.applications ?? []
          const totalCommission = apps.reduce(
            (sum: number, a: any) => sum + ((a.amount ?? 0) * (a.commission_pct ?? 0) / 100), 0
          )
          const lastApp = apps.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
          return {
            id:              c.id,
            name:            c.name,
            cpf:             c.cpf ?? '',
            city:            c.city ?? '',
            state:           c.state ?? '',
            status:          c.status ?? 'Ativo',
            apps:            apps.length,
            lastActivity:    lastApp ? new Date(lastApp.updated_at).toLocaleDateString('pt-BR') : new Date(c.updated_at).toLocaleDateString('pt-BR'),
            totalCommission,
          }
        }))
      }
      setLoading(false)
    }
    load()
  }, [])

  const statuses = ['Todos', ...Object.keys(STATUS_CFG)]
  const searchNorm = search.replace(/[\.\-\s]/g, '')
  const filtered = clients.filter(c => {
    const matchName   = c.name.toLowerCase().includes(search.toLowerCase())
    const matchCpf    = c.cpf.replace(/[\.\-]/g, '').includes(searchNorm)
    const matchFilter = filter === 'Todos' || c.status === filter
    return (matchName || matchCpf) && matchFilter
  })

  const amountNum     = parseFloat(form.amount.replace(/\./g, '').replace(',', '.')) || 0
  const commissionNum = parseFloat(form.commission.replace(',', '.')) || 0
  const projectedFee  = amountNum * commissionNum / 100

  function openDrawer() { setForm(EMPTY_FORM); setStep(1); setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false) }
  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(goToUpload: boolean) {
    setSaving(true)
    // Insert client
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .insert({
        organization_id: ORG_ID,
        name:            form.name,
        whatsapp:        form.whatsapp,
        email:           form.email || null,
        city:            form.city || null,
        state:           form.state || null,
        farm_name:       form.farmName || null,
        farm_address:    form.farmAddress || null,
        status:          'Ativo',
      })
      .select('id')
      .single()

    if (clientErr || !clientData) { setSaving(false); return }

    // Insert application
    const { data: appData } = await supabase
      .from('applications')
      .insert({
        organization_id: ORG_ID,
        client_id:       clientData.id,
        loan_type:       form.loanType,
        bank:            form.bank,
        amount:          amountNum || null,
        commission_pct:  commissionNum || null,
        status:          'Rascunho',
      })
      .select('id')
      .single()

    setSaving(false)
    closeDrawer()
    const dest = `/app/crm/${clientData.id}${goToUpload ? '?tab=docs' : ''}`
    router.push(dest)
  }

  const step1Valid = form.name.trim().length > 0 && form.whatsapp.trim().length > 0
  const step2Valid = form.farmName.trim().length > 0
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-subtitle">Gerencie seus clientes e solicitações de crédito.</p>
        </div>
        <button className="btn-primary" onClick={openDrawer}>+ Novo Cliente</button>
      </div>

      {/* ── Search + filter pills ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="input-field"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          style={{ flex: 1, minWidth: '200px' }}
        />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'background 0.15s, color 0.15s',
                background: filter === s ? 'var(--color-text-primary)' : 'var(--color-surface)',
                color:      filter === s ? '#fff' : 'var(--color-text-secondary)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Client table ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-subtle)' }}>
              {['Cliente', 'Comissão Total', 'Localidade', 'Solicitações', 'Última atividade', 'Status', ''].map((h, i) => (
                <th key={i} style={{ padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Carregando clientes...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Nenhum cliente encontrado.</td></tr>
            ) : null}
            {!loading && filtered.map((c, i) => {
              const cfg = STATUS_CFG[c.status] || { cls: 'badge badge-draft' }
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar">{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--brand-orange)', fontVariantNumeric: 'tabular-nums' }}>
                    R$ {c.totalCommission.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{c.city}, {c.state}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{c.apps}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{c.lastActivity}</td>
                  <td style={{ padding: '14px 16px' }}><span className={cfg.cls}>{c.status}</span></td>
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

      {/* ══════════════════════════════════════════ */}
      {/* NOVO CLIENTE DRAWER                       */}
      {/* ══════════════════════════════════════════ */}

      {/* Backdrop */}
      {drawerOpen && (
        <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} />
      )}

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.16)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Drawer header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
              Novo Cliente
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Passo {step} de 3
            </div>
          </div>
          <button onClick={closeDrawer} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* Step progress */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexShrink: 0 }}>
          {([{ n: 1, label: 'Contato' }, { n: 2, label: 'Propriedade' }, { n: 3, label: 'Crédito' }] as { n: Step; label: string }[]).map(({ n, label }, idx) => (
            <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
              {idx < 2 && (
                <div style={{ position: 'absolute', top: '13px', left: '50%', width: '100%', height: '2px', background: step > n ? 'var(--brand-orange)' : 'var(--color-border)', zIndex: 0 }} />
              )}
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', zIndex: 1,
                background: step >= n ? 'var(--brand-orange)' : 'var(--color-surface-2)',
                color: step >= n ? '#fff' : 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
                border: `2px solid ${step >= n ? 'var(--brand-orange)' : 'var(--color-border)'}`,
                transition: 'all 0.2s',
              }}>
                {step > n ? '✓' : n}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: step >= n ? 'var(--brand-orange)' : 'var(--color-text-secondary)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable form content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Comece com o essencial. Os dados detalhados do cliente serão preenchidos automaticamente quando os documentos forem enviados.
              </p>
              <div>
                <FieldLabel text="Nome completo" required />
                <input className="input-field" style={inputStyle} value={form.name}
                  onChange={e => update('name', e.target.value)} placeholder="Ex: João da Silva" />
              </div>
              <div>
                <FieldLabel text="WhatsApp" required />
                <input className="input-field" style={inputStyle} value={form.whatsapp}
                  onChange={e => update('whatsapp', e.target.value)} placeholder="+55 (34) 99123-4567" />
              </div>
              <div>
                <FieldLabel text="Email" />
                <input className="input-field" style={inputStyle} value={form.email} type="email"
                  onChange={e => update('email', e.target.value)} placeholder="joao@fazenda.com.br" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <FieldLabel text="Município" />
                  <input className="input-field" style={inputStyle} value={form.city}
                    onChange={e => update('city', e.target.value)} placeholder="Uberaba" />
                </div>
                <div>
                  <FieldLabel text="Estado" />
                  <input className="input-field" style={inputStyle} value={form.state}
                    onChange={e => update('state', e.target.value.toUpperCase())} placeholder="MG" maxLength={2} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'var(--color-surface-3)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                💡 Área total, CAR, NIRF e matrícula serão preenchidos automaticamente via documentos enviados.
              </div>
              <div>
                <FieldLabel text="Nome da fazenda" required />
                <input className="input-field" style={inputStyle} value={form.farmName}
                  onChange={e => update('farmName', e.target.value)} placeholder="Ex: Fazenda São João" />
              </div>
              <div>
                <FieldLabel text="Endereço / Localização" />
                <input className="input-field" style={inputStyle} value={form.farmAddress}
                  onChange={e => update('farmAddress', e.target.value)} placeholder="Rodovia MG-050, km 120, Zona Rural" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <FieldLabel text="Tipo de crédito" />
                <select className="input-field" style={inputStyle} value={form.loanType}
                  onChange={e => update('loanType', e.target.value)}>
                  {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel text="Banco" />
                <select className="input-field" style={inputStyle} value={form.bank}
                  onChange={e => update('bank', e.target.value)}>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel text="Valor solicitado (R$)" />
                <input className="input-field" style={inputStyle} value={form.amount}
                  onChange={e => update('amount', e.target.value)} placeholder="500.000" />
              </div>
              <div>
                <FieldLabel text="Comissão (%)" />
                <input className="input-field" style={inputStyle} value={form.commission}
                  type="number" step="0.1" min="0" max="20"
                  onChange={e => update('commission', e.target.value)} placeholder="2.5" />
              </div>
              {projectedFee > 0 && (
                <div style={{ background: 'var(--brand-orange-bg)', borderRadius: '10px', padding: '14px 16px', borderLeft: '3px solid var(--brand-orange)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-orange)', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Comissão Estimada
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-orange)', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
                    R$ {projectedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--brand-orange)', opacity: 0.75, marginTop: '2px' }}>
                    {form.commission}% sobre R$ {form.amount}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
          {step === 1 && (
            <>
              <button onClick={closeDrawer} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                Cancelar
              </button>
              <button onClick={() => setStep(2)} disabled={!step1Valid}
                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--brand-orange)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: step1Valid ? 'pointer' : 'not-allowed', opacity: step1Valid ? 1 : 0.45 }}>
                Próximo →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                ← Voltar
              </button>
              <button onClick={() => setStep(3)} disabled={!step2Valid}
                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--brand-orange)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: step2Valid ? 'pointer' : 'not-allowed', opacity: step2Valid ? 1 : 0.45 }}>
                Próximo →
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button onClick={() => setStep(2)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                ← Voltar
              </button>
              <button onClick={() => handleSave(false)} disabled={saving} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--color-text-primary)' }}>
                Salvar sem upload
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: saving ? '#d4956f' : 'var(--brand-orange)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Salvando...' : 'Salvar e fazer upload'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
