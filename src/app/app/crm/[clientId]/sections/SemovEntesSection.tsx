'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordFieldSource } from './types'

interface SemovEntesSectionProps {
  clientId:       string
  organizationId: string
}

type Semovente = {
  id: string
  especie_tipo: string; raca: string | null; finalidade: string | null
  sexo: 'M' | 'F' | null; quantidade: number
  valor_unitario: number | null; valor_total: number | null
  gravame: boolean; seguro: boolean
  ano_referencia: number; property_id: string | null
  observacoes: string | null
  rural_properties?: { nome: string } | null
}

type RuralProperty = { id: string; nome: string }

const ESPECIES_SUGESTOES = ['VACA', 'BOI', 'NOVILHA', 'BEZERRO', 'BEZERRA', 'TOURO', 'MATRONA', 'CAVALO']

const EMPTY_FORM = {
  especie_tipo: '', raca: '', finalidade: '', sexo: '' as '' | 'M' | 'F',
  quantidade: '', valor_unitario: '', gravame: false, seguro: false,
  property_id: '', ano_referencia: String(new Date().getFullYear()), observacoes: '',
}

export default function SemovEntesSection({ clientId, organizationId }: SemovEntesSectionProps) {
  const supabase = createClient()

  const [semoventes,   setSemoventes]   = useState<Semovente[]>([])
  const [properties,   setProperties]   = useState<RuralProperty[]>([])
  const [loading,      setLoading]      = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [propFilter,   setPropFilter]   = useState('')
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => {
    supabase.from('rural_properties').select('id, nome').eq('client_id', clientId)
      .then(({ data }) => setProperties((data ?? []) as RuralProperty[]))
  }, [clientId])

  useEffect(() => {
    setLoading(true)
    supabase.from('semoventes')
      .select('*, rural_properties(nome)')
      .eq('client_id', clientId)
      .eq('ano_referencia', selectedYear)
      .order('especie_tipo')
      .then(({ data }) => {
        setSemoventes((data ?? []) as Semovente[])
        setLoading(false)
      })
  }, [clientId, selectedYear])

  const displayed = propFilter
    ? semoventes.filter(s => s.property_id === propFilter)
    : semoventes

  const totalValue = displayed.reduce((sum, s) => sum + (s.valor_total ?? 0), 0)

  function openNew() {
    setForm({ ...EMPTY_FORM, ano_referencia: String(selectedYear) })
    setEditingId(null)
    setDrawerOpen(true)
  }

  function openEdit(s: Semovente) {
    setForm({
      especie_tipo: s.especie_tipo, raca: s.raca ?? '', finalidade: s.finalidade ?? '',
      sexo: s.sexo ?? '', quantidade: String(s.quantidade),
      valor_unitario: s.valor_unitario?.toString() ?? '',
      gravame: s.gravame, seguro: s.seguro,
      property_id: s.property_id ?? '',
      ano_referencia: String(s.ano_referencia), observacoes: s.observacoes ?? '',
    })
    setEditingId(s.id)
    setDrawerOpen(true)
  }

  const qty    = parseInt(form.quantidade) || 0
  const unit   = parseFloat(form.valor_unitario) || 0
  const total  = qty * unit

  async function handleSave() {
    setSaving(true)
    const payload = {
      organization_id: organizationId,
      client_id:       clientId,
      especie_tipo:    form.especie_tipo,
      raca:            form.raca || null,
      finalidade:      form.finalidade || null,
      sexo:            form.sexo || null,
      quantidade:      qty,
      valor_unitario:  unit || null,
      valor_total:     total || null,
      gravame:         form.gravame,
      seguro:          form.seguro,
      property_id:     form.property_id || null,
      ano_referencia:  parseInt(form.ano_referencia),
      observacoes:     form.observacoes || null,
    }
    if (editingId) {
      const { data, error } = await supabase.from('semoventes').update(payload).eq('id', editingId).select('*, rural_properties(nome)').single()
      if (!error && data) {
        setSemoventes(prev => prev.map(s => s.id === editingId ? data as Semovente : s))
        await recordFieldSource(supabase, { organizationId, clientId, tableName: 'semoventes', recordId: editingId, fieldName: 'especie_tipo', value: form.especie_tipo, tipo: 'manual' })
      }
    } else {
      const { data, error } = await supabase.from('semoventes').insert(payload).select('*, rural_properties(nome)').single()
      if (!error && data) setSemoventes(prev => [...prev, data as Semovente])
    }
    setSaving(false); setDrawerOpen(false); setEditingId(null)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('semoventes').delete().eq('id', deleteId)
    setSemoventes(prev => prev.filter(s => s.id !== deleteId))
    setDeleteId(null); setDeleting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Semoventes</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select className="input-field" style={{ boxSizing: 'border-box' }} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="input-field" style={{ boxSizing: 'border-box' }} value={propFilter} onChange={e => setPropFilter(e.target.value)}>
              <option value="">Todos os imóveis</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <button onClick={openNew}
              style={{ padding: '9px 16px', border: 'none', borderRadius: '8px', background: '#B95B37', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Novo Semovente
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#878C91' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🐄</div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#010205', marginBottom: '4px' }}>Nenhum semovente cadastrado</p>
            <p style={{ fontSize: '12px' }}>Adicione o rebanho e outros animais do produtor.</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Espécie/Tipo', 'Raça', 'Finalidade', 'Sexo', 'Qtd', 'Valor Unit.', 'Total', 'Gravame', 'Ações'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{s.especie_tipo}</td>
                    <td style={{ padding: '10px', color: '#878C91' }}>{s.raca ?? '—'}</td>
                    <td style={{ padding: '10px', color: '#878C91' }}>{s.finalidade ?? '—'}</td>
                    <td style={{ padding: '10px', color: '#878C91' }}>{s.sexo ?? '—'}</td>
                    <td style={{ padding: '10px' }}>{s.quantidade}</td>
                    <td style={{ padding: '10px' }}>{s.valor_unitario != null ? `R$ ${s.valor_unitario.toLocaleString('pt-BR')}` : '—'}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{s.valor_total != null ? `R$ ${s.valor_total.toLocaleString('pt-BR')}` : '—'}</td>
                    <td style={{ padding: '10px', color: '#878C91' }}>{s.gravame ? 'Sim' : 'Não'}</td>
                    <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B95B37', fontWeight: 700, fontSize: '12px' }}>Editar</button>
                      <button onClick={() => setDeleteId(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td colSpan={6} style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Total:</td>
                  <td colSpan={3} style={{ padding: '10px', fontWeight: 800, color: '#B95B37', fontFamily: 'Manrope, sans-serif' }}>R$ {totalValue.toLocaleString('pt-BR')}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>

      {/* Add/Edit modal */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setDrawerOpen(false); setEditingId(null) }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(30,28,26,0.45)',
              zIndex: 200,
            }}
          />
          {/* Modal */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            background: 'white',
            borderRadius: '16px',
            zIndex: 201,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebe9e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '17px', color: '#1e1c1a' }}>
                {editingId ? 'Editar Semovente' : 'Novo Semovente'}
              </div>
              <button onClick={() => { setDrawerOpen(false); setEditingId(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: '4px' }}>
                ×
              </button>
            </div>
            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Espécie / Tipo</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} list="especies-list"
                  value={form.especie_tipo} onChange={e => setForm(f => ({ ...f, especie_tipo: e.target.value }))} placeholder="VACA, BOI, CAVALO…" />
                <datalist id="especies-list">
                  {ESPECIES_SUGESTOES.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>
              {[
                { key: 'raca', label: 'Raça', placeholder: 'Nelore, Angus…' },
                { key: 'finalidade', label: 'Finalidade', placeholder: 'Cria, Engorda, Leite…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Sexo</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={form.sexo} onChange={e => setForm(f => ({ ...f, sexo: e.target.value as '' | 'M' | 'F' }))}>
                  <option value="">—</option>
                  <option value="M">Macho (M)</option>
                  <option value="F">Fêmea (F)</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Quantidade</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" min="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Valor unitário (R$)</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.01" min="0" value={form.valor_unitario} onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} placeholder="3.500,00" />
              </div>
              <div style={{ background: 'var(--color-surface)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
                <span style={{ color: '#878C91' }}>Total: </span>
                <span style={{ fontWeight: 700, color: '#010205' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.gravame} onChange={e => setForm(f => ({ ...f, gravame: e.target.checked }))} />
                  Gravame
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.seguro} onChange={e => setForm(f => ({ ...f, seguro: e.target.checked }))} />
                  Seguro
                </label>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Imóvel</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                  <option value="">Nenhum / Geral</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Ano de referência</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" value={form.ano_referencia} onChange={e => setForm(f => ({ ...f, ano_referencia: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Observações</div>
                <textarea className="input-field" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '80px' }}
                  value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="…" />
              </div>
            </div>
            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #ebe9e5', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
              <button onClick={() => { setDrawerOpen(false); setEditingId(null) }}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #ebe9e5', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#555' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#B95B37', color: 'white', cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.45)', zIndex: 300 }} onClick={() => setDeleteId(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: '14px', padding: '28px', width: '360px', zIndex: 301, boxShadow: '0 8px 48px rgba(0,0,0,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#010205', marginBottom: '8px' }}>Excluir semovente?</div>
            <p style={{ fontSize: '13px', color: '#878C91', marginBottom: '24px', lineHeight: 1.6 }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '9px 20px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: deleting ? '#f87171' : '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
