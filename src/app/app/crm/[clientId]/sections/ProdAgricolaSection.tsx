'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SectionProps } from './types'

interface ProdAgricolaSectionProps extends SectionProps {}

type CropProduction = {
  id: string
  atividade: string
  safra: string | null
  property_id: string
  talhao_id: string | null
  production_type: string | null
  area_ha: number | null
  tipo_cultivo: string | null
  irrigacao: boolean
  municipio: string | null
  municipio_ibge_code: string | null
  epoca_implantacao: string | null
  epoca_colheita: string | null
  epoca_comercializacao: string | null
  produtividade_prevista: number | null
  produtividade_obtida: number | null
  unidade_produtividade: string
  preco_unitario: number | null
  receita_bruta: number | null
  despesas_comercializacao: number | null
  receita_liquida: number | null
  custo_sementes: number | null
  custo_fertilizantes: number | null
  custo_defensivos: number | null
  custo_mao_de_obra: number | null
  custo_energia: number | null
  custo_combustivel: number | null
  custo_arrendamento: number | null
  custo_outros: number | null
  custo_total: number | null
  plantio_direto: boolean
  subsolagem: boolean
  calagem: boolean
  planta_cobertura: string | null
  sistema_integracao: string | null
  property_nome?: string | null
  talhao_nome?: string | null
}

type CropInput = {
  id: string
  categoria: string
  subcategoria: string | null
  produto: string | null
  momento: string | null
  dose_ha: number | null
  unidade_dose: string | null
  area_aplicada_ha: number | null
  custo_unitario: number | null
  custo_total: number | null
  data_aplicacao: string | null
}

type FieldHistoryRow = {
  id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string
  reason: string | null
}

type RuralProperty = { id: string; nome: string }
type Talhao = { id: string; nome: string; property_id: string }

type ProdSubTab = 'dados' | 'custos' | 'receitas' | 'insumos' | 'praticas' | 'historico'

function getSafraOptions() {
  const y = new Date().getFullYear()
  return Array.from({ length: 7 }, (_, i) => `${y - 3 + i}/${y - 2 + i}`)
}
function getDefaultSafra() {
  const y = new Date().getFullYear()
  return `${y - 1}/${y}`
}

const EMPTY_PROD_FORM = {
  atividade: '',
  safra: getDefaultSafra(),
  property_id: '',
  talhao_id: '',
  area_ha: '',
  tipo_cultivo: '',
  production_type: '',
  irrigacao: false,
}

const EMPTY_INPUT_FORM = {
  categoria: 'fertilizante',
  subcategoria: '',
  produto: '',
  momento: '',
  dose_ha: '',
  unidade_dose: '',
  area_aplicada_ha: '',
  custo_unitario: '',
  custo_total: '',
  data_aplicacao: '',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#878C91',
  letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase',
}

