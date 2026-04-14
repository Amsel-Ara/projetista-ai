'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordFieldSource, maskNIRF } from './types'

interface ImoveisSectionProps {
  clientId:             string
  organizationId:       string
  onPropertyCountChange?: (count: number) => void
}

type RuralProperty = {
  id: string
  nirf: string; nome: string; municipio: string; uf: string
  area_declarada_ha: string; condicao_produtor: string
  atividade_principal: string; caf_dap: string
  // 007 additions
  matricula: string; distrito_bairro: string; local_registro: string
  participacao_pct: string; cessao_terceiros: boolean
  situacao_imovel: string; estado_conservacao: string
  gravame: boolean; capacidade_uso_solo: string
  valor_por_hectare: string; valor_total_terra_nua: string
  outros_proprietarios: string
  // 008 additions
  latitude: string; longitude: string
  municipio_ibge_code: string; clima_zona: string
  car_numero: string; car_status: string
  car_area_ha: string; car_data_inscricao: string
  ccir: string; ccir_situacao: string; ccir_area_ha: string
}

type Talhao = {
  id: string; nome: string; tipo: string
  area_ha: number | null; solo_classe: string | null
  tipo_pastagem: string | null; irrigado: boolean
  tipo_irrigacao: string | null; observacoes: string | null
}

type PropertyImprovement = {
  id: string; tipo: string; area_m2: number | null
  valor_estimado: number | null; estado: string | null
  ano_construcao: number | null; ativo: boolean
  inativado_em: string | null; observacoes: string | null
}

type LandUseRow = {
  id: string; categoria: string; area_ha: number | null; ano: number
}

type SoilAnalysis = {
  id: string; data_coleta: string | null; laboratorio: string | null
  talhao_id: string | null; ph_agua: number | null; v_pct: number | null
  materia_organica: number | null
  // detail fields
  ph_cacl2: number | null; argila: number | null; areia: number | null; silte: number | null
  ca: number | null; mg: number | null; k: number | null; p: number | null; s: number | null
  al: number | null; h_al: number | null; ctc_efetiva: number | null; ctc_total: number | null
  m_pct: number | null; b: number | null; cu: number | null; fe: number | null
  mn: number | null; zn: number | null
  necessidade_calcario: number | null; gesso: number | null; prnt: number | null
}

type PropertyImagery = {
  id: string; tipo: string; descricao: string | null
  area_ha: number | null; file_path: string; created_at: string
}

const EMPTY_PROP: Omit<RuralProperty, 'id'> = {
  nirf: '', nome: '', municipio: '', uf: '', area_declarada_ha: '',
  condicao_produtor: '', atividade_principal: '', caf_dap: '',
  matricula: '', distrito_bairro: '', local_registro: '',
  participacao_pct: '', cessao_terceiros: false,
  situacao_imovel: '', estado_conservacao: '', gravame: false,
  capacidade_uso_solo: '', valor_por_hectare: '', valor_total_terra_nua: '',
  outros_proprietarios: '', latitude: '', longitude: '',
  municipio_ibge_code: '', clima_zona: '',
  car_numero: '', car_status: '', car_area_ha: '', car_data_inscricao: '',
  ccir: '', ccir_situacao: '', ccir_area_ha: '',
}

const LAND_USE_CATEGORIES = [
  'Lavoura temporária', 'Lavoura permanente', 'Pastagem formada',
  'Pastagem nativa', 'Capineira', 'Arrendada – pasto nativa',
  'Arrendada – lavoura', 'Silvicultura / SAF', 'Vegetação nativa',
  'Área de preservação permanente', 'Reserva legal', 'Área urbana',
  'Área inaproveitável', 'Outras',
]

type PropSubTab = 'dados' | 'talhoes' | 'benfeitorias' | 'uso_solo' | 'solo' | 'imagens'
type PropSheetTab = 'Dados' | 'Talhões' | 'Benfeitorias' | 'Uso do Solo' | 'Solo' | 'Imagens'

const CAR_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  'Ativo':      { bg: '#f0fdf4', text: '#16a34a' },
  'Em análise': { bg: '#eff6ff', text: '#2563eb' },
  'Pendente':   { bg: '#fffbeb', text: '#d97706' },
  'Suspenso':   { bg: '#fef2f2', text: '#dc2626' },
  'Cancelado':  { bg: '#f3f4f6', text: '#6b7280' },
}

