'use client'

import { useState, useEffect } from 'react'

type UploadedDoc = {
  id: string
  doc_type: string
  file_name: string
  file_path: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  expiry_date: string | null
  extracted_fields: Record<string, any> | null
  created_at: string
}

type Props = {
  document: UploadedDoc
  onClose: () => void
  onFieldUpdate?: (documentId: string, fields: Record<string, any>) => void
  onDelete?: (documentId: string) => void
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Enviado',       color: '#878C91', bg: '#F3F3F3' },
  processing: { label: 'Processando…', color: '#B95B37', bg: '#FDF0EB' },
  completed:  { label: 'Processado',    color: '#16a34a', bg: '#f0fdf4' },
  failed:     { label: 'Erro',          color: '#dc2626', bg: '#fef2f2' },
}

// Fields we want to display (order matters)
const DISPLAY_FIELDS = [
  { key: 'summary',          label: 'Resumo' },
  { key: 'nome',             label: 'Nome' },
  { key: 'cpf_cnpj',        label: 'CPF / CNPJ' },
  { key: 'numero_registro',  label: 'Registro' },
  { key: 'orgao_emissor',    label: 'Órgão emissor' },
  { key: 'propriedade',      label: 'Propriedade' },
  { key: 'municipio',        label: 'Município' },
  { key: 'uf',               label: 'UF' },
  { key: 'area_ha',          label: 'Área (ha)' },
  { key: 'valor',            label: 'Valor' },
  { key: 'issue_date',       label: 'Data de emissão' },
  { key: 'expiry_date',      label: 'Validade (extraída)' },
  { key: 'effective_expiry', label: 'Validade efetiva' },
  { key: 'confidence',       label: 'Confiança IA' },
]