function fmtBRL(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ProdAgricolaSection({ clientId, organizationId }: ProdAgricolaSectionProps) {
  const supabase = createClient()

  const [selectedSafra,  setSelectedSafra]  = useState(getDefaultSafra())
  const [selectedPropId, setSelectedPropId] = useState('')
  const [productions,    setProductions]    = useState<CropProduction[]>([])
  const [properties,     setProperties]     = useState<RuralProperty[]>([])
  const [talhoes,        setTalhoes]        = useState<Talhao[]>([])
  const [loading,        setLoading]        = useState(true)

  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [expandSubTab,   setExpandSubTab]   = useState<ProdSubTab>('dados')
  const [cropInputs,     setCropInputs]     = useState<Record<string, CropInput[]>>({})
  const [fieldHistory,   setFieldHistory]   = useState<Record<string, FieldHistoryRow[]>>({})
  const [subLoading,     setSubLoading]     = useState(false)

  // Add/edit drawer
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editingProd,  setEditingProd]  = useState<string | null>(null)
  const [prodForm,     setProdForm]     = useState(EMPTY_PROD_FORM)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState('')

  // Inline sub-form state for cada sub-tab
  const [dadosForm,    setDadosForm]    = useState<Record<string, unknown>>({})
  const [custosForm,   setCustosForm]   = useState<Record<string, string>>({})
  const [receitasForm, setReceitasForm] = useState<Record<string, string>>({})
  const [praticasForm, setPraticasForm] = useState<Record<string, unknown>>({})
  const [subSaving,    setSubSaving]    = useState(false)

  // Insumos
  const [insumoDrawer,    setInsumoDrawer]    = useState(false)
  const [editingInsumoId, setEditingInsumoId] = useState<string | null>(null)
  const [insumoForm,      setInsumoForm]      = useState(EMPTY_INPUT_FORM)
  const [insumoSaving,    setInsumoSaving]    = useState(false)

  // Load properties
  useEffect(() => {
    supabase.from('rural_properties').select('id, nome')
      .eq('client_id', clientId)
      .then(({ data }) => setProperties((data ?? []) as RuralProperty[]))
  }, [clientId])

  // Load all talhoes for this client
  useEffect(() => {
    supabase.from('talhoes').select('id, nome, property_id')
      .eq('client_id', clientId)
      .then(({ data }) => setTalhoes((data ?? []) as Talhao[]))
  }, [clientId])

  // Load productions
  const loadProductions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('crop_productions')
      .select('*, rural_properties(nome), talhoes(nome)')
      .eq('client_id', clientId)
      .eq('safra', selectedSafra)
      .order('atividade')
    setProductions((data ?? []).map((p: any) => ({
      ...p,
      property_nome: p.rural_properties?.nome ?? null,
      talhao_nome:   p.talhoes?.nome ?? null,
    })))
    setLoading(false)
  }, [clientId, selectedSafra])

  useEffect(() => { loadProductions() }, [loadProductions])

  // Load sub-data when expandedId changes
  useEffect(() => {
    if (!expandedId) return
    setSubLoading(true)
    const prod = productions.find(p => p.id === expandedId)
    if (prod) {
      // Prefill form states
      setDadosForm({
        property_id: prod.property_id ?? '',
        talhao_id: prod.talhao_id ?? '',
        area_ha: prod.area_ha ?? '',
        production_type: prod.production_type ?? '',
        tipo_cultivo: prod.tipo_cultivo ?? '',
        irrigacao: prod.irrigacao,
        safra: prod.safra ?? '',
        epoca_implantacao: prod.epoca_implantacao ?? '',
        epoca_colheita: prod.epoca_colheita ?? '',
        municipio_ibge_code: prod.municipio_ibge_code ?? '',
      })
      setCustosForm({
        custo_sementes: prod.custo_sementes?.toString() ?? '',
        custo_fertilizantes: prod.custo_fertilizantes?.toString() ?? '',
        custo_defensivos: prod.custo_defensivos?.toString() ?? '',
        custo_mao_de_obra: prod.custo_mao_de_obra?.toString() ?? '',
        custo_energia: prod.custo_energia?.toString() ?? '',
        custo_combustivel: prod.custo_combustivel?.toString() ?? '',
        custo_arrendamento: prod.custo_arrendamento?.toString() ?? '',
        custo_outros: prod.custo_outros?.toString() ?? '',
        custo_total: prod.custo_total?.toString() ?? '',
      })
      setReceitasForm({
        produtividade_prevista: prod.produtividade_prevista?.toString() ?? '',
        produtividade_obtida: prod.produtividade_obtida?.toString() ?? '',
        unidade_produtividade: prod.unidade_produtividade ?? 'kg/ha',
        preco_unitario: prod.preco_unitario?.toString() ?? '',
        receita_bruta: prod.receita_bruta?.toString() ?? '',
        despesas_comercializacao: prod.despesas_comercializacao?.toString() ?? '',
        receita_liquida: prod.receita_liquida?.toString() ?? '',
      })
      setPraticasForm({
        plantio_direto: prod.plantio_direto,
        subsolagem: prod.subsolagem,
        calagem: prod.calagem,
        planta_cobertura: prod.planta_cobertura ?? '',
        sistema_integracao: prod.sistema_integracao ?? '',
      })
    }
    Promise.all([
      supabase.from('crop_inputs').select('*').eq('production_id', expandedId).order('categoria'),
      supabase.from('crop_production_field_history').select('*').eq('production_id', expandedId).order('changed_at', { ascending: false }),
    ]).then(([ins, hist]) => {
      setCropInputs(prev => ({ ...prev, [expandedId]: (ins.data ?? []) as CropInput[] }))
      setFieldHistory(prev => ({ ...prev, [expandedId]: (hist.data ?? []) as FieldHistoryRow[] }))
      setSubLoading(false)
    })
  }, [expandedId])

  async function handleCreateOrUpdate() {
    if (!prodForm.property_id) { setSaveError('Selecione um imóvel.'); return }
    if (!prodForm.atividade)   { setSaveError('Atividade é obrigatória.'); return }
    setSaving(true); setSaveError('')
    const payload = {
      organization_id: organizationId,
      client_id: clientId,
      atividade: prodForm.atividade,
      safra: prodForm.safra || null,
      property_id: prodForm.property_id,
      talhao_id: prodForm.talhao_id || null,
      area_ha: prodForm.area_ha ? parseFloat(prodForm.area_ha) : null,
      tipo_cultivo: prodForm.tipo_cultivo || null,
      production_type: prodForm.production_type || null,
      irrigacao: prodForm.irrigacao,
    }
    if (editingProd) {
      const { error } = await supabase.from('crop_productions').update(payload).eq('id', editingProd)
      if (error) { setSaveError(error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('crop_productions').insert(payload).select().single()
      if (error) { setSaveError(error.message); setSaving(false); return }
      setExpandedId(data.id)
      setExpandSubTab('dados')
    }
    setSaving(false)
    setDrawerOpen(false)
    setEditingProd(null)
    setProdForm(EMPTY_PROD_FORM)
    loadProductions()
  }

  async function handleSaveDados(prodId: string) {
    setSubSaving(true)
    const f = dadosForm
    await supabase.from('crop_productions').update({
      property_id: f.property_id || null,
      talhao_id: f.talhao_id || null,
      area_ha: f.area_ha ? parseFloat(f.area_ha as string) : null,
      production_type: f.production_type || null,
      tipo_cultivo: f.tipo_cultivo || null,
      irrigacao: f.irrigacao,
      safra: f.safra || null,
      epoca_implantacao: f.epoca_implantacao || null,
      epoca_colheita: f.epoca_colheita || null,
      municipio_ibge_code: f.municipio_ibge_code || null,
    }).eq('id', prodId)
    setSubSaving(false)
    loadProductions()
  }

  async function handleSaveCustos(prodId: string) {
    setSubSaving(true)
    const f = custosForm
    const toNum = (v: string) => v ? parseFloat(v) : null
    await supabase.from('crop_productions').update({
      custo_sementes: toNum(f.custo_sementes),
      custo_fertilizantes: toNum(f.custo_fertilizantes),
      custo_defensivos: toNum(f.custo_defensivos),
      custo_mao_de_obra: toNum(f.custo_mao_de_obra),
      custo_energia: toNum(f.custo_energia),
      custo_combustivel: toNum(f.custo_combustivel),
      custo_arrendamento: toNum(f.custo_arrendamento),
      custo_outros: toNum(f.custo_outros),
      custo_total: toNum(f.custo_total),
    }).eq('id', prodId)
    setSubSaving(false)
    loadProductions()
  }

  async function handleSaveReceitas(prodId: string) {
    setSubSaving(true)
    const f = receitasForm
    const toNum = (v: string) => v ? parseFloat(v) : null
    await supabase.from('crop_productions').update({
      produtividade_prevista: toNum(f.produtividade_prevista),
      produtividade_obtida: toNum(f.produtividade_obtida),
      unidade_produtividade: f.unidade_produtividade || 'kg/ha',
      preco_unitario: toNum(f.preco_unitario),
      receita_bruta: toNum(f.receita_bruta),
      despesas_comercializacao: toNum(f.despesas_comercializacao),
      receita_liquida: toNum(f.receita_liquida),
    }).eq('id', prodId)
    setSubSaving(false)
    loadProductions()
  }

  async function handleSavePraticas(prodId: string) {
    setSubSaving(true)
    const f = praticasForm
    await supabase.from('crop_productions').update({
      plantio_direto: f.plantio_direto,
      subsolagem: f.subsolagem,
      calagem: f.calagem,
      planta_cobertura: f.planta_cobertura || null,
      sistema_integracao: f.sistema_integracao || null,
    }).eq('id', prodId)
    setSubSaving(false)
    loadProductions()
  }

  async function handleDeleteProd(id: string) {
    if (!confirm('Excluir esta atividade agrícola?')) return
    await supabase.from('crop_productions').delete().eq('id', id)
    if (expandedId === id) setExpandedId(null)
    loadProductions()
  }

  async function handleSaveInsumo(prodId: string) {
    setInsumoSaving(true)
    const f = insumoForm
    const toNum = (v: string) => v ? parseFloat(v) : null
    const payload = {
      organization_id: organizationId,
      client_id: clientId,
      production_id: prodId,
      categoria: f.categoria,
      subcategoria: f.subcategoria || null,
      produto: f.produto || null,
      momento: f.momento || null,
      dose_ha: toNum(f.dose_ha),
      unidade_dose: f.unidade_dose || null,
      area_aplicada_ha: toNum(f.area_aplicada_ha),
      custo_unitario: toNum(f.custo_unitario),
      custo_total: toNum(f.custo_total),
      data_aplicacao: f.data_aplicacao || null,
    }
    if (editingInsumoId) {
      await supabase.from('crop_inputs').update(payload).eq('id', editingInsumoId)
    } else {
      await supabase.from('crop_inputs').insert(payload)
    }
    setInsumoSaving(false)
    setInsumoDrawer(false)
    setEditingInsumoId(null)
    setInsumoForm(EMPTY_INPUT_FORM)
    // Reload inputs
    const { data } = await supabase.from('crop_inputs').select('*').eq('production_id', prodId).order('categoria')
    setCropInputs(prev => ({ ...prev, [prodId]: (data ?? []) as CropInput[] }))
  }

  const safraOptions = getSafraOptions()
  const filteredProds = selectedPropId
    ? productions.filter(p => p.property_id === selectedPropId)
    : productions

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#878C91', fontWeight: 600 }}>Safra:</span>
          <select
            className="input-field"
            style={{ padding: '6px 10px' }}
            value={selectedSafra}
            onChange={e => setSelectedSafra(e.target.value)}
          >
            {safraOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#878C91', fontWeight: 600 }}>Imóvel:</span>
          <select
            className="input-field"
            style={{ padding: '6px 10px' }}
            value={selectedPropId}
            onChange={e => setSelectedPropId(e.target.value)}
          >
            <option value="">Todos</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setEditingProd(null); setProdForm(EMPTY_PROD_FORM); setSaveError(''); setDrawerOpen(true) }}
          style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Nova Atividade
        </button>
      </div>

      {/* Production list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
      ) : filteredProds.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌾</div>
          <p style={{ fontWeight: 700, fontSize: '15px', color: '#010205', marginBottom: '6px' }}>Nenhuma atividade agrícola</p>
          <p style={{ fontSize: '12px', color: '#878C91' }}>Adicione uma atividade para a safra {selectedSafra}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredProds.map(prod => {
            const isExpanded = expandedId === prod.id
            const propTalhoes = talhoes.filter(t => t.property_id === prod.property_id)

            return (
              <div key={prod.id}>
                {/* Card */}
                <div style={{ background: '#fff', borderRadius: isExpanded ? '14px 14px 0 0' : '14px', padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: isExpanded ? '1.5px solid #B95B37' : '1.5px solid var(--color-border)', borderBottom: isExpanded ? 'none' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', color: '#010205' }}>
                        {prod.atividade}
                      </div>
                      <div style={{ fontSize: '12px', color: '#878C91', marginTop: '3px' }}>
                        {prod.property_nome && <span>{prod.property_nome}</span>}
                        {prod.area_ha && <span> · {prod.area_ha} ha</span>}
                        {prod.talhao_nome && <span> · {prod.talhao_nome}</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#878C91', marginTop: '2px' }}>
                        {prod.produtividade_prevista && <span>Produtiv.: {prod.produtividade_prevista} {prod.unidade_produtividade}</span>}
                        {prod.custo_total && <span> · Custo: R$ {fmtBRL(prod.custo_total)}</span>}
                        {prod.receita_bruta && <span> · Receita: R$ {fmtBRL(prod.receita_bruta)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          setEditingProd(prod.id)
                          setProdForm({
                            atividade: prod.atividade,
                            safra: prod.safra ?? getDefaultSafra(),
                            property_id: prod.property_id,
                            talhao_id: prod.talhao_id ?? '',
                            area_ha: prod.area_ha?.toString() ?? '',
                            tipo_cultivo: prod.tipo_cultivo ?? '',
                            production_type: prod.production_type ?? '',
                            irrigacao: prod.irrigacao,
                          })
                          setDrawerOpen(true)
                        }}
                        style={{ padding: '5px 10px', border: '1.5px solid var(--color-border)', borderRadius: '7px', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#010205' }}
                      >
                        ✏
                      </button>
                      <button
                        onClick={() => handleDeleteProd(prod.id)}
                        style={{ padding: '5px 10px', border: '1.5px solid #fecaca', borderRadius: '7px', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}
                      >
                        ×
                      </button>
                      <button
                        onClick={() => {
                          if (isExpanded) { setExpandedId(null) }
                          else { setExpandedId(prod.id); setExpandSubTab('dados') }
                        }}
                        style={{ padding: '5px 12px', border: 'none', borderRadius: '7px', background: isExpanded ? '#B95B37' : '#FDF0EB', color: isExpanded ? '#fff' : '#B95B37', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {isExpanded ? 'Fechar' : 'Expandir'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded sub-tabs */}
                {isExpanded && (
                  <div style={{ background: '#fff', borderRadius: '0 0 14px 14px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1.5px solid #B95B37', borderTop: '1px solid #f3f4f6' }}>
                    {/* Sub-tab bar */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                      {(['dados', 'custos', 'receitas', 'insumos', 'praticas', 'historico'] as ProdSubTab[]).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setExpandSubTab(tab)}
                          style={{
                            flexShrink: 0, padding: '10px 16px', border: 'none',
                            borderBottom: expandSubTab === tab ? '2px solid #B95B37' : '2px solid transparent',
                            background: 'none', cursor: 'pointer', fontSize: '12px',
                            fontWeight: expandSubTab === tab ? 700 : 500,
                            color: expandSubTab === tab ? '#010205' : '#878C91',
                            whiteSpace: 'nowrap', textTransform: 'capitalize',
                          }}
                        >
                          {tab === 'praticas' ? 'Práticas' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: '20px 24px' }}>
                      {subLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
                      ) : (
                        <>
                          {/* DADOS */}
                          {expandSubTab === 'dados' && (
                            <div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                                <div>
                                  <div style={LABEL_STYLE}>Imóvel</div>
                                  <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.property_id ?? '')}
                                    onChange={e => setDadosForm(f => ({ ...f, property_id: e.target.value, talhao_id: '' }))}>
                                    <option value="">Selecionar…</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Talhão (opcional)</div>
                                  <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.talhao_id ?? '')}
                                    onChange={e => setDadosForm(f => ({ ...f, talhao_id: e.target.value }))}>
                                    <option value="">Nenhum</option>
                                    {talhoes.filter(t => t.property_id === (dadosForm.property_id as string)).map(t => (
                                      <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Área (ha)</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.01"
                                    value={String(dadosForm.area_ha ?? '')} onChange={e => setDadosForm(f => ({ ...f, area_ha: e.target.value }))} />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Tipo de produção</div>
                                  <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.production_type ?? '')}
                                    onChange={e => setDadosForm(f => ({ ...f, production_type: e.target.value }))}>
                                    <option value="">Selecionar…</option>
                                    {['temporaria', 'permanente', 'horticultura', 'fruticultura'].map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Tipo de cultivo</div>
                                  <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.tipo_cultivo ?? '')}
                                    onChange={e => setDadosForm(f => ({ ...f, tipo_cultivo: e.target.value }))}>
                                    <option value="">Selecionar…</option>
                                    {['Convencional', 'Orgânico', 'Irrigado', 'Outro'].map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                                  <input type="checkbox" id={`irrig-${prod.id}`} checked={Boolean(dadosForm.irrigacao)}
                                    onChange={e => setDadosForm(f => ({ ...f, irrigacao: e.target.checked }))} />
                                  <label htmlFor={`irrig-${prod.id}`} style={{ fontSize: '13px', fontWeight: 600 }}>Irrigado</label>
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Safra</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.safra ?? '')} onChange={e => setDadosForm(f => ({ ...f, safra: e.target.value }))} placeholder="2024/2025" />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Época de implantação</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.epoca_implantacao ?? '')} onChange={e => setDadosForm(f => ({ ...f, epoca_implantacao: e.target.value }))} placeholder="Out/2024" />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Época de colheita</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.epoca_colheita ?? '')} onChange={e => setDadosForm(f => ({ ...f, epoca_colheita: e.target.value }))} placeholder="Fev/2025" />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Código IBGE município</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(dadosForm.municipio_ibge_code ?? '')} onChange={e => setDadosForm(f => ({ ...f, municipio_ibge_code: e.target.value }))} />
                                </div>
                              </div>
                              <button onClick={() => handleSaveDados(prod.id)} disabled={subSaving} className="btn-primary" style={{ opacity: subSaving ? 0.7 : 1 }}>
                                {subSaving ? 'Salvando…' : 'Salvar Dados'}
                              </button>
                            </div>
                          )}

                          {/* CUSTOS */}
                          {expandSubTab === 'custos' && (
                            <div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                                {[
                                  { key: 'custo_sementes', label: 'Sementes' },
                                  { key: 'custo_fertilizantes', label: 'Fertilizantes' },
                                  { key: 'custo_defensivos', label: 'Defensivos' },
                                  { key: 'custo_mao_de_obra', label: 'Mão de obra' },
                                  { key: 'custo_energia', label: 'Energia' },
                                  { key: 'custo_combustivel', label: 'Combustível' },
                                  { key: 'custo_arrendamento', label: 'Arrendamento' },
                                  { key: 'custo_outros', label: 'Outros' },
                                  { key: 'custo_total', label: 'Custo total' },
                                ].map(({ key, label }) => (
                                  <div key={key}>
                                    <div style={LABEL_STYLE}>{label} (R$)</div>
                                    <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                      type="number" step="0.01" min="0"
                                      value={custosForm[key as keyof typeof custosForm] ?? ''}
                                      onChange={e => setCustosForm(f => ({ ...f, [key]: e.target.value }))} />
                                  </div>
                                ))}
                              </div>
                              {prod.area_ha && prod.custo_total && (
                                <div style={{ marginBottom: '12px', fontSize: '13px', color: '#878C91' }}>
                                  Custo/ha: R$ {fmtBRL(prod.custo_total / prod.area_ha)}
                                </div>
                              )}
                              <button onClick={() => handleSaveCustos(prod.id)} disabled={subSaving} className="btn-primary" style={{ opacity: subSaving ? 0.7 : 1 }}>
                                {subSaving ? 'Salvando…' : 'Salvar Custos'}
                              </button>
                            </div>
                          )}

                          {/* RECEITAS */}
                          {expandSubTab === 'receitas' && (
                            <div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                                <div>
                                  <div style={LABEL_STYLE}>Produtividade prevista</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    type="number" step="0.01"
                                    value={receitasForm.produtividade_prevista}
                                    onChange={e => setReceitasForm(f => ({ ...f, produtividade_prevista: e.target.value }))} />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Produtividade obtida</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    type="number" step="0.01"
                                    value={receitasForm.produtividade_obtida}
                                    onChange={e => setReceitasForm(f => ({ ...f, produtividade_obtida: e.target.value }))} />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Unidade produtividade</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={receitasForm.unidade_produtividade}
                                    onChange={e => setReceitasForm(f => ({ ...f, unidade_produtividade: e.target.value }))} placeholder="kg/ha" />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Preço unitário (R$)</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    type="number" step="0.01"
                                    value={receitasForm.preco_unitario}
                                    onChange={e => setReceitasForm(f => ({ ...f, preco_unitario: e.target.value }))} />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Receita bruta (R$)</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    type="number" step="0.01"
                                    value={receitasForm.receita_bruta}
                                    onChange={e => setReceitasForm(f => ({ ...f, receita_bruta: e.target.value }))} />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Despesas comercialização (R$)</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    type="number" step="0.01"
                                    value={receitasForm.despesas_comercializacao}
                                    onChange={e => setReceitasForm(f => ({ ...f, despesas_comercializacao: e.target.value }))} />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Receita líquida (R$)</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    type="number" step="0.01"
                                    value={receitasForm.receita_liquida}
                                    onChange={e => setReceitasForm(f => ({ ...f, receita_liquida: e.target.value }))} />
                                </div>
                              </div>
                              <button onClick={() => handleSaveReceitas(prod.id)} disabled={subSaving} className="btn-primary" style={{ opacity: subSaving ? 0.7 : 1 }}>
                                {subSaving ? 'Salvando…' : 'Salvar Receitas'}
                              </button>
                            </div>
                          )}

                          {/* INSUMOS */}
                          {expandSubTab === 'insumos' && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                                <button onClick={() => { setEditingInsumoId(null); setInsumoForm(EMPTY_INPUT_FORM); setInsumoDrawer(true) }}
                                  style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                  + Novo Insumo
                                </button>
                              </div>
                              {(cropInputs[prod.id] ?? []).length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#878C91', textAlign: 'center', padding: '16px 0' }}>Nenhum insumo registrado.</p>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                      {['Categoria', 'Produto', 'Dose/ha', 'Área (ha)', 'Custo total', ''].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(cropInputs[prod.id] ?? []).map(ins => (
                                      <tr key={ins.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                        <td style={{ padding: '8px' }}><span style={{ background: '#FDF0EB', color: '#B95B37', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600 }}>{ins.categoria}</span></td>
                                        <td style={{ padding: '8px' }}>{ins.produto ?? '—'}</td>
                                        <td style={{ padding: '8px' }}>{ins.dose_ha ?? '—'} {ins.unidade_dose ?? ''}</td>
                                        <td style={{ padding: '8px' }}>{ins.area_aplicada_ha ?? '—'}</td>
                                        <td style={{ padding: '8px' }}>R$ {fmtBRL(ins.custo_total)}</td>
                                        <td style={{ padding: '8px' }}>
                                          <button onClick={() => {
                                            setEditingInsumoId(ins.id)
                                            setInsumoForm({
                                              categoria: ins.categoria,
                                              subcategoria: ins.subcategoria ?? '',
                                              produto: ins.produto ?? '',
                                              momento: ins.momento ?? '',
                                              dose_ha: ins.dose_ha?.toString() ?? '',
                                              unidade_dose: ins.unidade_dose ?? '',
                                              area_aplicada_ha: ins.area_aplicada_ha?.toString() ?? '',
                                              custo_unitario: ins.custo_unitario?.toString() ?? '',
                                              custo_total: ins.custo_total?.toString() ?? '',
                                              data_aplicacao: ins.data_aplicacao ?? '',
                                            })
                                            setInsumoDrawer(true)
                                          }} style={{ padding: '3px 8px', border: '1.5px solid var(--color-border)', borderRadius: '6px', background: '#fff', fontSize: '11px', cursor: 'pointer' }}>✏</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* Insumo drawer */}
                              {insumoDrawer && (
                                <>
                                  <div onClick={() => setInsumoDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 300 }} />
                                  <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', background: '#fff', zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 48px rgba(0,0,0,0.16)' }}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#010205' }}>{editingInsumoId ? 'Editar Insumo' : 'Novo Insumo'}</div>
                                      <button onClick={() => setInsumoDrawer(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', fontSize: '16px', color: '#878C91' }}>×</button>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                      <div>
                                        <div style={LABEL_STYLE}>Categoria</div>
                                        <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                          value={insumoForm.categoria}
                                          onChange={e => setInsumoForm(f => ({ ...f, categoria: e.target.value }))}>
                                          {['fertilizante', 'defensivo', 'semente', 'corretivo', 'outros'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                      </div>
                                      {['produto', 'subcategoria', 'momento'].map(key => (
                                        <div key={key}>
                                          <div style={LABEL_STYLE}>{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                            value={(insumoForm as any)[key]}
                                            onChange={e => setInsumoForm(f => ({ ...f, [key]: e.target.value }))} />
                                        </div>
                                      ))}
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {[
                                          { key: 'dose_ha', label: 'Dose/ha' },
                                          { key: 'unidade_dose', label: 'Unidade dose' },
                                          { key: 'area_aplicada_ha', label: 'Área aplicada (ha)' },
                                          { key: 'custo_unitario', label: 'Custo unitário (R$)' },
                                          { key: 'custo_total', label: 'Custo total (R$)' },
                                          { key: 'data_aplicacao', label: 'Data aplicação' },
                                        ].map(({ key, label }) => (
                                          <div key={key}>
                                            <div style={LABEL_STYLE}>{label}</div>
                                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                              type={key.includes('data') ? 'date' : 'text'}
                                              value={(insumoForm as any)[key]}
                                              onChange={e => setInsumoForm(f => ({ ...f, [key]: e.target.value }))} />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                      <button onClick={() => setInsumoDrawer(false)} style={{ padding: '8px 16px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                                      <button onClick={() => handleSaveInsumo(prod.id)} disabled={insumoSaving}
                                        style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: insumoSaving ? '#d4956f' : '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: insumoSaving ? 'not-allowed' : 'pointer' }}>
                                        {insumoSaving ? 'Salvando…' : 'Salvar'}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* PRÁTICAS */}
                          {expandSubTab === 'praticas' && (
                            <div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                                {[
                                  { key: 'plantio_direto', label: 'Plantio direto' },
                                  { key: 'subsolagem', label: 'Subsolagem' },
                                  { key: 'calagem', label: 'Calagem' },
                                ].map(({ key, label }) => (
                                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={Boolean(praticasForm[key as keyof typeof praticasForm])}
                                      onChange={e => setPraticasForm(f => ({ ...f, [key]: e.target.checked }))} />
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
                                  </label>
                                ))}
                                <div>
                                  <div style={LABEL_STYLE}>Planta de cobertura</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(praticasForm.planta_cobertura ?? '')}
                                    onChange={e => setPraticasForm(f => ({ ...f, planta_cobertura: e.target.value }))} placeholder="Braquiária, Crotalária…" />
                                </div>
                                <div>
                                  <div style={LABEL_STYLE}>Sistema de integração</div>
                                  <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={String(praticasForm.sistema_integracao ?? '')}
                                    onChange={e => setPraticasForm(f => ({ ...f, sistema_integracao: e.target.value }))}>
                                    <option value="">Nenhum</option>
                                    {['ILP', 'ILPF', 'iLPF', 'agrofloresta', 'SAF'].map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                              </div>
                              <button onClick={() => handleSavePraticas(prod.id)} disabled={subSaving} className="btn-primary" style={{ opacity: subSaving ? 0.7 : 1 }}>
                                {subSaving ? 'Salvando…' : 'Salvar Práticas'}
                              </button>
                            </div>
                          )}

                          {/* HISTÓRICO */}
                          {expandSubTab === 'historico' && (
                            <div>
                              {(fieldHistory[prod.id] ?? []).length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#878C91', textAlign: 'center', padding: '16px 0' }}>Nenhuma alteração registrada.</p>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                      {['Campo', 'Antes', 'Depois', 'Data'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(fieldHistory[prod.id] ?? []).map(h => (
                                      <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                        <td style={{ padding: '7px 8px', fontWeight: 600 }}>{h.field_name}</td>
                                        <td style={{ padding: '7px 8px', color: '#dc2626' }}>{h.old_value ?? '—'}</td>
                                        <td style={{ padding: '7px 8px', color: '#16a34a' }}>{h.new_value ?? '—'}</td>
                                        <td style={{ padding: '7px 8px', color: '#878C91' }}>{new Date(h.changed_at).toLocaleDateString('pt-BR')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit drawer */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.16)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '17px', color: '#010205', fontFamily: 'Manrope, sans-serif' }}>
            {editingProd ? 'Editar Atividade' : 'Nova Atividade Agrícola'}
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#878C91', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={LABEL_STYLE}>Atividade *</div>
            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={prodForm.atividade} onChange={e => setProdForm(f => ({ ...f, atividade: e.target.value }))}
              placeholder="SOJA, MILHO, CAFÉ ARÁBICA…" />
          </div>
          <div>
            <div style={LABEL_STYLE}>Safra</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={prodForm.safra} onChange={e => setProdForm(f => ({ ...f, safra: e.target.value }))}>
              {safraOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={LABEL_STYLE}>Imóvel *</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={prodForm.property_id} onChange={e => setProdForm(f => ({ ...f, property_id: e.target.value, talhao_id: '' }))}>
              <option value="">Selecionar…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <div style={LABEL_STYLE}>Talhão (opcional)</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={prodForm.talhao_id} onChange={e => setProdForm(f => ({ ...f, talhao_id: e.target.value }))}>
              <option value="">Nenhum</option>
              {talhoes.filter(t => t.property_id === prodForm.property_id).map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={LABEL_STYLE}>Área (ha)</div>
            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              type="number" step="0.01" min="0"
              value={prodForm.area_ha} onChange={e => setProdForm(f => ({ ...f, area_ha: e.target.value }))} />
          </div>
          <div>
            <div style={LABEL_STYLE}>Tipo de cultivo</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={prodForm.tipo_cultivo} onChange={e => setProdForm(f => ({ ...f, tipo_cultivo: e.target.value }))}>
              <option value="">Selecionar…</option>
              {['Convencional', 'Orgânico', 'Irrigado', 'Outro'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {saveError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>{saveError}</div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setDrawerOpen(false)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#010205' }}>Cancelar</button>
          <button onClick={handleCreateOrUpdate} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: saving ? '#d4956f' : '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Salvando…' : editingProd ? 'Salvar alterações' : 'Criar atividade'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProdAgricolaSection
