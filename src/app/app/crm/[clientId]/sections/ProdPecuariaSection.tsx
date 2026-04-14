'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SectionProps } from './types'

interface ProdPecuariaSectionProps extends SectionProps {}

type LivestockProduction = {
  id: string
  species_type: string | null
  property_id: string
  talhao_id: string | null
  qtd_total: number | null
  qtd_vacas: number | null
  qtd_touros: number | null
  qtd_novilhas: number | null
  qtd_bezerros: number | null
  receita_total: number | null
  receita_liquida_anual: number | null
  receita_animais: number | null
  receita_produtos: number | null
  custo_alimentacao: number | null
  custo_assist_veterinaria: number | null
  custo_vacinas: number | null
  custo_mao_de_obra: number | null
  total_custeio: number | null
  custo_reproducao: number | null
  municipio_ibge_code: string | null
  property_nome?: string | null
}

type BovinoIndex = {
  id?: string
  natalidade_pct: number | null
  mortalidade_bezerros_pct: number | null
  mortalidade_adultos_pct: number | null
  mortalidade_1_2_anos_pct: number | null
  descarte_matrizes_pct: number | null
  descarte_touros_pct: number | null
  relacao_touro_vaca: number | null
  idade_desmame_meses: number | null
  peso_desmame_kg: number | null
  peso_venda_kg: number | null
  idade_venda_meses: number | null
  ganho_peso_diario_kg: number | null
  lotacao_ua_ha: number | null
  desfrute_pct: number | null
  producao_leite_litros_dia: number | null
  dias_lactacao: number | null
  intervalo_partos_dias: number | null
  idade_primeiro_parto_meses: number | null
}

type LivestockInput = {
  id: string
  categoria: string
  produto: string | null
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

type PecSubTab = 'dados' | 'indices' | 'custos' | 'receitas' | 'insumos' | 'historico'

const SPECIES_LABELS: Record<string, string> = {
  bovino_corte: 'Bovino de Corte',
  bovino_leite: 'Bovino de Leite',
  suino: 'Suíno',
  aves: 'Aves',
  ovino: 'Ovino',
  caprino: 'Caprino',
}

const EMPTY_PROD_FORM = {
  species_type: 'bovino_corte',
  property_id: '',
  talhao_id: '',
  qtd_total: '',
  qtd_vacas: '',
  qtd_touros: '',
  qtd_novilhas: '',
  qtd_bezerros: '',
  municipio_ibge_code: '',
}

const EMPTY_INPUT_FORM = {
  categoria: 'alimentacao',
  produto: '',
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

export function ProdPecuariaSection({ clientId, organizationId }: ProdPecuariaSectionProps) {
  const supabase = createClient()

  const [productions,    setProductions]    = useState<LivestockProduction[]>([])
  const [properties,     setProperties]     = useState<RuralProperty[]>([])
  const [loading,        setLoading]        = useState(true)

  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [expandSubTab,   setExpandSubTab]   = useState<PecSubTab>('dados')
  const [subLoading,     setSubLoading]     = useState(false)

  const [bovinoIndices,  setBovinoIndices]  = useState<Record<string, BovinoIndex>>({})
  const [lstkInputs,     setLstkInputs]     = useState<Record<string, LivestockInput[]>>({})
  const [fieldHistory,   setFieldHistory]   = useState<Record<string, FieldHistoryRow[]>>({})

  // Add/Edit drawer
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editingProd,  setEditingProd]  = useState<string | null>(null)
  const [prodForm,     setProdForm]     = useState(EMPTY_PROD_FORM)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState('')

  // Sub-form state
  const [dadosForm,      setDadosForm]      = useState<Record<string, unknown>>({})
  const [custosForm,     setCustosForm]     = useState<Record<string, string>>({})
  const [receitasForm,   setReceitasForm]   = useState<Record<string, string>>({})
  const [indicesForm,    setIndicesForm]    = useState<Record<string, string>>({})
  const [subSaving,      setSubSaving]      = useState(false)

  // Insumos
  const [insumoDrawer,    setInsumoDrawer]    = useState(false)
  const [editingInsumoId, setEditingInsumoId] = useState<string | null>(null)
  const [insumoForm,      setInsumoForm]      = useState(EMPTY_INPUT_FORM)
  const [insumoSaving,    setInsumoSaving]    = useState(false)

  useEffect(() => {
    supabase.from('rural_properties').select('id, nome')
      .eq('client_id', clientId)
      .then(({ data }) => setProperties((data ?? []) as RuralProperty[]))
  }, [clientId])

  const loadProductions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('livestock_productions')
      .select('*, rural_properties(nome)')
      .eq('client_id', clientId)
      .order('species_type')
    setProductions((data ?? []).map((p: any) => ({
      ...p,
      property_nome: p.rural_properties?.nome ?? null,
    })))
    setLoading(false)
  }, [clientId])

  useEffect(() => { loadProductions() }, [loadProductions])

  // Pre-fill all sub-tab forms whenever the expanded production record
  // becomes available in the productions array. Handles both:
  // (a) user expands an existing card — prod found immediately
  // (b) user creates a new activity — prod not in array yet; fires again
  //     once loadProductions() completes and productions updates
  useEffect(() => {
    if (!expandedId) return
    const prod = productions.find(p => p.id === expandedId)
    if (!prod) return
    setDadosForm({
      species_type: prod.species_type ?? '',
      property_id: prod.property_id ?? '',
      qtd_total: prod.qtd_total ?? '',
      qtd_vacas: prod.qtd_vacas ?? '',
      qtd_touros: prod.qtd_touros ?? '',
      qtd_novilhas: prod.qtd_novilhas ?? '',
      qtd_bezerros: prod.qtd_bezerros ?? '',
      municipio_ibge_code: prod.municipio_ibge_code ?? '',
    })
    setCustosForm({
      custo_alimentacao: prod.custo_alimentacao?.toString() ?? '',
      custo_assist_veterinaria: prod.custo_assist_veterinaria?.toString() ?? '',
      custo_vacinas: prod.custo_vacinas?.toString() ?? '',
      custo_mao_de_obra: prod.custo_mao_de_obra?.toString() ?? '',
      custo_reproducao: prod.custo_reproducao?.toString() ?? '',
      total_custeio: prod.total_custeio?.toString() ?? '',
    })
    setReceitasForm({
      receita_animais: prod.receita_animais?.toString() ?? '',
      receita_produtos: prod.receita_produtos?.toString() ?? '',
      receita_total: prod.receita_total?.toString() ?? '',
      receita_liquida_anual: prod.receita_liquida_anual?.toString() ?? '',
    })
  }, [expandedId, productions])

  // Load bovino_indices + livestock_inputs + field_history when a card is expanded
  useEffect(() => {
    if (!expandedId) return
    setSubLoading(true)
    const prod = productions.find(p => p.id === expandedId)
    const isBovino = prod?.species_type?.startsWith('bovino')
    const loadBovino = isBovino
      ? supabase.from('bovino_indices').select('*').eq('livestock_production_id', expandedId).maybeSingle()
      : Promise.resolve({ data: null })

    Promise.all([
      loadBovino,
      supabase.from('livestock_inputs').select('*').eq('livestock_production_id', expandedId).order('categoria'),
      supabase.from('livestock_production_field_history').select('*').eq('livestock_production_id', expandedId).order('changed_at', { ascending: false }),
    ]).then(([bi, ins, hist]) => {
      if (bi.data) {
        setBovinoIndices(prev => ({ ...prev, [expandedId]: bi.data as BovinoIndex }))
        // Build form state from bovino data
        const b = bi.data as BovinoIndex
        const f: Record<string, string> = {}
        Object.entries(b).forEach(([k, v]) => {
          if (k !== 'id' && v != null) f[k] = String(v)
        })
        setIndicesForm(f)
      } else {
        setIndicesForm({})
      }
      setLstkInputs(prev => ({ ...prev, [expandedId]: (ins.data ?? []) as LivestockInput[] }))
      setFieldHistory(prev => ({ ...prev, [expandedId]: (hist.data ?? []) as FieldHistoryRow[] }))
      setSubLoading(false)
    })
  }, [expandedId])

  // Map species_type enum → human-readable atividade (required NOT NULL by DB)
  const SPECIES_ATIVIDADE: Record<string, string> = {
    bovino_corte:  'Bovinocultura-Corte',
    bovino_leite:  'Bovinocultura-Leite',
    suino:         'Suinocultura',
    aves:          'Avicultura',
    ovino:         'Ovinocultura',
    caprino:       'Caprinocultura',
  }

  async function handleCreateOrUpdate() {
    if (!prodForm.property_id) { setSaveError('Selecione um imóvel.'); return }
    setSaving(true); setSaveError('')
    const atividade = (prodForm.species_type && SPECIES_ATIVIDADE[prodForm.species_type])
      ? SPECIES_ATIVIDADE[prodForm.species_type]
      : (prodForm.species_type ?? 'Pecuária')
    const payload = {
      organization_id: organizationId,
      client_id: clientId,
      atividade,
      species_type: prodForm.species_type || null,
      property_id: prodForm.property_id,
      talhao_id: prodForm.talhao_id || null,
      qtd_total: prodForm.qtd_total ? parseInt(prodForm.qtd_total) : null,
      qtd_vacas: prodForm.qtd_vacas ? parseInt(prodForm.qtd_vacas) : null,
      qtd_touros: prodForm.qtd_touros ? parseInt(prodForm.qtd_touros) : null,
      qtd_novilhas: prodForm.qtd_novilhas ? parseInt(prodForm.qtd_novilhas) : null,
      qtd_bezerros: prodForm.qtd_bezerros ? parseInt(prodForm.qtd_bezerros) : null,
      municipio_ibge_code: prodForm.municipio_ibge_code || null,
    }
    if (editingProd) {
      const { error } = await supabase.from('livestock_productions').update(payload).eq('id', editingProd)
      if (error) { setSaveError(error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('livestock_productions').insert(payload).select().single()
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
    const toInt = (v: unknown) => v ? parseInt(String(v)) : null
    await supabase.from('livestock_productions').update({
      species_type: f.species_type || null,
      property_id: f.property_id || null,
      qtd_total: toInt(f.qtd_total),
      qtd_vacas: toInt(f.qtd_vacas),
      qtd_touros: toInt(f.qtd_touros),
      qtd_novilhas: toInt(f.qtd_novilhas),
      qtd_bezerros: toInt(f.qtd_bezerros),
      municipio_ibge_code: f.municipio_ibge_code || null,
    }).eq('id', prodId)
    setSubSaving(false)
    loadProductions()
  }

  async function handleSaveCustos(prodId: string) {
    setSubSaving(true)
    const f = custosForm
    const toNum = (v: string) => v ? parseFloat(v) : null
    await supabase.from('livestock_productions').update({
      custo_alimentacao: toNum(f.custo_alimentacao),
      custo_assist_veterinaria: toNum(f.custo_assist_veterinaria),
      custo_vacinas: toNum(f.custo_vacinas),
      custo_mao_de_obra: toNum(f.custo_mao_de_obra),
      custo_reproducao: toNum(f.custo_reproducao),
      total_custeio: toNum(f.total_custeio),
    }).eq('id', prodId)
    setSubSaving(false)
    loadProductions()
  }

  async function handleSaveReceitas(prodId: string) {
    setSubSaving(true)
    const f = receitasForm
    const toNum = (v: string) => v ? parseFloat(v) : null
    await supabase.from('livestock_productions').update({
      receita_animais: toNum(f.receita_animais),
      receita_produtos: toNum(f.receita_produtos),
      receita_total: toNum(f.receita_total),
      receita_liquida_anual: toNum(f.receita_liquida_anual),
    }).eq('id', prodId)
    setSubSaving(false)
    loadProductions()
  }

  async function handleSaveIndices(prodId: string, speciesType: string | null) {
    setSubSaving(true)
    const f = indicesForm
    const toNum = (v: string) => v ? parseFloat(v) : null
    const existingId = bovinoIndices[prodId]?.id

    if (speciesType?.startsWith('bovino')) {
      const payload: Record<string, unknown> = {
        livestock_production_id: prodId,
        organization_id: organizationId,
        client_id: clientId,
      }
      const numFields = ['natalidade_pct', 'mortalidade_bezerros_pct', 'mortalidade_adultos_pct',
        'mortalidade_1_2_anos_pct', 'descarte_matrizes_pct', 'descarte_touros_pct',
        'relacao_touro_vaca', 'idade_desmame_meses', 'peso_desmame_kg', 'peso_venda_kg',
        'idade_venda_meses', 'ganho_peso_diario_kg', 'lotacao_ua_ha', 'desfrute_pct',
        'producao_leite_litros_dia', 'dias_lactacao', 'intervalo_partos_dias', 'idade_primeiro_parto_meses']
      numFields.forEach(k => { payload[k] = toNum(f[k] ?? '') })

      if (existingId) {
        await supabase.from('bovino_indices').update(payload).eq('id', existingId)
      } else {
        const { data } = await supabase.from('bovino_indices').insert(payload).select().single()
        if (data) setBovinoIndices(prev => ({ ...prev, [prodId]: data as BovinoIndex }))
      }
    }
    setSubSaving(false)
  }

  async function handleDeleteProd(id: string) {
    if (!confirm('Excluir esta atividade pecuária?')) return
    await supabase.from('livestock_productions').delete().eq('id', id)
    if (expandedId === id) setExpandedId(null)
    loadProductions()
  }

  async function handleSaveInsumo(prodId: string) {
    setInsumoSaving(true)
    const f = insumoForm
    const payload = {
      organization_id: organizationId,
      client_id: clientId,
      livestock_production_id: prodId,
      categoria: f.categoria,
      produto: f.produto || null,
      custo_total: f.custo_total ? parseFloat(f.custo_total) : null,
      data_aplicacao: f.data_aplicacao || null,
    }
    if (editingInsumoId) {
      await supabase.from('livestock_inputs').update(payload).eq('id', editingInsumoId)
    } else {
      await supabase.from('livestock_inputs').insert(payload)
    }
    setInsumoSaving(false)
    setInsumoDrawer(false)
    setEditingInsumoId(null)
    setInsumoForm(EMPTY_INPUT_FORM)
    const { data } = await supabase.from('livestock_inputs').select('*').eq('livestock_production_id', prodId).order('categoria')
    setLstkInputs(prev => ({ ...prev, [prodId]: (data ?? []) as LivestockInput[] }))
  }

  function IndicesForm({ prod }: { prod: LivestockProduction }) {
    const speciesType = prod.species_type
    const isBovino = speciesType?.startsWith('bovino')
    const isLeite  = speciesType === 'bovino_leite'

    if (!isBovino) {
      return <p style={{ fontSize: '13px', color: '#878C91', padding: '8px 0' }}>Índices detalhados não disponíveis para esta espécie.</p>
    }

    const groups = [
      {
        title: 'Reprodução',
        fields: [
          { key: 'natalidade_pct', label: 'Natalidade (%)' },
          { key: 'mortalidade_bezerros_pct', label: 'Mortalidade bezerros (%)' },
          { key: 'mortalidade_adultos_pct', label: 'Mortalidade adultos (%)' },
          { key: 'descarte_matrizes_pct', label: 'Descarte matrizes (%)' },
          { key: 'relacao_touro_vaca', label: 'Relação touro/vaca' },
        ],
      },
      {
        title: 'Crescimento',
        fields: [
          { key: 'peso_desmame_kg', label: 'Peso desmame (kg)' },
          { key: 'peso_venda_kg', label: 'Peso venda (kg)' },
          { key: 'ganho_peso_diario_kg', label: 'Ganho peso diário (kg)' },
          { key: 'idade_venda_meses', label: 'Idade venda (meses)' },
        ],
      },
      {
        title: 'Produção',
        fields: [
          { key: 'lotacao_ua_ha', label: 'Lotação (UA/ha)' },
          { key: 'desfrute_pct', label: 'Desfrute (%)' },
        ],
      },
      ...(isLeite ? [{
        title: 'Leite',
        fields: [
          { key: 'producao_leite_litros_dia', label: 'Produção leite (L/dia)' },
          { key: 'dias_lactacao', label: 'Dias em lactação' },
          { key: 'intervalo_partos_dias', label: 'Intervalo entre partos (dias)' },
          { key: 'idade_primeiro_parto_meses', label: 'Idade 1º parto (meses)' },
        ],
      }] : []),
    ]

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '16px' }}>
          {groups.map(group => (
            <div key={group.title}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#010205', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {group.fields.map(({ key, label }) => (
                  <div key={key}>
                    <div style={LABEL_STYLE}>{label}</div>
                    <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                      type="number" step="0.01"
                      value={indicesForm[key] ?? ''}
                      onChange={e => setIndicesForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => handleSaveIndices(prod.id, prod.species_type)} disabled={subSaving} className="btn-primary" style={{ opacity: subSaving ? 0.7 : 1 }}>
          {subSaving ? 'Salvando…' : 'Salvar Índices'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { setEditingProd(null); setProdForm(EMPTY_PROD_FORM); setSaveError(''); setDrawerOpen(true) }}
          style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Nova Atividade Pecuária
        </button>
      </div>

      {/* Production list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
      ) : productions.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🐄</div>
          <p style={{ fontWeight: 700, fontSize: '15px', color: '#010205', marginBottom: '6px' }}>Nenhuma atividade pecuária</p>
          <p style={{ fontSize: '12px', color: '#878C91' }}>Adicione uma atividade pecuária para este cliente.</p>
        </div>
      ) : (
        <div>
          {/* Card list */}
          {productions.map(prod => {
            const speciesLabel = prod.species_type ? (SPECIES_LABELS[prod.species_type] ?? prod.species_type) : 'Espécie não definida'
            return (
              <div key={prod.id} style={{ marginBottom: '10px' }}>
                {/* Card */}
                <div
                  onClick={() => {
                    setExpandedId(expandedId === prod.id ? null : prod.id)
                    setExpandSubTab('dados')
                  }}
                  style={{
                    background: 'white',
                    border: expandedId === prod.id ? '1.5px solid #B95B37' : '1px solid #ebe9e5',
                    borderRadius: expandedId === prod.id ? '10px 10px 0 0' : '10px',
                    borderBottom: expandedId === prod.id ? 'none' : undefined,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e1c1a' }}>{speciesLabel}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                      {prod.property_nome && <span>{prod.property_nome}</span>}
                      {prod.qtd_total && <span> · {prod.qtd_total.toLocaleString('pt-BR')} animais</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {/* Edit button */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setEditingProd(prod.id)
                        setProdForm({
                          species_type: prod.species_type ?? 'bovino_corte',
                          property_id: prod.property_id ?? '',
                          talhao_id: prod.talhao_id ?? '',
                          qtd_total: prod.qtd_total?.toString() ?? '',
                          qtd_vacas: prod.qtd_vacas?.toString() ?? '',
                          qtd_touros: prod.qtd_touros?.toString() ?? '',
                          qtd_novilhas: prod.qtd_novilhas?.toString() ?? '',
                          qtd_bezerros: prod.qtd_bezerros?.toString() ?? '',
                          municipio_ibge_code: prod.municipio_ibge_code ?? '',
                        })
                        setDrawerOpen(true)
                      }}
                      style={{ padding: '6px 12px', border: '1px solid #ebe9e5', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#555' }}
                    >✏ Editar</button>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteProd(prod.id) }}
                      style={{ padding: '6px 10px', border: '1px solid #fecaca', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#dc2626' }}
                    >×</button>
                    {/* Chevron */}
                    <span style={{
                      fontSize: '18px',
                      color: expandedId === prod.id ? '#B95B37' : '#bbb',
                      flexShrink: 0,
                      display: 'inline-block',
                      transform: expandedId === prod.id ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}>›</span>
                  </div>
                </div>

                {/* Inline accordion */}
                {expandedId === prod.id && (
                  <div style={{
                    background: 'white',
                    border: '1.5px solid #B95B37',
                    borderTop: '1px solid #f3f4f6',
                    borderRadius: '0 0 10px 10px',
                  }}>
                    {/* Sub-tab bar */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #ebe9e5', overflowX: 'auto', scrollbarWidth: 'none' }}>
                      {(['dados', 'indices', 'custos', 'receitas', 'insumos', 'historico'] as PecSubTab[]).map(tab => (
                        <button key={tab} onClick={() => setExpandSubTab(tab)} style={{
                          flexShrink: 0, padding: '10px 18px', border: 'none',
                          borderBottom: expandSubTab === tab ? '2.5px solid #B95B37' : '2.5px solid transparent',
                          marginBottom: -1, background: 'none', cursor: 'pointer', fontSize: 13,
                          fontWeight: expandSubTab === tab ? 700 : 500,
                          color: expandSubTab === tab ? '#1e1c1a' : '#999',
                          whiteSpace: 'nowrap',
                        }}>
                          {tab === 'indices' ? 'Índices' : tab === 'historico' ? 'Histórico' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                    {/* Content */}
                    <div style={{ padding: '20px 24px' }}>
                    {subLoading ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '13px' }}>Carregando…</div>
                    ) : (
                      <>
                        {/* DADOS */}
                        {expandSubTab === 'dados' && (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                              <div>
                                <div style={LABEL_STYLE}>Espécie / tipo</div>
                                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  value={String(dadosForm.species_type ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, species_type: e.target.value }))}>
                                  {Object.entries(SPECIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={LABEL_STYLE}>Imóvel</div>
                                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  value={String(dadosForm.property_id ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, property_id: e.target.value }))}>
                                  <option value="">Selecionar…</option>
                                  {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={LABEL_STYLE}>Qtd. total</div>
                                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  type="number" min="0"
                                  value={String(dadosForm.qtd_total ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, qtd_total: e.target.value }))} />
                              </div>
                              <div>
                                <div style={LABEL_STYLE}>Vacas</div>
                                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  type="number" min="0"
                                  value={String(dadosForm.qtd_vacas ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, qtd_vacas: e.target.value }))} />
                              </div>
                              <div>
                                <div style={LABEL_STYLE}>Touros</div>
                                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  type="number" min="0"
                                  value={String(dadosForm.qtd_touros ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, qtd_touros: e.target.value }))} />
                              </div>
                              <div>
                                <div style={LABEL_STYLE}>Novilhas</div>
                                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  type="number" min="0"
                                  value={String(dadosForm.qtd_novilhas ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, qtd_novilhas: e.target.value }))} />
                              </div>
                              <div>
                                <div style={LABEL_STYLE}>Bezerros</div>
                                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  type="number" min="0"
                                  value={String(dadosForm.qtd_bezerros ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, qtd_bezerros: e.target.value }))} />
                              </div>
                              <div>
                                <div style={LABEL_STYLE}>Código IBGE município</div>
                                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                  value={String(dadosForm.municipio_ibge_code ?? '')}
                                  onChange={e => setDadosForm(f => ({ ...f, municipio_ibge_code: e.target.value }))} />
                              </div>
                            </div>
                            <button onClick={() => handleSaveDados(prod.id)} disabled={subSaving} className="btn-primary" style={{ opacity: subSaving ? 0.7 : 1 }}>
                              {subSaving ? 'Salvando…' : 'Salvar Dados'}
                            </button>
                          </div>
                        )}

                        {/* ÍNDICES */}
                        {expandSubTab === 'indices' && <IndicesForm prod={prod} />}

                        {/* CUSTOS */}
                        {expandSubTab === 'custos' && (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                              {[
                                { key: 'custo_alimentacao', label: 'Alimentação' },
                                { key: 'custo_assist_veterinaria', label: 'Assistência veterinária' },
                                { key: 'custo_vacinas', label: 'Vacinas' },
                                { key: 'custo_mao_de_obra', label: 'Mão de obra' },
                                { key: 'custo_reproducao', label: 'Reprodução' },
                                { key: 'total_custeio', label: 'Total custeio' },
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
                            <button onClick={() => handleSaveCustos(prod.id)} disabled={subSaving} className="btn-primary" style={{ opacity: subSaving ? 0.7 : 1 }}>
                              {subSaving ? 'Salvando…' : 'Salvar Custos'}
                            </button>
                          </div>
                        )}

                        {/* RECEITAS */}
                        {expandSubTab === 'receitas' && (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                              {[
                                { key: 'receita_animais', label: 'Receita animais' },
                                { key: 'receita_produtos', label: 'Receita produtos (leite/ovos…)' },
                                { key: 'receita_total', label: 'Receita total' },
                                { key: 'receita_liquida_anual', label: 'Receita líquida anual' },
                              ].map(({ key, label }) => (
                                <div key={key}>
                                  <div style={LABEL_STYLE}>{label} (R$)</div>
                                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                    type="number" step="0.01" min="0"
                                    value={receitasForm[key as keyof typeof receitasForm] ?? ''}
                                    onChange={e => setReceitasForm(f => ({ ...f, [key]: e.target.value }))} />
                                </div>
                              ))}
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
                            {(lstkInputs[prod.id] ?? []).length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#878C91', textAlign: 'center', padding: '16px 0' }}>Nenhum insumo registrado.</p>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {['Categoria', 'Produto', 'Custo total', 'Data', ''].map(h => (
                                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(lstkInputs[prod.id] ?? []).map(ins => (
                                    <tr key={ins.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                      <td style={{ padding: '8px' }}><span style={{ background: '#FDF0EB', color: '#B95B37', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600 }}>{ins.categoria}</span></td>
                                      <td style={{ padding: '8px' }}>{ins.produto ?? '—'}</td>
                                      <td style={{ padding: '8px' }}>R$ {fmtBRL(ins.custo_total)}</td>
                                      <td style={{ padding: '8px' }}>{ins.data_aplicacao ? new Date(ins.data_aplicacao).toLocaleDateString('pt-BR') : '—'}</td>
                                      <td style={{ padding: '8px' }}>
                                        <button onClick={() => {
                                          setEditingInsumoId(ins.id)
                                          setInsumoForm({
                                            categoria: ins.categoria,
                                            produto: ins.produto ?? '',
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
                                        {['alimentacao', 'vacina', 'medicamento', 'suplemento', 'outros'].map(o => <option key={o} value={o}>{o}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <div style={LABEL_STYLE}>Produto</div>
                                      <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                        value={insumoForm.produto}
                                        onChange={e => setInsumoForm(f => ({ ...f, produto: e.target.value }))} />
                                    </div>
                                    <div>
                                      <div style={LABEL_STYLE}>Custo total (R$)</div>
                                      <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                        type="number" step="0.01"
                                        value={insumoForm.custo_total}
                                        onChange={e => setInsumoForm(f => ({ ...f, custo_total: e.target.value }))} />
                                    </div>
                                    <div>
                                      <div style={LABEL_STYLE}>Data de aplicação</div>
                                      <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                                        type="date"
                                        value={insumoForm.data_aplicacao}
                                        onChange={e => setInsumoForm(f => ({ ...f, data_aplicacao: e.target.value }))} />
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
            {editingProd ? 'Editar Atividade' : 'Nova Atividade Pecuária'}
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#878C91', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={LABEL_STYLE}>Espécie / tipo</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={prodForm.species_type} onChange={e => setProdForm(f => ({ ...f, species_type: e.target.value }))}>
              {Object.entries(SPECIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <div style={LABEL_STYLE}>Imóvel *</div>
            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              value={prodForm.property_id} onChange={e => setProdForm(f => ({ ...f, property_id: e.target.value }))}>
              <option value="">Selecionar…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <div style={LABEL_STYLE}>Qtd. total de animais</div>
            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
              type="number" min="0"
              value={prodForm.qtd_total} onChange={e => setProdForm(f => ({ ...f, qtd_total: e.target.value }))} />
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

export default ProdPecuariaSection