export default function ImoveisSection({ clientId, organizationId, onPropertyCountChange }: ImoveisSectionProps) {
  const supabase = createClient()

  // Property list state
  const [properties,     setProperties]     = useState<RuralProperty[]>([])
  const [propsLoading,   setPropsLoading]   = useState(true)
  const [propFormOpen,   setPropFormOpen]   = useState(false)
  const [editPropId,     setEditPropId]     = useState<string | null>(null)
  const [propForm,       setPropForm]       = useState<Omit<RuralProperty, 'id'>>(EMPTY_PROP)
  const [propSaving,     setPropSaving]     = useState(false)
  const [propError,      setPropError]      = useState('')
  const [deletePropId,   setDeletePropId]   = useState<string | null>(null)
  const [deletingProp,   setDeletingProp]   = useState(false)

  // Bottom sheet state
  const [sheetPropId,      setSheetPropId]       = useState<string | null>(null)
  const [propSheetTab,     setPropSheetTab]      = useState<PropSheetTab>('Dados')

  // Sub-tab state
  const [selectedPropId,   setSelectedPropId]   = useState<string | null>(null)
  const [propSubTab,       setPropSubTab]        = useState<PropSubTab>('dados')
  const [talhoes,          setTalhoes]           = useState<Talhao[]>([])
  const [benfeitorias,     setBenfeitorias]      = useState<PropertyImprovement[]>([])
  const [landUse,          setLandUse]           = useState<LandUseRow[]>([])
  const [soilAnalyses,     setSoilAnalyses]      = useState<SoilAnalysis[]>([])
  const [imagery,          setImagery]           = useState<PropertyImagery[]>([])
  const [subDataLoading,   setSubDataLoading]    = useState(false)

  // Sub-tab edit state
  const [propDadosForm,    setPropDadosForm]     = useState<Omit<RuralProperty, 'id'>>(EMPTY_PROP)
  const [dadosSaving,      setDadosSaving]       = useState(false)
  const [dadosError,       setDadosError]        = useState('')
  const [dadosSaved,       setDadosSaved]        = useState(false)

  // Talhao add/edit
  const [talhaoFormOpen,   setTalhaoFormOpen]    = useState(false)
  const [editTalhaoId,     setEditTalhaoId]      = useState<string | null>(null)
  const [talhaoForm,       setTalhaoForm]        = useState({ nome: '', tipo: 'agricola', area_ha: '', solo_classe: '', tipo_pastagem: '', irrigado: false, tipo_irrigacao: '', observacoes: '' })
  const [talhaoSaving,     setTalhaoSaving]      = useState(false)

  // Benfeitoria add/edit
  const [benfeitDrawerOpen, setBenfeitDrawerOpen] = useState(false)
  const [editBenfeitId,     setEditBenfeitId]     = useState<string | null>(null)
  const [benfeitForm,       setBenfeitForm]       = useState({ tipo: '', area_m2: '', valor_estimado: '', estado: '', ano_construcao: '', observacoes: '' })
  const [benfeitSaving,     setBenfeitSaving]     = useState(false)

  // Land use
  const [landUseYear,    setLandUseYear]    = useState(new Date().getFullYear())
  const [landUseEdits,   setLandUseEdits]   = useState<Record<string, string>>({})
  const [landUseSaving,  setLandUseSaving]  = useState(false)

  // Soil detail drawer
  const [soilDetailId,  setSoilDetailId]   = useState<string | null>(null)
  const [soilFormOpen,  setSoilFormOpen]   = useState(false)
  const [soilForm,      setSoilForm]       = useState({ data_coleta: '', laboratorio: '', talhao_id: '', ph_agua: '', v_pct: '', materia_organica: '', observacoes: '' })
  const [soilSaving,    setSoilSaving]     = useState(false)

  // Image upload
  const [imgUploading,  setImgUploading]   = useState(false)
  const [imgTipo,       setImgTipo]        = useState('drone_rgb')

  // Load properties on mount
  useEffect(() => {
    if (!clientId) return
    setPropsLoading(true)
    supabase.from('rural_properties').select('*').eq('client_id', clientId).order('created_at')
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((p: Record<string, unknown>) => ({
            id:                  p.id as string,
            nirf:                (p.nirf as string)                ?? '',
            nome:                (p.nome as string)                ?? '',
            municipio:           (p.municipio as string)           ?? '',
            uf:                  (p.uf as string)                  ?? '',
            area_declarada_ha:   p.area_declarada_ha != null ? String(p.area_declarada_ha) : '',
            condicao_produtor:   (p.condicao_produtor as string)   ?? '',
            atividade_principal: (p.atividade_principal as string) ?? '',
            caf_dap:             (p.caf_dap as string)             ?? '',
            matricula:           (p.matricula as string)           ?? '',
            distrito_bairro:     (p.distrito_bairro as string)     ?? '',
            local_registro:      (p.local_registro as string)      ?? '',
            participacao_pct:    p.participacao_pct != null ? String(p.participacao_pct) : '',
            cessao_terceiros:    Boolean(p.cessao_terceiros),
            situacao_imovel:     (p.situacao_imovel as string)     ?? '',
            estado_conservacao:  (p.estado_conservacao as string)  ?? '',
            gravame:             Boolean(p.gravame),
            capacidade_uso_solo: (p.capacidade_uso_solo as string) ?? '',
            valor_por_hectare:   p.valor_por_hectare != null ? String(p.valor_por_hectare) : '',
            valor_total_terra_nua: p.valor_total_terra_nua != null ? String(p.valor_total_terra_nua) : '',
            outros_proprietarios: (p.outros_proprietarios as string) ?? '',
            latitude:            p.latitude != null ? String(p.latitude) : '',
            longitude:           p.longitude != null ? String(p.longitude) : '',
            municipio_ibge_code: (p.municipio_ibge_code as string) ?? '',
            clima_zona:          (p.clima_zona as string)          ?? '',
            car_numero:          (p.car_numero as string)          ?? '',
            car_status:          (p.car_status as string)          ?? '',
            car_area_ha:         p.car_area_ha != null ? String(p.car_area_ha) : '',
            car_data_inscricao:  (p.car_data_inscricao as string)  ?? '',
            ccir:                (p.ccir as string)                ?? '',
            ccir_situacao:       (p.ccir_situacao as string)       ?? '',
            ccir_area_ha:        p.ccir_area_ha != null ? String(p.ccir_area_ha) : '',
          }))
          setProperties(mapped)
          onPropertyCountChange?.(mapped.length)
        }
        setPropsLoading(false)
      })
  }, [clientId])

  // Sync sheet open/close → selectedPropId + reset tab
  useEffect(() => {
    setPropSheetTab('Dados')
    if (sheetPropId && sheetPropId !== '__new__') {
      setSelectedPropId(sheetPropId)
      setPropSubTab('dados')
    } else if (!sheetPropId) {
      setSelectedPropId(null)
    }
  }, [sheetPropId])

  // Load sub-data when property is selected
  useEffect(() => {
    if (!selectedPropId) return
    setSubDataLoading(true)
    // Prefill dadosForm with current property data
    const prop = properties.find(p => p.id === selectedPropId)
    if (prop) {
      const { id: _id, ...rest } = prop
      void _id
      setPropDadosForm(rest)
    }
    Promise.all([
      supabase.from('talhoes').select('*').eq('property_id', selectedPropId).order('nome'),
      supabase.from('property_improvements').select('*').eq('property_id', selectedPropId).order('tipo'),
      supabase.from('property_land_use').select('*').eq('property_id', selectedPropId).order('ano', { ascending: false }),
      supabase.from('soil_analyses').select('*').eq('property_id', selectedPropId).order('data_coleta', { ascending: false }),
      supabase.from('property_imagery').select('*').eq('property_id', selectedPropId).order('created_at', { ascending: false }),
    ]).then(([t, b, lu, sa, img]) => {
      setTalhoes((t.data ?? []) as Talhao[])
      setBenfeitorias((b.data ?? []) as PropertyImprovement[])
      setLandUse((lu.data ?? []) as LandUseRow[])
      setSoilAnalyses((sa.data ?? []) as SoilAnalysis[])
      setImagery((img.data ?? []) as PropertyImagery[])
      // Init land use edits for current year
      const currentYear = new Date().getFullYear()
      const rowsForYear = ((lu.data ?? []) as LandUseRow[]).filter(r => r.ano === currentYear)
      const edits: Record<string, string> = {}
      LAND_USE_CATEGORIES.forEach(cat => {
        const existing = rowsForYear.find(r => r.categoria === cat)
        edits[cat] = existing?.area_ha != null ? String(existing.area_ha) : ''
      })
      setLandUseEdits(edits)
      setSubDataLoading(false)
    })
  }, [selectedPropId])

  // Reload land use when year changes
  useEffect(() => {
    if (!selectedPropId) return
    supabase.from('property_land_use').select('*')
      .eq('property_id', selectedPropId).eq('ano', landUseYear)
      .then(({ data }) => {
        const rows = (data ?? []) as LandUseRow[]
        const edits: Record<string, string> = {}
        LAND_USE_CATEGORIES.forEach(cat => {
          const existing = rows.find(r => r.categoria === cat)
          edits[cat] = existing?.area_ha != null ? String(existing.area_ha) : ''
        })
        setLandUseEdits(edits)
      })
  }, [landUseYear, selectedPropId])

  async function handlePropSave() {
    setPropSaving(true); setPropError('')
    const payload = {
      organization_id:     organizationId,
      client_id:           clientId,
      nirf:                propForm.nirf || null,
      nome:                propForm.nome || null,
      condicao_produtor:   propForm.condicao_produtor || null,
      atividade_principal: propForm.atividade_principal || null,
      caf_dap:             propForm.caf_dap || null,
    }
    if (editPropId) {
      const { error } = await supabase.from('rural_properties').update(payload).eq('id', editPropId)
      if (error) { setPropError(error.message); setPropSaving(false); return }
      setProperties(prev => prev.map(p => p.id === editPropId ? { ...propForm, id: editPropId } : p))
    } else {
      const { data, error } = await supabase.from('rural_properties').insert(payload).select().single()
      if (error) { setPropError(error.message); setPropSaving(false); return }
      const newProps = [...properties, { ...propForm, id: (data as { id: string }).id }]
      setProperties(newProps)
      onPropertyCountChange?.(newProps.length)
    }
    setPropSaving(false); setPropFormOpen(false); setEditPropId(null); setPropForm(EMPTY_PROP)
  }

  async function handlePropDelete() {
    if (!deletePropId) return
    setDeletingProp(true)
    await supabase.from('rural_properties').delete().eq('id', deletePropId)
    const newProps = properties.filter(p => p.id !== deletePropId)
    setProperties(newProps)
    onPropertyCountChange?.(newProps.length)
    if (selectedPropId === deletePropId) setSelectedPropId(null)
    setDeletePropId(null); setDeletingProp(false)
  }

  async function handleDadosSave() {
    if (!selectedPropId) return
    setDadosSaving(true); setDadosError(''); setDadosSaved(false)
    const f = propDadosForm
    const { error } = await supabase.from('rural_properties').update({
      nirf:                f.nirf || null,
      nome:                f.nome || null,
      municipio:           f.municipio || null,
      uf:                  f.uf || null,
      area_declarada_ha:   f.area_declarada_ha ? parseFloat(f.area_declarada_ha) : null,
      matricula:           f.matricula || null,
      distrito_bairro:     f.distrito_bairro || null,
      local_registro:      f.local_registro || null,
      latitude:            f.latitude ? parseFloat(f.latitude) : null,
      longitude:           f.longitude ? parseFloat(f.longitude) : null,
      municipio_ibge_code: f.municipio_ibge_code || null,
      clima_zona:          f.clima_zona || null,
      car_numero:          f.car_numero || null,
      car_status:          f.car_status || null,
      car_area_ha:         f.car_area_ha ? parseFloat(f.car_area_ha) : null,
      car_data_inscricao:  f.car_data_inscricao || null,
      ccir:                f.ccir || null,
      ccir_situacao:       f.ccir_situacao || null,
      ccir_area_ha:        f.ccir_area_ha ? parseFloat(f.ccir_area_ha) : null,
      condicao_produtor:   f.condicao_produtor || null,
      atividade_principal: f.atividade_principal || null,
      participacao_pct:    f.participacao_pct ? parseFloat(f.participacao_pct) : null,
      cessao_terceiros:    f.cessao_terceiros,
      situacao_imovel:     f.situacao_imovel || null,
      estado_conservacao:  f.estado_conservacao || null,
      gravame:             f.gravame,
      capacidade_uso_solo: f.capacidade_uso_solo || null,
      valor_por_hectare:   f.valor_por_hectare ? parseFloat(f.valor_por_hectare) : null,
      valor_total_terra_nua: f.valor_total_terra_nua ? parseFloat(f.valor_total_terra_nua) : null,
      outros_proprietarios: f.outros_proprietarios || null,
      caf_dap:             f.caf_dap || null,
    }).eq('id', selectedPropId)

    if (error) { setDadosError(error.message); setDadosSaving(false); return }

    // Write provenance for key fields
    const keyFields: [keyof Omit<RuralProperty, 'id'>, string][] = [
      ['nome', 'nome'], ['matricula', 'matricula'], ['car_status', 'car_status'],
      ['car_numero', 'car_numero'], ['ccir', 'ccir'],
    ]
    await Promise.allSettled(keyFields.map(([fk, dbField]) =>
      recordFieldSource(supabase, { organizationId, clientId, tableName: 'rural_properties', recordId: selectedPropId, fieldName: dbField, value: f[fk], tipo: 'manual' })
    ))

    setProperties(prev => prev.map(p => p.id === selectedPropId ? { ...f, id: selectedPropId } : p))
    setDadosSaving(false); setDadosSaved(true)
    setTimeout(() => setDadosSaved(false), 3000)
  }

  async function handleTalhaoSave() {
    if (!selectedPropId) return
    setTalhaoSaving(true)
    const payload = {
      organization_id: organizationId,
      property_id:     selectedPropId,
      client_id:       clientId,
      nome:            talhaoForm.nome,
      tipo:            talhaoForm.tipo,
      area_ha:         talhaoForm.area_ha ? parseFloat(talhaoForm.area_ha) : null,
      solo_classe:     talhaoForm.solo_classe || null,
      tipo_pastagem:   talhaoForm.tipo_pastagem || null,
      irrigado:        talhaoForm.irrigado,
      tipo_irrigacao:  talhaoForm.tipo_irrigacao || null,
      observacoes:     talhaoForm.observacoes || null,
    }
    if (editTalhaoId) {
      const { data, error } = await supabase.from('talhoes').update(payload).eq('id', editTalhaoId).select().single()
      if (!error && data) setTalhoes(prev => prev.map(t => t.id === editTalhaoId ? data as Talhao : t))
    } else {
      const { data, error } = await supabase.from('talhoes').insert(payload).select().single()
      if (!error && data) setTalhoes(prev => [...prev, data as Talhao])
    }
    setTalhaoSaving(false)
    setTalhaoFormOpen(false); setEditTalhaoId(null)
    setTalhaoForm({ nome: '', tipo: 'agricola', area_ha: '', solo_classe: '', tipo_pastagem: '', irrigado: false, tipo_irrigacao: '', observacoes: '' })
  }

  async function handleBenfeitSave() {
    if (!selectedPropId) return
    setBenfeitSaving(true)
    const payload = {
      organization_id: organizationId,
      property_id:     selectedPropId,
      tipo:            benfeitForm.tipo,
      area_m2:         benfeitForm.area_m2 ? parseFloat(benfeitForm.area_m2) : null,
      valor_estimado:  benfeitForm.valor_estimado ? parseFloat(benfeitForm.valor_estimado) : null,
      estado:          benfeitForm.estado || null,
      ano_construcao:  benfeitForm.ano_construcao ? parseInt(benfeitForm.ano_construcao) : null,
      observacoes:     benfeitForm.observacoes || null,
      ativo:           true,
    }
    if (editBenfeitId) {
      const { data, error } = await supabase.from('property_improvements').update(payload).eq('id', editBenfeitId).select().single()
      if (!error && data) setBenfeitorias(prev => prev.map(b => b.id === editBenfeitId ? data as PropertyImprovement : b))
    } else {
      const { data, error } = await supabase.from('property_improvements').insert(payload).select().single()
      if (!error && data) setBenfeitorias(prev => [...prev, data as PropertyImprovement])
    }
    setBenfeitSaving(false); setBenfeitDrawerOpen(false); setEditBenfeitId(null)
    setBenfeitForm({ tipo: '', area_m2: '', valor_estimado: '', estado: '', ano_construcao: '', observacoes: '' })
  }

  async function handleInactivateBenfeit(id: string) {
    await supabase.from('property_improvements').update({ ativo: false, inativado_em: new Date().toISOString().slice(0, 10) }).eq('id', id)
    setBenfeitorias(prev => prev.map(b => b.id === id ? { ...b, ativo: false, inativado_em: new Date().toISOString().slice(0, 10) } : b))
  }

  async function handleLandUseSave() {
    if (!selectedPropId) return
    setLandUseSaving(true)
    const rows = LAND_USE_CATEGORIES
      .filter(cat => landUseEdits[cat] && parseFloat(landUseEdits[cat]) > 0)
      .map(cat => ({
        organization_id: organizationId,
        property_id:     selectedPropId,
        categoria:       cat,
        area_ha:         parseFloat(landUseEdits[cat]),
        ano:             landUseYear,
      }))

    for (const row of rows) {
      await supabase.from('property_land_use').upsert(row, { onConflict: 'property_id,categoria,ano' })
    }
    setLandUseSaving(false)
  }

  async function handleSoilSave() {
    if (!selectedPropId) return
    setSoilSaving(true)
    const payload = {
      organization_id: organizationId,
      property_id:     selectedPropId,
      data_coleta:     soilForm.data_coleta || null,
      laboratorio:     soilForm.laboratorio || null,
      talhao_id:       soilForm.talhao_id || null,
      ph_agua:         soilForm.ph_agua ? parseFloat(soilForm.ph_agua) : null,
      v_pct:           soilForm.v_pct ? parseFloat(soilForm.v_pct) : null,
      materia_organica: soilForm.materia_organica ? parseFloat(soilForm.materia_organica) : null,
    }
    const { data, error } = await supabase.from('soil_analyses').insert(payload).select().single()
    if (!error && data) setSoilAnalyses(prev => [data as SoilAnalysis, ...prev])
    setSoilSaving(false); setSoilFormOpen(false)
    setSoilForm({ data_coleta: '', laboratorio: '', talhao_id: '', ph_agua: '', v_pct: '', materia_organica: '', observacoes: '' })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedPropId || !e.target.files?.length) return
    setImgUploading(true)
    const file = e.target.files[0]
    const path = `property_imagery/${selectedPropId}/${Date.now()}_${file.name}`
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file)
    if (!uploadErr) {
      const { data } = await supabase.from('property_imagery').insert({
        organization_id: organizationId, property_id: selectedPropId,
        tipo: imgTipo, file_path: path, descricao: file.name,
      }).select().single()
      if (data) setImagery(prev => [data as PropertyImagery, ...prev])
    }
    setImgUploading(false)
    e.target.value = ''
  }

  const selectedProp = properties.find(p => p.id === selectedPropId)
  const sheetProp    = sheetPropId && sheetPropId !== '__new__' ? properties.find(p => p.id === sheetPropId) ?? null : null
  const soilDetail   = soilAnalyses.find(s => s.id === soilDetailId)
  const totalLandUse = LAND_USE_CATEGORIES.reduce((sum, cat) => sum + (parseFloat(landUseEdits[cat] || '0') || 0), 0)

  // Map PropSheetTab → PropSubTab
  const sheetTabToSubTab: Record<PropSheetTab, PropSubTab> = {
    'Dados': 'dados', 'Talhões': 'talhoes', 'Benfeitorias': 'benfeitorias',
    'Uso do Solo': 'uso_solo', 'Solo': 'solo', 'Imagens': 'imagens',
  }

  return (
    <div style={{ position: 'relative', minHeight: '200px' }}>

      {/* Property list */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>
            Imóveis Rurais
            {properties.length > 0 && (
              <span style={{ marginLeft: '8px', background: '#FDF0EB', color: '#B95B37', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                {properties.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { setPropForm(EMPTY_PROP); setEditPropId(null); setPropError(''); setSheetPropId('__new__') }}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            + Novo Imóvel
          </button>
        </div>

        {propsLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#878C91' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🌾</div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#010205', marginBottom: '4px' }}>Nenhum imóvel cadastrado</p>
            <p style={{ fontSize: '12px', lineHeight: 1.6 }}>Adicione os dados do imóvel rural do produtor.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {properties.map(p => (
              <div
                key={p.id}
                onClick={() => setSheetPropId(p.id)}
                style={{
                  background: 'white',
                  border: '1px solid #ebe9e5',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '2px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#B95B37'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(185,91,55,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#ebe9e5'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e1c1a', marginBottom: '3px' }}>{p.nome || '(sem nome)'}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    {[p.municipio, p.uf].filter(Boolean).join(' — ')}
                    {p.area_declarada_ha && ` · ${p.area_declarada_ha} ha`}
                    {p.atividade_principal && ` · ${p.atividade_principal}`}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {p.car_status && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: CAR_STATUS_COLOR[p.car_status]?.bg ?? '#f3f4f6', color: CAR_STATUS_COLOR[p.car_status]?.text ?? '#666' }}>
                        CAR: {p.car_status}
                      </span>
                    )}
                    {p.condicao_produtor && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#555' }}>
                        {p.condicao_produtor}
                      </span>
                    )}
                    {p.valor_total_terra_nua && (
                      <span style={{ fontSize: 11, color: '#888' }}>
                        R$ {parseFloat(p.valor_total_terra_nua).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ color: '#bbb', fontSize: '18px', flexShrink: 0 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet overlay */}
      {sheetPropId && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSheetPropId(null)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(30,28,26,0.4)',
              zIndex: 10,
              borderRadius: '10px',
            }}
          />
          {/* Sheet */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '93%',
            background: 'white',
            borderRadius: '18px 18px 0 0',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '8px', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d1d0ce' }} />
            </div>

            {/* Sheet header */}
            <div style={{ padding: '0 20px 16px', flexShrink: 0, borderBottom: '1px solid #ebe9e5' }}>
              {sheetPropId === '__new__' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: '17px', color: '#1e1c1a' }}>Novo Imóvel</div>
                  <button onClick={() => setSheetPropId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: '4px', lineHeight: 1 }}>×</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '17px', color: '#1e1c1a', marginBottom: 4 }}>
                      {sheetProp?.nome}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {sheetProp?.car_status && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: CAR_STATUS_COLOR[sheetProp.car_status]?.bg ?? '#f3f4f6', color: CAR_STATUS_COLOR[sheetProp.car_status]?.text ?? '#666' }}>
                          CAR: {sheetProp.car_status}
                        </span>
                      )}
                      {sheetProp?.condicao_produtor && (
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#555' }}>
                          {sheetProp.condicao_produtor}
                        </span>
                      )}
                      {sheetProp?.area_declarada_ha && (
                        <span style={{ fontSize: 11, color: '#888' }}>{sheetProp.area_declarada_ha} ha</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSheetPropId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: '4px', lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>

            {/* Tab bar inside sheet (only for existing properties) */}
            {sheetPropId !== '__new__' && (
              <div style={{ display: 'flex', borderBottom: '1px solid #ebe9e5', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' as const }}>
                {(['Dados', 'Talhões', 'Benfeitorias', 'Uso do Solo', 'Solo', 'Imagens'] as PropSheetTab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setPropSheetTab(t); setPropSubTab(sheetTabToSubTab[t]) }}
                    style={{
                      flexShrink: 0,
                      padding: '10px 18px',
                      border: 'none',
                      borderBottom: propSheetTab === t ? '2.5px solid #B95B37' : '2.5px solid transparent',
                      marginBottom: -1,
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: propSheetTab === t ? 700 : 500,
                      color: propSheetTab === t ? '#1e1c1a' : '#999',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f9f8f6' }}>
              {sheetPropId === '__new__' ? (
                /* New property form */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                    {([
                      { key: 'nirf', label: 'NIRF', placeholder: '0000000-0' },
                      { key: 'nome', label: 'Nome da propriedade', placeholder: 'Fazenda São João' },
                      { key: 'condicao_produtor', label: 'Condição do produtor', isSelect: true },
                      { key: 'atividade_principal', label: 'Atividade principal', isSelect: true },
                      { key: 'caf_dap', label: 'CAF / DAP', placeholder: 'Número CAF…' },
                    ] as { key: keyof typeof propForm; label: string; placeholder?: string; isSelect?: boolean }[]).map(({ key, label, placeholder, isSelect }) => (
                      <div key={key}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                        {isSelect ? (
                          <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propForm[key] as string} onChange={e => setPropForm(p => ({ ...p, [key]: e.target.value }))}>
                            <option value="">Selecionar…</option>
                            {key === 'condicao_produtor'
                              ? ['Proprietário', 'Arrendatário', 'Posseiro', 'Parceiro / Meeiro', 'Comodatário'].map(o => <option key={o} value={o}>{o}</option>)
                              : ['Agricultura — lavoura temporária', 'Agricultura — lavoura permanente', 'Pecuária bovina', 'Suinocultura', 'Avicultura', 'Aquicultura', 'Silvicultura / SAF'].map(o => <option key={o} value={o}>{o}</option>)
                            }
                          </select>
                        ) : (
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propForm[key] as string}
                            onChange={e => setPropForm(p => ({ ...p, [key]: key === 'nirf' ? maskNIRF(e.target.value) : e.target.value }))}
                            placeholder={placeholder} />
                        )}
                      </div>
                    ))}
                  </div>
                  {propError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>{propError}</div>}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={async () => { await handlePropSave(); setSheetPropId(null) }} disabled={propSaving} className="btn-primary" style={{ opacity: propSaving ? 0.7 : 1 }}>
                      {propSaving ? 'Salvando…' : 'Adicionar imóvel'}
                    </button>
                    <button onClick={() => { setSheetPropId(null); setPropForm(EMPTY_PROP) }}
                      style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#010205' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : subDataLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
              ) : (
              <>
                {/* ── Dados ── */}
                {propSubTab === 'dados' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Group 1 — Identificação */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Identificação</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {([
                          { key: 'nirf', label: 'NIRF', placeholder: '0000000-0' },
                          { key: 'nome', label: 'Nome', placeholder: 'Fazenda São João' },
                          { key: 'matricula', label: 'Matrícula', placeholder: 'Nº matrícula cartório' },
                          { key: 'local_registro', label: 'Cartório de Registro', placeholder: '—' },
                          { key: 'distrito_bairro', label: 'Distrito / Bairro', placeholder: '—' },
                          { key: 'municipio_ibge_code', label: 'Código IBGE', placeholder: '—' },
                        ] as { key: keyof Omit<RuralProperty,'id'>; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                              value={propDadosForm[key] as string}
                              onChange={e => setPropDadosForm(p => ({ ...p, [key]: key === 'nirf' ? maskNIRF(e.target.value) : e.target.value }))}
                              placeholder={placeholder} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Group 2 — Área e localização */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Área e Localização</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {([
                          { key: 'area_declarada_ha', label: 'Área declarada (ha)', placeholder: '—' },
                          { key: 'capacidade_uso_solo', label: 'Classe de uso do solo', placeholder: 'I – VIII' },
                          { key: 'latitude', label: 'Latitude (decimal)', placeholder: '-18.5000' },
                          { key: 'longitude', label: 'Longitude (decimal)', placeholder: '-47.9000' },
                          { key: 'clima_zona', label: 'Zona climática', placeholder: 'Aw, Cwa…' },
                        ] as { key: keyof Omit<RuralProperty,'id'>; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                              value={propDadosForm[key] as string}
                              onChange={e => setPropDadosForm(p => ({ ...p, [key]: e.target.value }))}
                              placeholder={placeholder} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Group 3 — CAR */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>CAR — Cadastro Ambiental Rural</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Número CAR</div>
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.car_numero}
                            onChange={e => setPropDadosForm(p => ({ ...p, car_numero: e.target.value }))}
                            placeholder="SP-XXXXXXX-XXXX…" />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Status CAR</div>
                          <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.car_status}
                            onChange={e => setPropDadosForm(p => ({ ...p, car_status: e.target.value }))}>
                            <option value="">Selecionar…</option>
                            {['Ativo', 'Em análise', 'Pendente', 'Suspenso', 'Cancelado'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Área CAR (ha)</div>
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.car_area_ha}
                            onChange={e => setPropDadosForm(p => ({ ...p, car_area_ha: e.target.value }))}
                            placeholder="—" type="number" step="0.01" />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Data de inscrição</div>
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.car_data_inscricao}
                            onChange={e => setPropDadosForm(p => ({ ...p, car_data_inscricao: e.target.value }))}
                            type="date" />
                        </div>
                      </div>
                    </div>

                    {/* Group 4 — CCIR */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>CCIR — Certificado de Cadastro de Imóvel Rural</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {([
                          { key: 'ccir', label: 'Código SNCR', placeholder: 'Código SNCR…' },
                          { key: 'ccir_situacao', label: 'Situação CCIR', placeholder: '—' },
                          { key: 'ccir_area_ha', label: 'Área SNCR (ha)', placeholder: '—' },
                        ] as { key: keyof Omit<RuralProperty,'id'>; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                              value={propDadosForm[key] as string}
                              onChange={e => setPropDadosForm(p => ({ ...p, [key]: e.target.value }))}
                              placeholder={placeholder} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Group 5 — Situação fundiária */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Situação Fundiária</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Condição do produtor</div>
                          <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.condicao_produtor}
                            onChange={e => setPropDadosForm(p => ({ ...p, condicao_produtor: e.target.value }))}>
                            <option value="">Selecionar…</option>
                            {['Proprietário', 'Arrendatário', 'Posseiro', 'Parceiro / Meeiro', 'Comodatário'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Atividade principal</div>
                          <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.atividade_principal}
                            onChange={e => setPropDadosForm(p => ({ ...p, atividade_principal: e.target.value }))}>
                            <option value="">Selecionar…</option>
                            {['Agricultura — lavoura temporária', 'Agricultura — lavoura permanente', 'Pecuária bovina', 'Suinocultura', 'Avicultura', 'Aquicultura', 'Silvicultura / SAF'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Participação (%)</div>
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.participacao_pct}
                            onChange={e => setPropDadosForm(p => ({ ...p, participacao_pct: e.target.value }))}
                            placeholder="100" type="number" step="0.01" min="0" max="100" />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Situação do imóvel</div>
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.situacao_imovel}
                            onChange={e => setPropDadosForm(p => ({ ...p, situacao_imovel: e.target.value }))}
                            placeholder="Ativo, Arrendado, Hipotecado…" />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Estado de conservação</div>
                          <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.estado_conservacao}
                            onChange={e => setPropDadosForm(p => ({ ...p, estado_conservacao: e.target.value }))}>
                            <option value="">Selecionar…</option>
                            {['Bom', 'Regular', 'Ruim'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', paddingTop: '22px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                            <input type="checkbox" checked={propDadosForm.gravame} onChange={e => setPropDadosForm(p => ({ ...p, gravame: e.target.checked }))} />
                            Gravame
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                            <input type="checkbox" checked={propDadosForm.cessao_terceiros} onChange={e => setPropDadosForm(p => ({ ...p, cessao_terceiros: e.target.checked }))} />
                            Cessão a terceiros
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Group 6 — Valoração */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Valoração</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {([
                          { key: 'valor_por_hectare', label: 'Valor por hectare (R$)', placeholder: '—' },
                          { key: 'valor_total_terra_nua', label: 'Valor total terra nua (R$)', placeholder: '—' },
                        ] as { key: keyof Omit<RuralProperty,'id'>; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                              value={propDadosForm[key] as string}
                              onChange={e => setPropDadosForm(p => ({ ...p, [key]: e.target.value }))}
                              placeholder={placeholder} type="number" step="0.01" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Group 7 — Outros */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Outros</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Outros proprietários</div>
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.outros_proprietarios}
                            onChange={e => setPropDadosForm(p => ({ ...p, outros_proprietarios: e.target.value }))}
                            placeholder="Nomes dos coproprietários…" />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>CAF / DAP</div>
                          <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                            value={propDadosForm.caf_dap}
                            onChange={e => setPropDadosForm(p => ({ ...p, caf_dap: e.target.value }))}
                            placeholder="Número CAF / DAP…" />
                        </div>
                      </div>
                    </div>

                    {dadosError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>{dadosError}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button onClick={handleDadosSave} disabled={dadosSaving} className="btn-primary" style={{ opacity: dadosSaving ? 0.7 : 1 }}>
                        {dadosSaving ? 'Salvando…' : 'Salvar dados'}
                      </button>
                      {dadosSaved && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✓ Salvo</span>}
                    </div>
                  </div>
                )}

                {/* ── Talhões ── */}
                {propSubTab === 'talhoes' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Talhões</div>
                      <button onClick={() => { setTalhaoFormOpen(true); setEditTalhaoId(null); setTalhaoForm({ nome: '', tipo: 'agricola', area_ha: '', solo_classe: '', tipo_pastagem: '', irrigado: false, tipo_irrigacao: '', observacoes: '' }) }}
                        style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        + Novo Talhão
                      </button>
                    </div>
                    {talhoes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#878C91', fontSize: '13px' }}>Nenhum talhão cadastrado.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Nome', 'Tipo', 'Área (ha)', 'Solo / Pastagem', 'Irrigado', 'Ações'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {talhoes.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                              <td style={{ padding: '10px', fontWeight: 600 }}>{t.nome}</td>
                              <td style={{ padding: '10px', color: '#878C91' }}>{t.tipo}</td>
                              <td style={{ padding: '10px' }}>{t.area_ha ?? '—'}</td>
                              <td style={{ padding: '10px', color: '#878C91' }}>{t.solo_classe || t.tipo_pastagem || '—'}</td>
                              <td style={{ padding: '10px' }}>{t.irrigado ? 'Sim' : 'Não'}</td>
                              <td style={{ padding: '10px' }}>
                                <button onClick={() => { setEditTalhaoId(t.id); setTalhaoForm({ nome: t.nome, tipo: t.tipo, area_ha: t.area_ha?.toString() ?? '', solo_classe: t.solo_classe ?? '', tipo_pastagem: t.tipo_pastagem ?? '', irrigado: t.irrigado, tipo_irrigacao: t.tipo_irrigacao ?? '', observacoes: t.observacoes ?? '' }); setTalhaoFormOpen(true) }}
                                  style={{ marginRight: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#B95B37', fontWeight: 700, fontSize: '12px' }}>Editar</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {talhaoFormOpen && (
                      <div style={{ marginTop: '16px', background: 'var(--color-surface)', borderRadius: '10px', padding: '16px', border: '1.5px solid #B95B37' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#010205', marginBottom: '12px' }}>{editTalhaoId ? 'Editar Talhão' : 'Novo Talhão'}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Nome</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={talhaoForm.nome} onChange={e => setTalhaoForm(f => ({ ...f, nome: e.target.value }))} placeholder="Talhão A" />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Tipo</div>
                            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={talhaoForm.tipo} onChange={e => setTalhaoForm(f => ({ ...f, tipo: e.target.value }))}>
                              {['agricola', 'pastagem', 'misto', 'instalacao'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Área (ha)</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.01" value={talhaoForm.area_ha} onChange={e => setTalhaoForm(f => ({ ...f, area_ha: e.target.value }))} placeholder="50" />
                          </div>
                          {(talhaoForm.tipo === 'agricola' || talhaoForm.tipo === 'misto') && (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Classe de solo</div>
                              <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={talhaoForm.solo_classe} onChange={e => setTalhaoForm(f => ({ ...f, solo_classe: e.target.value }))} placeholder="Argilosa Ia" />
                            </div>
                          )}
                          {(talhaoForm.tipo === 'pastagem' || talhaoForm.tipo === 'misto') && (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Tipo de pastagem</div>
                              <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={talhaoForm.tipo_pastagem} onChange={e => setTalhaoForm(f => ({ ...f, tipo_pastagem: e.target.value }))} placeholder="Brachiaria" />
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                              <input type="checkbox" checked={talhaoForm.irrigado} onChange={e => setTalhaoForm(f => ({ ...f, irrigado: e.target.checked }))} />
                              Irrigado
                            </label>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={handleTalhaoSave} disabled={talhaoSaving} className="btn-primary" style={{ opacity: talhaoSaving ? 0.7 : 1, fontSize: '12px', padding: '8px 16px' }}>
                            {talhaoSaving ? 'Salvando…' : 'Salvar'}
                          </button>
                          <button onClick={() => setTalhaoFormOpen(false)} style={{ padding: '8px 14px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Benfeitorias ── */}
                {propSubTab === 'benfeitorias' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Benfeitorias</div>
                      <button onClick={() => { setBenfeitDrawerOpen(true); setEditBenfeitId(null); setBenfeitForm({ tipo: '', area_m2: '', valor_estimado: '', estado: '', ano_construcao: '', observacoes: '' }) }}
                        style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        + Nova Benfeitoria
                      </button>
                    </div>
                    {benfeitorias.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#878C91', fontSize: '13px' }}>Nenhuma benfeitoria cadastrada.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Tipo', 'Área (m²)', 'Valor est.', 'Estado', 'Ano', 'Status', 'Ações'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {benfeitorias.map(b => (
                            <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', opacity: b.ativo ? 1 : 0.5 }}>
                              <td style={{ padding: '10px', fontWeight: 600 }}>{b.tipo}</td>
                              <td style={{ padding: '10px', color: '#878C91' }}>{b.area_m2 ?? '—'}</td>
                              <td style={{ padding: '10px' }}>{b.valor_estimado ? `R$ ${b.valor_estimado.toLocaleString('pt-BR')}` : '—'}</td>
                              <td style={{ padding: '10px', color: '#878C91' }}>{b.estado ?? '—'}</td>
                              <td style={{ padding: '10px', color: '#878C91' }}>{b.ano_construcao ?? '—'}</td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ background: b.ativo ? '#f0fdf4' : '#f3f4f6', color: b.ativo ? '#16a34a' : '#878C91', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                                  {b.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td style={{ padding: '10px' }}>
                                <button onClick={() => { setEditBenfeitId(b.id); setBenfeitForm({ tipo: b.tipo, area_m2: b.area_m2?.toString() ?? '', valor_estimado: b.valor_estimado?.toString() ?? '', estado: b.estado ?? '', ano_construcao: b.ano_construcao?.toString() ?? '', observacoes: b.observacoes ?? '' }); setBenfeitDrawerOpen(true) }}
                                  style={{ marginRight: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#B95B37', fontWeight: 700, fontSize: '12px' }}>Editar</button>
                                {b.ativo && (
                                  <button onClick={() => handleInactivateBenfeit(b.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>Inativar</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ── Uso do Solo ── */}
                {propSubTab === 'uso_solo' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Uso do Solo</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select className="input-field" style={{ boxSizing: 'border-box' }} value={landUseYear} onChange={e => setLandUseYear(parseInt(e.target.value))}>
                          {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', width: '140px' }}>Área (ha)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {LAND_USE_CATEGORIES.map(cat => (
                          <tr key={cat} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                            <td style={{ padding: '8px 10px', color: '#010205' }}>{cat}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                type="number" step="0.01" min="0"
                                className="input-field"
                                style={{ width: '100%', boxSizing: 'border-box', textAlign: 'right', padding: '6px 8px' }}
                                value={landUseEdits[cat] ?? ''}
                                onChange={e => setLandUseEdits(p => ({ ...p, [cat]: e.target.value }))}
                                placeholder="—" />
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ padding: '10px', fontWeight: 700 }}>Total declarado</td>
                          <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>{totalLandUse.toFixed(2)} ha</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ marginTop: '16px' }}>
                      <button onClick={handleLandUseSave} disabled={landUseSaving} className="btn-primary" style={{ opacity: landUseSaving ? 0.7 : 1 }}>
                        {landUseSaving ? 'Salvando…' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Solo ── */}
                {propSubTab === 'solo' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Análises de Solo</div>
                      <button onClick={() => { setSoilFormOpen(true); setSoilForm({ data_coleta: '', laboratorio: '', talhao_id: '', ph_agua: '', v_pct: '', materia_organica: '', observacoes: '' }) }}
                        style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        + Nova Análise
                      </button>
                    </div>
                    {soilAnalyses.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#878C91', fontSize: '13px' }}>Nenhuma análise cadastrada.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Data', 'Laboratório', 'Talhão', 'pH', 'V%', 'MO', 'Ações'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {soilAnalyses.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer' }} onClick={() => setSoilDetailId(s.id === soilDetailId ? null : s.id)}>
                              <td style={{ padding: '10px', fontWeight: 600 }}>{s.data_coleta ? new Date(s.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}</td>
                              <td style={{ padding: '10px', color: '#878C91' }}>{s.laboratorio ?? '—'}</td>
                              <td style={{ padding: '10px', color: '#878C91' }}>{talhoes.find(t => t.id === s.talhao_id)?.nome ?? (s.talhao_id ? '—' : 'Propriedade')}</td>
                              <td style={{ padding: '10px' }}>{s.ph_agua ?? '—'}</td>
                              <td style={{ padding: '10px' }}>{s.v_pct != null ? `${s.v_pct}%` : '—'}</td>
                              <td style={{ padding: '10px' }}>{s.materia_organica != null ? `${s.materia_organica}%` : '—'}</td>
                              <td style={{ padding: '10px', color: '#B95B37', fontWeight: 700, fontSize: '12px' }}>Ver</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Soil detail */}
                    {soilDetail && (
                      <div style={{ marginTop: '16px', background: 'var(--color-surface)', borderRadius: '10px', padding: '16px', border: '1.5px solid var(--color-border)' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#010205', marginBottom: '12px' }}>
                          Detalhes — {soilDetail.data_coleta ? new Date(soilDetail.data_coleta + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} · {soilDetail.laboratorio ?? ''}
                        </div>
                        {[
                          { label: 'pH e Física', fields: [['pH água', soilDetail.ph_agua], ['pH CaCl₂', soilDetail.ph_cacl2], ['Argila (%)', soilDetail.argila], ['Areia (%)', soilDetail.areia], ['Silte (%)', soilDetail.silte]] },
                          { label: 'Macronutrientes', fields: [['Ca (cmolc/dm³)', soilDetail.ca], ['Mg (cmolc/dm³)', soilDetail.mg], ['K (cmolc/dm³)', soilDetail.k], ['P (mg/dm³)', soilDetail.p], ['S (mg/dm³)', soilDetail.s]] },
                          { label: 'Acidez e CTC', fields: [['Al (cmolc/dm³)', soilDetail.al], ['H+Al (cmolc/dm³)', soilDetail.h_al], ['CTC efetiva', soilDetail.ctc_efetiva], ['CTC total', soilDetail.ctc_total], ['V%', soilDetail.v_pct], ['m%', soilDetail.m_pct]] },
                          { label: 'Micronutrientes', fields: [['B (mg/dm³)', soilDetail.b], ['Cu (mg/dm³)', soilDetail.cu], ['Fe (mg/dm³)', soilDetail.fe], ['Mn (mg/dm³)', soilDetail.mn], ['Zn (mg/dm³)', soilDetail.zn]] },
                          { label: 'Recomendações', fields: [['Necessidade calcário (t/ha)', soilDetail.necessidade_calcario], ['Gesso (t/ha)', soilDetail.gesso], ['PRNT (%)', soilDetail.prnt]] },
                        ].map(group => (
                          <div key={group.label} style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{group.label}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                              {group.fields.map(([label, value]) => (
                                <div key={label as string} style={{ fontSize: '12px' }}>
                                  <span style={{ color: '#878C91' }}>{label}: </span>
                                  <span style={{ fontWeight: 600 }}>{value != null ? String(value) : '—'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add soil form */}
                    {soilFormOpen && (
                      <div style={{ marginTop: '16px', background: 'var(--color-surface)', borderRadius: '10px', padding: '16px', border: '1.5px solid #B95B37' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#010205', marginBottom: '12px' }}>Nova Análise de Solo</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Data da coleta</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="date" value={soilForm.data_coleta} onChange={e => setSoilForm(f => ({ ...f, data_coleta: e.target.value }))} />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Laboratório</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={soilForm.laboratorio} onChange={e => setSoilForm(f => ({ ...f, laboratorio: e.target.value }))} placeholder="Incamp, Embrapa…" />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Talhão</div>
                            <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={soilForm.talhao_id} onChange={e => setSoilForm(f => ({ ...f, talhao_id: e.target.value }))}>
                              <option value="">Propriedade geral</option>
                              {talhoes.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>pH água</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.1" value={soilForm.ph_agua} onChange={e => setSoilForm(f => ({ ...f, ph_agua: e.target.value }))} placeholder="5.2" />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>V%</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.1" value={soilForm.v_pct} onChange={e => setSoilForm(f => ({ ...f, v_pct: e.target.value }))} placeholder="48" />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Matéria orgânica (%)</div>
                            <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.1" value={soilForm.materia_organica} onChange={e => setSoilForm(f => ({ ...f, materia_organica: e.target.value }))} placeholder="2.1" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={handleSoilSave} disabled={soilSaving} className="btn-primary" style={{ opacity: soilSaving ? 0.7 : 1, fontSize: '12px', padding: '8px 16px' }}>
                            {soilSaving ? 'Salvando…' : 'Adicionar'}
                          </button>
                          <button onClick={() => setSoilFormOpen(false)} style={{ padding: '8px 14px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Imagens ── */}
                {propSubTab === 'imagens' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Imagens e Mapas</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select className="input-field" style={{ boxSizing: 'border-box' }} value={imgTipo} onChange={e => setImgTipo(e.target.value)}>
                          {['drone_rgb', 'drone_ndvi', 'satelite', 'shapefile', 'foto', 'outro'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <label style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                          {imgUploading ? 'Enviando…' : '+ Enviar Arquivo'}
                          <input type="file" style={{ display: 'none' }} accept="image/*,.pdf,.zip,.kml,.kmz" onChange={handleImageUpload} disabled={imgUploading} />
                        </label>
                      </div>
                    </div>
                    {imagery.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#878C91', fontSize: '13px', border: '2px dashed var(--color-border)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
                        <p style={{ fontWeight: 600, color: '#010205', marginBottom: '4px' }}>Nenhuma imagem cadastrada</p>
                        <p style={{ fontSize: '12px' }}>Faça upload de imagens de drone, satélite ou shapefiles dos talhões.</p>
                        {imgTipo === 'shapefile' && <p style={{ fontSize: '11px', color: '#d97706', marginTop: '8px' }}>Nota: geometria dos talhões será extraída após processamento.</p>}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {imagery.map(img => (
                          <div key={img.id} style={{ border: '1.5px solid var(--color-border)', borderRadius: '10px', padding: '14px', background: '#fafafa' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>
                              {img.tipo === 'drone_rgb' ? '📡' : img.tipo === 'satelite' ? '🛰' : img.tipo === 'shapefile' ? '📐' : '📷'}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#010205', textAlign: 'center', marginBottom: '4px' }}>{img.tipo}</div>
                            <div style={{ fontSize: '11px', color: '#878C91', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.descricao ?? img.file_path.split('/').pop()}</div>
                            {img.area_ha && <div style={{ fontSize: '11px', color: '#878C91', textAlign: 'center', marginTop: '2px' }}>{img.area_ha} ha</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Benfeitoria drawer */}
      {benfeitDrawerOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 200 }} onClick={() => setBenfeitDrawerOpen(false)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 48px rgba(0,0,0,0.16)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#010205', fontFamily: 'Manrope, sans-serif' }}>{editBenfeitId ? 'Editar Benfeitoria' : 'Nova Benfeitoria'}</div>
              <button onClick={() => setBenfeitDrawerOpen(false)} style={{ border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#878C91', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'tipo', label: 'Tipo', placeholder: 'Galpão de grãos, Curral, Silo…' },
                { key: 'area_m2', label: 'Área (m²)', placeholder: '800' },
                { key: 'valor_estimado', label: 'Valor estimado (R$)', placeholder: '120.000' },
                { key: 'ano_construcao', label: 'Ano de construção', placeholder: '2019' },
                { key: 'observacoes', label: 'Observações', placeholder: '…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }}
                    value={benfeitForm[key as keyof typeof benfeitForm]}
                    onChange={e => setBenfeitForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Estado</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={benfeitForm.estado} onChange={e => setBenfeitForm(f => ({ ...f, estado: e.target.value }))}>
                  <option value="">Selecionar…</option>
                  {['Novo', 'Bom', 'Regular', 'Ruim'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setBenfeitDrawerOpen(false)} style={{ padding: '9px 18px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleBenfeitSave} disabled={benfeitSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: benfeitSaving ? '#d4956f' : '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: benfeitSaving ? 'not-allowed' : 'pointer' }}>
                {benfeitSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete property confirm */}
      {deletePropId && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 300 }} onClick={() => setDeletePropId(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: '14px', padding: '28px', width: '360px', zIndex: 301, boxShadow: '0 8px 48px rgba(0,0,0,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#010205', marginBottom: '8px' }}>Excluir imóvel?</div>
            <p style={{ fontSize: '13px', color: '#878C91', marginBottom: '24px', lineHeight: 1.6 }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeletePropId(null)} style={{ padding: '9px 20px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handlePropDelete} disabled={deletingProp} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: deletingProp ? '#f87171' : '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: deletingProp ? 'not-allowed' : 'pointer' }}>
                {deletingProp ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
