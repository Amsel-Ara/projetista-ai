'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordFieldSource } from './types'

interface BensMoveisSectionProps {
  clientId:       string
  organizationId: string
}

type BemMovel = {
  id: string
  especie_tipo: string; marca_modelo: string | null
  ano_fabricacao: number | null; quantidade: number; estado: string | null
  finalidade: string | null; valor_unitario: number | null; valor_total: number | null
  gravame: boolean; seguro: boolean
  property_id: string | null; ano_referencia: number
  alienado_em: string | null; observacoes: string | null
  rural_properties?: { nome: string } | null
}

type RuralProperty = { id: string; nome: string }

const TIPOS_BENS = ['Trator', 'Colheitadeira', 'Caminhão', 'Pulverizador', 'Plantadeira', 'Implemento', 'Moto', 'Barco', 'Outros']

const EMPTY_FORM = {
  especie_tipo: '', marca_modelo: '', ano_fabricacao: '',
  quantidade: '1', estado: '', finalidade: '',
  valor_unitario: '', gravame: false, seguro: false,
  property_id: '', ano_referencia: String(new Date().getFullYear()),
  alienado_em: '', observacoes: '',
}

export default function BensMoveisSection({ clientId, organizationId }: BensMoveisSectionProps) {
  const supabase = createClient()

  const [bens,         setBens]         = useState<BemMovel[]>([])
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
    supabase.from('movable_assets')
      .select('*, rural_properties(nome)')
      .eq('client_id', clientId)
      .order('especie_tipo')
      .then(({ data }) => {
        setBens((data ?? []) as BemMovel[])
        setLoading(false)
      })
  }, [clientId])

  const displayed = bens.filter(b => {
    const yearOk = b.ano_referencia === selectedYear
    const propOk = !propFilter || b.property_id === propFilter
    return yearOk && propOk
  })

  const totalValue = displayed.reduce((sum, b) => sum + (b.valor_total ?? 0), 0)

  function openNew() {
    setForm({ ...EMPTY_FORM, ano_referencia: String(selectedYear) })
    setEditingId(null)
    setDrawerOpen(true)
  }

  function openEdit(b: BemMovel) {
    setForm({
      especie_tipo: b.especie_tipo, marca_modelo: b.marca_modelo ?? '',
      ano_fabricacao: b.ano_fabricacao?.toString() ?? '',
      quantidade: String(b.quantidade), estado: b.estado ?? '',
      finalidade: b.finalidade ?? '', valor_unitario: b.valor_unitario?.toString() ?? '',
      gravame: b.gravame, seguro: b.seguro,
      property_id: b.property_id ?? '',
      ano_referencia: String(b.ano_referencia),
      alienado_em: b.alienado_em ?? '', observacoes: b.observacoes ?? '',
    })
    setEditingId(b.id)
    setDrawerOpen(true)
  }

  const qty   = parseInt(form.quantidade) || 0
  const unit  = parseFloat(form.valor_unitario) || 0
  const total = qty * unit

  async function handleSave() {
    setSaving(true)
    const payload = {
      organization_id: organizationId,
      client_id:       clientId,
      especie_tipo:    form.especie_tipo,
      marca_modelo:    form.marca_modelo || null,
      ano_fabricacao:  form.ano_fabricacao ? parseInt(form.ano_fabricacao) : null,
      quantidade:      qty,
      estado:          form.estado || null,
      finalidade:      form.finalidade || null,
      valor_unitario:  unit || null,
      valor_total:     total || null,
      gravame:         form.gravame,
      seguro:          form.seguro,
      property_id:     form.property_id || null,
      ano_referencia:  parseInt(form.ano_referencia),
      alienado_em:     form.alienado_em || null,
      observacoes:     form.observacoes || null,
    }
    if (editingId) {
      const { data, error } = await supabase.from('movable_assets').update(payload).eq('id', editingId).select('*, rural_properties(nome)').single()
      if (!error && data) {
        setBens(prev => prev.map(b => b.id === editingId ? data as BemMovel : b))
        await recordFieldSource(supabase, { organizationId, clientId, tableName: 'movable_assets', recordId: editingId, fieldName: 'especie_tipo', value: form.especie_tipo, tipo: 'manual' })
      }
    } else {
      const { data, error } = await supabase.from('movable_assets').insert(payload).select('*, rural_properties(nome)').single()
      if (!error && data) setBens(prev => [...prev, data as BemMovel])
    }
    setSaving(false); setDrawerOpen(false); setEditingId(null)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('movable_assets').delete().eq('id', deleteId)
    setBens(prev => prev.filter(b => b.id !== deleteId))
    setDeleteId(null); setDeleting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205' }}>Bens Móveis</div>
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
              + Novo Bem
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#878C91' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🚜</div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#010205', marginBottom: '4px' }}>Nenhum bem móvel cadastrado</p>
            <p style={{ fontSize: '12px' }}>Adicione tratores, colheitadeiras e outros equipamentos.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Tipo', 'Marca/Modelo', 'Ano', 'Qtd', 'Estado', 'Valor Unit.', 'Total', 'Ações'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#878C91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{b.especie_tipo}</td>
                  <td style={{ padding: '10px', color: '#878C91' }}>{b.marca_modelo ?? '—'}</td>
                  <td style={{ padding: '10px', color: '#878C91' }}>{b.ano_fabricacao ?? '—'}</td>
                  <td style={{ padding: '10px' }}>{b.quantidade}</td>
                  <td style={{ padding: '10px', color: '#878C91' }}>{b.estado ?? '—'}</td>
                  <td style={{ padding: '10px' }}>{b.valor_unitario != null ? `R$ ${b.valor_unitario.toLocaleString('pt-BR')}` : '—'}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{b.valor_total != null ? `R$ ${b.valor_total.toLocaleString('pt-BR')}` : '—'}</td>
                  <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B95B37', fontWeight: 700, fontSize: '12px' }}>Editar</button>
                    <button onClick={() => setDeleteId(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                <td colSpan={6} style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Total:</td>
                <td colSpan={2} style={{ padding: '10px', fontWeight: 800, color: '#B95B37', fontFamily: 'Manrope, sans-serif' }}>R$ {totalValue.toLocaleString('pt-BR')}</td>
              </tr>
            </tfoot>
          </table>
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
                {editingId ? 'Editar Bem Móvel' : 'Novo Bem Móvel'}
              </div>
              <button onClick={() => { setDrawerOpen(false); setEditingId(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: '4px' }}>
                ×
              </button>
            </div>
            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Tipo</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={form.especie_tipo} onChange={e => setForm(f => ({ ...f, especie_tipo: e.target.value }))}>
                  <option value="">Selecionar…</option>
                  {TIPOS_BENS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {[
                { key: 'marca_modelo', label: 'Marca / Modelo', placeholder: 'John Deere 6110J' },
                { key: 'finalidade', label: 'Finalidade', placeholder: 'Plantio, transporte…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Ano fabricação</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" min="1900" max={new Date().getFullYear() + 1} value={form.ano_fabricacao} onChange={e => setForm(f => ({ ...f, ano_fabricacao: e.target.value }))} placeholder={String(new Date().getFullYear())} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Quantidade</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" min="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="1" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Estado</div>
                <select className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  <option value="">Selecionar…</option>
                  {['Novo', 'Bom', 'Regular', 'Ruim'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Valor unitário (R$)</div>
                <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" step="0.01" min="0" value={form.valor_unitario} onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} placeholder="180.000" />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Ano referência</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="number" value={form.ano_referencia} onChange={e => setForm(f => ({ ...f, ano_referencia: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Alienado em</div>
                  <input className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} type="date" value={form.alienado_em} onChange={e => setForm(f => ({ ...f, alienado_em: e.target.value }))} />
                </div>
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
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#010205', marginBottom: '8px' }}>Excluir bem móvel?</div>
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
