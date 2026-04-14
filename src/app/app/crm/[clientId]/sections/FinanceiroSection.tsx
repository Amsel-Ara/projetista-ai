'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FinanceiroSectionProps {
  clientId:       string
  organizationId: string
}

type BankAccount = {
  id: string; banco: string; codigo_banco: string | null
  agencia: string | null; prefixo: string | null; conta_corrente: string | null
  tipo_conta: string | null; principal: boolean
  relacionamento_desde: string | null; ativo: boolean
}

type Debt = {
  id: string; credor: string; tipo_credito: string | null
  instituicao: string | null; valor_contratado: number | null
  valor_parcela: number | null; vencimento_final: string | null
  status: string; liquidada_em: string | null
}

type FarmOverhead = {
  id: string; categoria: string; descricao: string | null
  valor: number; property_id: string | null; ano_referencia: number
  rural_properties?: { nome: string } | null
}

type FinancialProfile = {
  id?: string; ano_referencia: number
  patrimonio_bruto: number | null; patrimonio_liquido: number | null
  capital_proprio: number | null; passivo_total: number | null
  renda_bruta_anual: number | null; renda_bruta_agropecuaria: number | null
  renda_outras_atividades: number | null
}

type FinTab = 'contas' | 'dividas' | 'gastos_gerais' | 'perfil'

const DEBT_STATUSES = ['Todas', 'Em dia', 'Atrasada', 'Renegociada', 'Liquidada']

const OVERHEAD_CATEGORIES = ['arrendamento', 'seguros', 'administracao', 'manutencao', 'transporte', 'energia', 'combustivel', 'assistencia_tecnica', 'outros']

const EMPTY_ACCOUNT_FORM = { banco: '', codigo_banco: '', agencia: '', prefixo: '', conta_corrente: '', tipo_conta: 'corrente', principal: false, relacionamento_desde: '' }
const EMPTY_DEBT_FORM    = { credor: '', tipo_credito: '', instituicao: '', valor_contratado: '', valor_parcela: '', vencimento_final: '', status: 'Em dia', liquidada_em: '' }
const EMPTY_OVERHEAD_FORM = { categoria: 'arrendamento', descricao: '', valor: '', property_id: '', ano_referencia: String(new Date().getFullYear()) }