export default function DocumentViewer({ document: doc, onClose, onFieldUpdate, onDelete }: Props) {
  const [signedUrl, setSignedUrl]       = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [editing, setEditing]           = useState(false)
  const [editFields, setEditFields]     = useState<Record<string, string>>({})
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [retrying, setRetrying]           = useState(false)
  const [retryError, setRetryError]       = useState<string | null>(null)

  const sCfg = STATUS_LABELS[doc.status] ?? STATUS_LABELS.pending
  const isPdf = doc.file_name?.toLowerCase().endsWith('.pdf')
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file_name ?? '')

  // Fetch signed URL
  useEffect(() => {
    setLoading(true)
    setSignedUrl(null)
    fetch(`/api/documents/${doc.id}/signed-url`)
      .then(r => r.json())
      .then(data => {
        if (data.url) setSignedUrl(data.url)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [doc.id])

  function startEdit() {
    const fields = doc.extracted_fields ?? {}
    const editable: Record<string, string> = {}
    for (const f of DISPLAY_FIELDS) {
      const val = fields[f.key]
      if (val != null && f.key !== 'confidence') {
        editable[f.key] = String(val)
      }
    }
    setEditFields(editable)
    setEditing(true)
  }

  async function handleRetry() {
    setRetrying(true)
    setRetryError(null)
    try {
      const res = await fetch(`/api/documents/${doc.id}/extract`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setRetryError(json.error ?? 'Falha na extração')
      } else if (onFieldUpdate && json.result) {
        // Update the parent — Realtime will also pick this up, but update immediately
        onFieldUpdate(doc.id, json.result.extracted_fields ?? {})
      }
    } catch (err: any) {
      setRetryError(err.message ?? 'Erro desconhecido')
    } finally {
      setRetrying(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      if (onDelete) onDelete(doc.id)
      onClose()
    } catch (err) {
      console.error('[DocumentViewer] Delete error:', err)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updatedFields = { ...(doc.extracted_fields ?? {}), ...editFields }
      const body: Record<string, any> = { fields: updatedFields }
      // If expiry was edited, also update documents.expiry_date
      if (editFields.effective_expiry && editFields.effective_expiry !== doc.expiry_date) {
        body.expiry_date = editFields.effective_expiry
      }
      await fetch(`/api/documents/${doc.id}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (onFieldUpdate) onFieldUpdate(doc.id, updatedFields)
      setEditing(false)
    } catch (err) {
      console.error('[DocumentViewer] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(1,2,5,0.35)', zIndex: 400,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '50vw', minWidth: '420px', maxWidth: '800px',
        background: '#fff', zIndex: 401,
        boxShadow: '-8px 0 48px rgba(0,0,0,0.16)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.2s ease-out',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#010205', fontFamily: 'Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.file_name}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: sCfg.color, background: sCfg.bg, borderRadius: '20px', padding: '3px 10px', flexShrink: 0 }}>
              {sCfg.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ border: '1.5px solid #fecaca', borderRadius: '8px', background: '#fff', cursor: 'pointer', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: '#dc2626' }}
              >
                Excluir
              </button>
            ) : (
              <>
                <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>Confirmar?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ border: 'none', borderRadius: '8px', background: '#dc2626', cursor: deleting ? 'not-allowed' : 'pointer', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: '#fff' }}
                >
                  {deleting ? '…' : 'Sim'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', cursor: 'pointer', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}
                >
                  Não
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer',
                width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px',
                color: 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Document preview */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: '1 1 55%', overflow: 'hidden', background: '#f8f8f8', position: 'relative' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                Carregando documento…
              </div>
            ) : signedUrl ? (
              isPdf ? (
                <iframe
                  src={signedUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title={doc.file_name}
                />
              ) : isImage ? (
                <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                  <img
                    src={signedUrl}
                    alt={doc.file_name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontSize: '36px' }}>📄</div>
                  <div style={{ fontSize: '13px' }}>Pré-visualização não disponível para este tipo de arquivo.</div>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--brand-orange)', fontWeight: 600, textDecoration: 'none' }}>
                    Abrir em nova aba
                  </a>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#dc2626', fontSize: '13px' }}>
                Erro ao carregar documento.
              </div>
            )}
          </div>

          {/* Extracted fields */}
          <div style={{ flex: '0 1 45%', overflow: 'auto', borderTop: '1px solid var(--color-border)', padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#010205', fontFamily: 'Manrope, sans-serif' }}>
                Dados Extraídos
              </div>
              {!editing ? (
                <button
                  onClick={startEdit}
                  style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-orange)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Editar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditing(false)}
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ fontSize: '12px', fontWeight: 600, color: '#fff', background: saving ? '#d4956f' : 'var(--brand-orange)', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: saving ? 'not-allowed' : 'pointer' }}
                  >
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>

            {doc.extracted_fields && Object.keys(doc.extracted_fields).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {DISPLAY_FIELDS.map(f => {
                  const val = editing ? editFields[f.key] : doc.extracted_fields?.[f.key]
                  if (val == null || val === '') return null
                  return (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '120px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {f.label}
                      </div>
                      {editing && f.key !== 'confidence' ? (
                        <input
                          value={editFields[f.key] ?? ''}
                          onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '13px', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#010205' }}
                        />
                      ) : (
                        <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#010205' }}>
                          {f.key === 'confidence' ? `${Math.round(Number(val) * 100)}%` : String(val)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : doc.status === 'processing' ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⟳</div>
                Analisando documento…
              </div>
            ) : doc.status === 'failed' ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '13px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#dc2626' }}>!</div>
                <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: '6px' }}>Falha na extração</div>
                {(doc.extracted_fields?.error || retryError) && (
                  <div style={{ fontSize: '11px', color: '#878C91', marginBottom: '12px', fontFamily: 'monospace', background: '#f8f8f8', borderRadius: '6px', padding: '8px 12px', textAlign: 'left', wordBreak: 'break-all' }}>
                    {retryError ?? doc.extracted_fields?.error}
                  </div>
                )}
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: retrying ? '#d4956f' : 'var(--brand-orange)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: retrying ? 'not-allowed' : 'pointer' }}
                >
                  {retrying ? 'Analisando…' : 'Retentar extração'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                Nenhum dado extraído.
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