export default function FinanceiroSection({ clientId, organizationId }: FinanceiroSectionProps) {
  const supabase = createClient()

  const [finTab,         setFinTab]         = useState<FinTab>('contas')
  const [bankAccounts,   setBankAccounts]   = useState<BankAccount[]>([])
  const [debts,          setDebts]          = useState<Debt[]>([])
  const [overheads,      setOverheads]      = useState<FarmOverhead[]>([])
  const [profile,        setProfile]        = useState<FinancialProfile | null>(null)
  const [loading,        setLoading]        = useState(true)

  const [debtFilter,     setDebtFilter]     = useState('Todas')
  const [selectedYear,   setSelectedYear]   = useState(new Date().getFullYear())

  // Account drawer
  const [acctDrawer,     setAcctDrawer]     = useState(false)
  const [editAcctId,     setEditAcctId]     = useState<string | null>(null)
  const [acctForm,       setAcctForm]       = useState(EMPTY_ACCOUNT_FORM)
  const [acctSaving,     setAcctSaving]     = useState(false)

  // Debt drawer
  const [debtDrawer,     setDebtDrawer]     = useState(false)
  const [editDebtId,     setEditDebtId]     = useState<string | null>(null)
  const [debtForm,       setDebtForm]       = useState(EMPTY_DEBT_FORM)
  const [debtSaving,     setDebtSaving]     = useState(false)

  // Overhead drawer
  const [overheadDrawer, setOverheadDrawer] = useState(false)
  const [editOverheadId, setEditOverheadId] = useState<string | null>(null)
  const [overheadForm,   setOverheadForm]   = useState(EMPTY_OVERHEAD_FORM)
  const [overheadSaving, setOverheadSaving] = useState(false)

  // Profile form
  const [profileForm,    setProfileForm]    = useState({
    patrimonio_bruto: '', patrimonio_liquido: '', capital_proprio: '', passivo_total: '',
    renda_bruta_anual: '', renda_bruta_agropecuaria: '', renda_outras_atividades: '',
  })
  const [profileSaving,  setProfileSaving]  = useState(false)
  const [profileSaved,   setProfileSaved]   = useState(false)

  const [properties,     setProperties]     = useState<{ id: string; nome: string }[]>([])

  // Load on mount
  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('client_bank_accounts').select('*').eq('client_id', clientId).eq('ativo', true).order('principal', { ascending: false }),
      supabase.from('client_debts').select('*').eq('client_id', clientId).order('vencimento_final'),
      supabase.from('rural_properties').select('id, nome').eq('client_id', clientId),
    ]).then(([accts, dbs, props]) => {
      setBankAccounts((accts.data ?? []) as BankAccount[])
      setDebts((dbs.data ?? []) as Debt[])
      setProperties((props.data ?? []) as { id: string; nome: string }[])
      setLoading(false)
    })
  }, [clientId])

  // Load overheads + profile when year changes
  useEffect(() => {
    Promise.all([
      supabase.from('farm_overhead_costs').select('*, rural_properties(nome)').eq('client_id', clientId).eq('ano_referencia', selectedYear).order('categoria'),
      supabase.from('client_financial_profiles').select('*').eq('client_id', clientId).eq('ano_referencia', selectedYear).maybeSingle(),
    ]).then(([oh, prof]) => {
      setOverheads((oh.data ?? []) as FarmOverhead[])
      const p = prof.data as FinancialProfile | null
      setProfile(p)
      setProfileForm({
        patrimonio_bruto:          p?.patrimonio_bruto?.toString() ?? '',
        patrimonio_liquido:        p?.patrimonio_liquido?.toString() ?? '',
        capital_proprio:           p?.capital_proprio?.toString() ?? '',
        passivo_total:             p?.passivo_total?.toString() ?? '',
        renda_bruta_anual:         p?.renda_bruta_anual?.toString() ?? '',
        renda_bruta_agropecuaria:  p?.renda_bruta_agropecuaria?.toString() ?? '',
        renda_outras_atividades:   p?.renda_outras_atividades?.toString() ?? '',
      })
    })
  }, [clientId, selectedYear])

  const filteredDebts = debtFilter === 'Todas'
    ? debts
    : debts.filter(d => d.status === debtFilter)

  async function handleAcctSave() {
    setAcctSaving(true)
    const payload = {
      organization_id:     organizationId,
      client_id:           clientId,
      banco:               acctForm.banco,
      codigo_banco:        acctForm.codigo_banco || null,
      agencia:             acctForm.agencia || null,
      prefixo:             acctForm.prefixo || null,
      conta_corrente:      acctForm.conta_corrente || null,
      tipo_conta:          acctForm.tipo_conta || null,
      principal:           acctForm.principal,
      relacionamento_desde: acctForm.relacionamento_desde || null,
      ativo:               true,
    }
    if (acctForm.principal) {
      // Unset current principal for the same bank
      await supabase.from('client_bank_accounts')
        .update({ principal: false })
        .eq('client_id', clientId)
        .eq('banco', acctForm.banco)
        .eq('principal', true)
    }
    if (editAcctId) {
      const { data } = await supabase.from('client_bank_accounts').update(payload).eq('id', editAcctId).select().single()
      if (data) setBankAccounts(prev => prev.map(a => a.id === editAcctId ? data as BankAccount : a))
    } else {
      const { data } = await supabase.from('client_bank_accounts').insert(payload).select().single()
      if (data) setBankAccounts(prev => [...prev, data as BankAccount])
    }
    setAcctSaving(false); setAcctDrawer(false); setEditAcctId(null)
    setAcctForm(EMPTY_ACCOUNT_FORM)
  }

  async function handleDebtSave() {
    setDebtSaving(true)
    const payload = {
      organization_id:  organizationId,
      client_id:        clientId,
      credor:           debtForm.credor,
      tipo_credito:     debtForm.tipo_credito || null,
      instituicao:      debtForm.instituicao || null,
      valor_contratado: debtForm.valor_contratado ? parseFloat(debtForm.valor_contratado) : null,
      valor_parcela:    debtForm.valor_parcela ? parseFloat(debtForm.valor_parcela) : null,
      vencimento_final: debtForm.vencimento_final || null,
      status:           debtForm.status,
      liquidada_em:     debtForm.liquidada_em || null,
    }
    if (editDebtId) {
      const { data } = await supabase.from('client_debts').update(payload).eq('id', editDebtId).select().single()
      if (data) setDebts(prev => prev.map(d => d.id === editDebtId ? data as Debt : d))
    } else {
      const { data } = await supabase.from('client_debts').insert(payload).select().single()
      if (data) setDebts(prev => [...prev, data as Debt])
    }
    setDebtSaving(false); setDebtDrawer(false); setEditDebtId(null)
    setDebtForm(EMPTY_DEBT_FORM)
  }

  async function markLiquidada(id: string) {
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('client_debts').update({ status: 'Liquidada', liquidada_em: today }).eq('id', id)
    setDebts(prev => prev.map(d => d.id === id ? { ...d, status: 'Liquidada', liquidada_em: today } : d))
  }

  async function handleOverheadSave() {
    setOverheadSaving(true)
    const payload = {
      organization_id: organizationId,
      client_id:       clientId,
      categoria:       overheadForm.categoria,
      descricao:       overheadForm.descricao || null,
      valor:           parseFloat(overheadForm.valor) || 0,
      property_id:     overheadForm.property_id || null,
      ano_referencia:  parseInt(overheadForm.ano_referencia),
    }
    if (editOverheadId) {
      const { data } = await supabase.from('farm_overhead_costs').update(payload).eq('id', editOverheadId).select('*, rural_properties(nome)').single()
      if (data) setOverheads(prev => prev.map(o => o.id === editOverheadId ? data as FarmOverhead : o))
    } else {
      const { data } = await supabase.from('farm_overhead_costs').insert(payload).select('*, rural_properties(nome)').single()
      if (data) setOverheads(prev => [...prev, data as FarmOverhead])
    }
    setOverheadSaving(false); setOverheadDrawer(false); setEditOverheadId(null)
    setOverheadForm(EMPTY_OVERHEAD_FORM)
  }

  async function handleProfileSave() {
    setProfileSaving(true)
    const payload = {
      organization_id:          organizationId,
      client_id:                clientId,
      ano_referencia:           selectedYear,
      patrimonio_bruto:         profileForm.patrimonio_bruto ? parseFloat(profileForm.patrimonio_bruto) : null,
      patrimonio_liquido:       profileForm.patrimonio_liquido ? parseFloat(profileForm.patrimonio_liquido) : null,
      capital_proprio:          profileForm.capital_proprio ? parseFloat(profileForm.capital_proprio) : null,
      passivo_total:            profileForm.passivo_total ? parseFloat(profileForm.passivo_total) : null,
      renda_bruta_anual:        profileForm.renda_bruta_anual ? parseFloat(profileForm.renda_bruta_anual) : null,
      renda_bruta_agropecuaria: profileForm.renda_bruta_agropecuaria ? parseFloat(profileForm.renda_bruta_agropecuaria) : null,
      renda_outras_atividades:  profileForm.renda_outras_atividades ? parseFloat(profileForm.renda_outras_atividades) : null,
    }
    const { data } = await supabase.from('client_financial_profiles')
      .upsert(payload, { onConflict: 'client_id,ano_referencia' })
      .select().single()
    if (data) setProfile(data as FinancialProfile)
    setProfileSaving(false); setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const totalOverheads = overheads.reduce((sum, o) => sum + o.valor, 0)

  const tabLabel: Record<FinTab, string> = {
    contas: 'Contas Bancárias', dividas: 'Dívidas',
    gastos_gerais: 'Gastos Gerais', perfil: 'Perfil Financeiro',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mini sub-nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ebe9e5', marginBottom: '20px', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
        {[
          { id: 'contas',        label: 'Contas Bancárias' },
          { id: 'dividas',       label: 'Dívidas' },
          { id: 'gastos_gerais', label: 'Gastos Gerais' },
          { id: 'perfil',        label: 'Perfil Financeiro' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFinTab(id as FinTab)}
            style={{
              flexShrink: 0,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: finTab === id ? 700 : 500,
              color: finTab === id ? '#1e1c1a' : '#999',
              border: 'none',
              borderBottom: finTab === id ? '2.5px solid #B95B37' : '2.5px solid transparent',
              marginBottom: -1,
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
      ) : (
        <>
          {/* ── Contas Bancárias ── */}
          {finTab === 'contas' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                {bankAccounts.map(a => (
                  <div key={a.id} style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: a.principal ? '2px solid #B95B37' : '1.5px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#010205', fontFamily: 'Manrope, sans-serif' }}>{a.banco}</div>
                      {a.principal && <span style={{ background: '#FDF0EB', color: '#B95B37', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>Principal</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#878C91', lineHeight: 1.8 }}>
                      {a.agencia && <div>Ag. {a.agencia}{a.prefixo ? ` Pfx. ${a.prefixo}` : ''}</div>}
                      {a.conta_corrente && <div>C/C {a.conta_corrente} · {a.tipo_conta ?? 'corrente'}</div>}
                      {a.relacionamento_desde && <div>Cliente desde {new Date(a.relacionamento_desde + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>}
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setEditAcctId(a.id); setAcctForm({ banco: a.banco, codigo_banco: a.codigo_banco ?? '', agencia: a.agencia ?? '', prefixo: a.prefixo ?? '', conta_corrente: a.conta_corrente ?? '', tipo_conta: a.tipo_conta ?? 'corrente', principal: a.principal, relacionamento_desde: a.relacionamento_desde ?? '' }); setAcctDrawer(true) }}
                        style={{ padding: '5px 12px', border: '1.5px solid var(--color-border)', borderRadius: '7px', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setAcctDrawer(true); setEditAcctId(null); setAcctForm(EMPTY_ACCOUNT_FORM) }}
                style={{ padding: '9px 18px', border: '1.5px dashed var(--color-border)', borderRadius: '10px', background: 'transparent', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#878C91' }}>
                + Adicionar conta
              </button>
            </div>
          )}

          {/* ── Dívidas ── */}
          {finTab === 'dividas' && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {DEBT_STATUSES.map(s => (
                    <button key={s} onClick={() => setDebtFilter(s)} style={{
                      padding: '6px 12px', borderRadius: '20px', border: `1.5px solid ${debtFilter === s ? '#B95B37' : 'var(--color-border)'}`,
                      background: debtFilter === s ? '#FDF0EB' : '#fff',
                      color: debtFilter === s ? '#B95B37' : '#878C91',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}>{s}</button>
                  ))}
                </div>
                <button onClick={() => { setDebtDrawer(true); setEditDebtId(null); setDebtForm(EMPTY_DEBT_FORM) }}
                  style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  + Nova Dívida
                </button>
              </div>
              {filteredDebts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#878C91', fontSize: '13px' }}>Nenhuma dívida encontrada.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Credor', 'Tipo', 'Valor contr.', 'Parcela', 'Vencimento', 'Status', 'Ações'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebts.map(d => {
                      const statusColor = d.status === 'Em dia' ? '#16a34a' : d.status === 'Atrasada' ? '#dc2626' : d.status === 'Liquidada' ? '#878C91' : '#d97706'
                      const statusBg    = d.status === 'Em dia' ? '#f0fdf4' : d.status === 'Atrasada' ? '#fef2f2' : d.status === 'Liquidada' ? '#f3f4f6' : '#fffbeb'
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', opacity: d.status === 'Liquidada' ? 0.6 : 1 }}>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{d.credor}</td>
                          <td style={{ padding: '10px', color: '#878C91' }}>{d.tipo_credito ?? '—'}</td>
                          <td style={{ padding: '10px' }}>{d.valor_contratado != null ? `R$ ${d.valor_contratado.toLocaleString('pt-BR')}` : '—'}</td>
                          <td style={{ padding: '10px' }}>{d.valor_parcela != null ? `R$ ${d.valor_parcela.toLocaleString('pt-BR')}` : '—'}</td>
                          <td style={{ padding: '10px', color: '#878C91' }}>{d.vencimento_final ? new Date(d.vencimento_final + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ background: statusBg, color: statusColor, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>{d.status}</span>
                          </td>
                          <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setEditDebtId(d.id); setDebtForm({ credor: d.credor, tipo_credito: d.tipo_credito ?? '', instituicao: d.instituicao ?? '', valor_contratado: d.valor_contratado?.toString() ?? '', valor_parcela: d.valor_parcela?.toString() ?? '', vencimento_final: d.vencimento_final ?? '', status: d.status, liquidada_em: d.liquidada_em ?? '' }); setDebtDrawer(true) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B95B37', fontWeight: 700, fontSize: '12px' }}>Editar</button>
                            {d.status !== 'Liquidada' && (
                              <button onClick={() => markLiquidada(d.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontWeight: 700, fontSize: '12px' }}>✓</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Gastos Gerais ── */}
          {finTab === 'gastos_gerais' && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <select className="input-field" style={{ boxSizing: 'border-box' }} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={() => { setOverheadDrawer(true); setEditOverheadId(null); setOverheadForm({ ...EMPTY_OVERHEAD_FORM, ano_referencia: String(selectedYear) }) }}
                  style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  + Novo Gasto
                </button>
              </div>
              {overheads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#878C91', fontSize: '13px' }}>Nenhum gasto cadastrado para {selectedYear}.</div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {['Categoria', 'Descrição', 'Valor', 'Imóvel', 'Ações'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overheads.map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td style={{ padding: '10px', color: '#878C91' }}>{o.categoria}</td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{o.descricao ?? '—'}</td>
                          <td style={{ padding: '10px' }}>R$ {o.valor.toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '10px', color: '#878C91' }}>{o.rural_properties?.nome ?? 'Todos'}</td>
                          <td style={{ padding: '10px' }}>
                            <button onClick={() => { setEditOverheadId(o.id); setOverheadForm({ categoria: o.categoria, descricao: o.descricao ?? '', valor: o.valor.toString(), property_id: o.property_id ?? '', ano_referencia: String(o.ano_referencia) }); setOverheadDrawer(true) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B95B37', fontWeight: 700, fontSize: '12px' }}>Editar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                        <td colSpan={2} style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Total:</td>
                        <td colSpan={3} style={{ padding: '10px', fontWeight: 800, color: '#B95B37', fontFamily: 'Manrope, sans-serif' }}>R$ {totalOverheads.toLocaleString('pt-BR')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>
          )}

          {/* ── Perfil Financeiro ── */}
          {finTab === 'perfil' && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Perfil Financeiro</div>
                <select className="input-field" style={{ boxSizing: 'border-box' }} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Patrimônio</div>
                  {([
                    { key: 'patrimonio_bruto', label: 'Patrimônio bruto (R$)' },
                    { key: 'patrimonio_liquido', label: 'Patrimônio líquido (R$)' },
                    { key: 'capital_proprio', label: 'Capital próprio (R$)' },
                    { key: 'passivo_total', label: 'Passivo total (R$)' },
                  ] as { key: keyof typeof profileForm; label: string }[]).map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                      <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.01" min="0"
                        value={profileForm[key]} onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0" />
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Renda</div>
                  {([
                    { key: 'renda_bruta_anual', label: 'Renda bruta anual (R$)' },
                    { key: 'renda_bruta_agropecuaria', label: 'Renda bruta agropecuária (R$)' },
                    { key: 'renda_outras_atividades', label: 'Renda outras atividades (R$)' },
                  ] as { key: keyof typeof profileForm; label: string }[]).map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                      <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.01" min="0"
                        value={profileForm[key]} onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0" />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <button onClick={handleProfileSave} disabled={profileSaving} className="btn-primary" style={{ opacity: profileSaving ? 0.7 : 1 }}>
                  {profileSaving ? 'Salvando…' : 'Salvar'}
                </button>
                {profileSaved && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✓ Salvo com sucesso</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Account drawer */}
      {acctDrawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} onClick={() => setAcctDrawer(false)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 48px rgba(0,0,0,0.16)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#010205', fontFamily: 'Manrope, sans-serif' }}>{editAcctId ? 'Editar Conta' : 'Nova Conta Bancária'}</div>
              <button onClick={() => setAcctDrawer(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#878C91', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'banco', label: 'Banco', placeholder: 'Banco do Brasil, Sicredi…' },
                { key: 'codigo_banco', label: 'Código FEBRABAN', placeholder: '001' },
                { key: 'agencia', label: 'Agência', placeholder: '1234-5' },
                { key: 'prefixo', label: 'Prefixo (BB)', placeholder: '7' },
                { key: 'conta_corrente', label: 'Conta corrente', placeholder: '12345-6' },
                { key: 'relacionamento_desde', label: 'Cliente desde (data)', placeholder: '' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                    type={key === 'relacionamento_desde' ? 'date' : 'text'}
                    value={acctForm[key as keyof typeof acctForm] as string}
                    onChange={e => setAcctForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Tipo de conta</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={acctForm.tipo_conta} onChange={e => setAcctForm(f => ({ ...f, tipo_conta: e.target.value }))}>
                  {['corrente', 'poupanca', 'investimento'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                <input type="checkbox" checked={acctForm.principal} onChange={e => setAcctForm(f => ({ ...f, principal: e.target.checked }))} />
                Conta principal
                {acctForm.principal && <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 400 }}>(substitui a conta principal atual deste banco)</span>}
              </label>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setAcctDrawer(false)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAcctSave} disabled={acctSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: acctSaving ? '#d4956f' : '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: acctSaving ? 'not-allowed' : 'pointer' }}>
                {acctSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Debt drawer */}
      {debtDrawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} onClick={() => setDebtDrawer(false)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 48px rgba(0,0,0,0.16)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#010205', fontFamily: 'Manrope, sans-serif' }}>{editDebtId ? 'Editar Dívida' : 'Nova Dívida'}</div>
              <button onClick={() => setDebtDrawer(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#878C91', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'credor', label: 'Credor', placeholder: 'Banco do Brasil' },
                { key: 'tipo_credito', label: 'Tipo de crédito', placeholder: 'Custeio Agrícola, Investimento…' },
                { key: 'instituicao', label: 'Instituição', placeholder: '—' },
                { key: 'valor_contratado', label: 'Valor contratado (R$)', placeholder: '120.000' },
                { key: 'valor_parcela', label: 'Valor da parcela (R$)', placeholder: '6.000' },
                { key: 'vencimento_final', label: 'Vencimento final', placeholder: '' },
                { key: 'liquidada_em', label: 'Liquidada em', placeholder: '' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                    type={key === 'valor_contratado' || key === 'valor_parcela' ? 'number' : key === 'vencimento_final' || key === 'liquidada_em' ? 'date' : 'text'}
                    value={debtForm[key as keyof typeof debtForm]}
                    onChange={e => setDebtForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Status</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={debtForm.status} onChange={e => setDebtForm(f => ({ ...f, status: e.target.value }))}>
                  {['Em dia', 'Atrasada', 'Renegociada', 'Liquidada'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setDebtDrawer(false)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDebtSave} disabled={debtSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: debtSaving ? '#d4956f' : '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: debtSaving ? 'not-allowed' : 'pointer' }}>
                {debtSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Overhead drawer */}
      {overheadDrawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} onClick={() => setOverheadDrawer(false)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 48px rgba(0,0,0,0.16)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#010205', fontFamily: 'Manrope, sans-serif' }}>{editOverheadId ? 'Editar Gasto' : 'Novo Gasto'}</div>
              <button onClick={() => setOverheadDrawer(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#878C91', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Categoria</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={overheadForm.categoria} onChange={e => setOverheadForm(f => ({ ...f, categoria: e.target.value }))}>
                  {OVERHEAD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Descrição</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={overheadForm.descricao} onChange={e => setOverheadForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Arrendamento Fazenda Norte…" />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Valor (R$)</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.01" min="0" value={overheadForm.valor} onChange={e => setOverheadForm(f => ({ ...f, valor: e.target.value }))} placeholder="48.000" />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Imóvel (opcional)</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={overheadForm.property_id} onChange={e => setOverheadForm(f => ({ ...f, property_id: e.target.value }))}>
                  <option value="">Todos / Geral</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Ano de referência</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" value={overheadForm.ano_referencia} onChange={e => setOverheadForm(f => ({ ...f, ano_referencia: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setOverheadDrawer(false)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleOverheadSave} disabled={overheadSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: overheadSaving ? '#d4956f' : '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: overheadSaving ? 'not-allowed' : 'pointer' }}>
                {overheadSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
