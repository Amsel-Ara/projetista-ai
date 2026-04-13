'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordFieldSource, maskCPF, maskCNPJ, maskCEP, maskPhone, maskDate, type ClientData } from './types'

interface IdentificacaoSectionProps {
  clientId:       string
  organizationId: string
  onClientUpdate: (patch: Partial<ClientData>) => void
}

type PessoaForm = {
  name: string; cpf: string; cnpj: string; razaoSocial: string; cnae: string
  naturezaJuridica: string; dateOfBirth: string; cpfStatus: string
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; city: string; state: string; ibgeCode: string
  whatsapp: string; email: string; comoConheceu: string
}

const EMPTY_FORM: PessoaForm = {
  name: '', cpf: '', cnpj: '', razaoSocial: '', cnae: '', naturezaJuridica: '',
  dateOfBirth: '', cpfStatus: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '',
  city: '', state: '', ibgeCode: '',
  whatsapp: '', email: '', comoConheceu: '',
}

function applyPessoaMask(key: string, value: string): string {
  switch (key) {
    case 'cpf':         return maskCPF(value)
    case 'cnpj':        return maskCNPJ(value)
    case 'cep':         return maskCEP(value)
    case 'whatsapp':    return maskPhone(value)
    case 'dateOfBirth': return maskDate(value)
    default:            return value
  }
}

export default function IdentificacaoSection({ clientId, organizationId, onClientUpdate }: IdentificacaoSectionProps) {
  const supabase = createClient()

  const [form,          setForm]         = useState<PessoaForm>(EMPTY_FORM)
  const [loadedForm,    setLoadedForm]   = useState<PessoaForm>(EMPTY_FORM)
  const [loading,       setLoading]      = useState(true)
  const [saving,        setSaving]       = useState(false)
  const [saveError,     setSaveError]    = useState('')
  const [saved,         setSaved]        = useState(false)

  const [cpfLoading,    setCpfLoading]   = useState(false)
  const [cpfMsg,        setCpfMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const [cnpjLoading,   setCnpjLoading]  = useState(false)
  const [cnpjMsg,       setCnpjMsg]      = useState<{ ok: boolean; text: string } | null>(null)
  const [cepLoading,    setCepLoading]   = useState(false)
  const [cepMsg,        setCepMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  // Load client data on mount
  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    supabase.from('clients').select('*').eq('id', clientId).single()
      .then(({ data }) => {
        if (data) {
          const f: PessoaForm = {
            name:             data.name             ?? '',
            cpf:              data.cpf              ?? '',
            cnpj:             data.cnpj             ?? '',
            razaoSocial:      data.razao_social      ?? '',
            cnae:             data.cnae             ?? '',
            naturezaJuridica: data.natureza_juridica ?? '',
            dateOfBirth:      data.date_of_birth    ?? '',
            cpfStatus:        data.cpf_status       ?? '',
            cep:              data.cep              ?? '',
            logradouro:       data.logradouro       ?? '',
            numero:           data.numero           ?? '',
            complemento:      data.complemento      ?? '',
            bairro:           data.bairro           ?? '',
            city:             data.city             ?? '',
            state:            data.state            ?? '',
            ibgeCode:         data.ibge_code        ?? '',
            whatsapp:         data.whatsapp         ?? '',
            email:            data.email            ?? '',
            comoConheceu:     data.como_conheceu    ?? '',
          }
          setForm(f)
          setLoadedForm(f)
        }
        setLoading(false)
      })
  }, [clientId])

  async function handleSave() {
    setSaving(true); setSaveError(''); setSaved(false)
    const { error } = await supabase.from('clients').update({
      name:               form.name,
      cpf:                form.cpf              || null,
      cnpj:               form.cnpj             || null,
      razao_social:       form.razaoSocial      || null,
      cnae:               form.cnae             || null,
      natureza_juridica:  form.naturezaJuridica || null,
      date_of_birth:      form.dateOfBirth      || null,
      cpf_status:         form.cpfStatus        || null,
      cep:                form.cep              || null,
      logradouro:         form.logradouro       || null,
      numero:             form.numero           || null,
      complemento:        form.complemento      || null,
      bairro:             form.bairro           || null,
      city:               form.city             || null,
      state:              form.state            || null,
      ibge_code:          form.ibgeCode         || null,
      whatsapp:           form.whatsapp         || null,
      email:              form.email            || null,
      como_conheceu:      form.comoConheceu     || null,
    }).eq('id', clientId)

    if (error) { setSaveError('Erro ao salvar. Tente novamente.'); setSaving(false); return }

    // Write field_sources for each changed field
    const fieldMap: [keyof PessoaForm, string][] = [
      ['name', 'name'], ['cpf', 'cpf'], ['cnpj', 'cnpj'],
      ['razaoSocial', 'razao_social'], ['cnae', 'cnae'],
      ['naturezaJuridica', 'natureza_juridica'], ['dateOfBirth', 'date_of_birth'],
      ['cpfStatus', 'cpf_status'], ['cep', 'cep'], ['logradouro', 'logradouro'],
      ['numero', 'numero'], ['complemento', 'complemento'], ['bairro', 'bairro'],
      ['city', 'city'], ['state', 'state'], ['ibgeCode', 'ibge_code'],
      ['whatsapp', 'whatsapp'], ['email', 'email'], ['comoConheceu', 'como_conheceu'],
    ]
    const changedFields = fieldMap.filter(([fk]) => form[fk] !== loadedForm[fk])
    await Promise.allSettled(
      changedFields.map(([fk, dbField]) =>
        recordFieldSource(supabase, {
          organizationId, clientId,
          tableName: 'clients', recordId: clientId,
          fieldName: dbField, value: form[fk],
          tipo: 'manual',
        })
      )
    )

    // Update parent header
    const parts = form.name.trim().split(/\s+/)
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : form.name.slice(0, 2).toUpperCase()
    onClientUpdate({ name: form.name, initials, whatsapp: form.whatsapp, email: form.email, city: form.city, state: form.state, cpf: form.cpf })

    setLoadedForm(form)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function lookupCPF() {
    setCpfLoading(true); setCpfMsg(null)
    const digits = form.cpf.replace(/\D/g, '')
    if (digits.length !== 11) {
      setCpfMsg({ ok: false, text: 'CPF incompleto (11 dígitos).' })
      setCpfLoading(false); return
    }
    try {
      const res  = await fetch(`/api/lookup/cpf?cpf=${digits}`)
      const body = await res.text()
      if (!res.ok || body.trim().startsWith('<')) {
        setCpfMsg({ ok: false, text: 'Serviço indisponível — consulte em gov.br/receitafederal.' })
        return
      }
      const data = JSON.parse(body)
      const newName      = data.nome       ? (form.name || data.nome) : form.name
      const newCpfStatus = data.situacao?.descricao ?? data.situacao ?? form.cpfStatus
      setForm(p => ({ ...p, name: newName, cpfStatus: newCpfStatus }))
      setCpfMsg({ ok: true, text: '✓ Dados preenchidos' })
      // Record api_lookup provenance
      await Promise.allSettled([
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'name', value: newName, tipo: 'api_lookup', apiSource: 'receita_federal' }),
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'cpf_status', value: newCpfStatus, tipo: 'api_lookup', apiSource: 'receita_federal' }),
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'tente novamente.'
      setCpfMsg({ ok: false, text: 'Erro: ' + msg })
    } finally {
      setCpfLoading(false)
    }
  }

  async function lookupCNPJ() {
    setCnpjLoading(true); setCnpjMsg(null)
    const digits = form.cnpj.replace(/\D/g, '')
    if (digits.length !== 14) {
      setCnpjMsg({ ok: false, text: 'CNPJ incompleto (14 dígitos).' })
      setCnpjLoading(false); return
    }
    try {
      const res = await fetch(`/api/lookup/cnpj?cnpj=${digits}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setCnpjMsg({ ok: false, text: (err as { message?: string }).message ?? `Não encontrado (${res.status}).` })
        return
      }
      const data = await res.json()
      const newRazao    = data.razao_social            ?? form.razaoSocial
      const newCnae     = data.cnae_fiscal?.toString() ?? form.cnae
      const newNatureza = data.natureza_juridica        ?? form.naturezaJuridica
      setForm(p => ({ ...p, razaoSocial: newRazao, cnae: newCnae, naturezaJuridica: newNatureza }))
      setCnpjMsg({ ok: true, text: '✓ Dados preenchidos' })
      await Promise.allSettled([
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'razao_social', value: newRazao, tipo: 'api_lookup', apiSource: 'receita_federal' }),
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'cnae', value: newCnae, tipo: 'api_lookup', apiSource: 'receita_federal' }),
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'natureza_juridica', value: newNatureza, tipo: 'api_lookup', apiSource: 'receita_federal' }),
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'tente novamente.'
      setCnpjMsg({ ok: false, text: 'Erro: ' + msg })
    } finally {
      setCnpjLoading(false)
    }
  }

  async function lookupCEP() {
    setCepLoading(true); setCepMsg(null)
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) {
      setCepMsg({ ok: false, text: 'CEP incompleto (8 dígitos).' })
      setCepLoading(false); return
    }
    try {
      const res = await fetch(`/api/lookup/cep?cep=${digits}`)
      if (!res.ok) { setCepMsg({ ok: false, text: `CEP não encontrado (${res.status}).` }); return }
      const data = await res.json()
      if (data.erro) { setCepMsg({ ok: false, text: 'CEP não encontrado.' }); return }
      const newLogradouro = data.logradouro ?? form.logradouro
      const newBairro     = data.bairro     ?? form.bairro
      const newCity       = data.localidade ?? form.city
      const newState      = data.uf         ?? form.state
      const newIbge       = data.ibge       ?? form.ibgeCode
      setForm(p => ({ ...p, logradouro: newLogradouro, bairro: newBairro, city: newCity, state: newState, ibgeCode: newIbge }))
      setCepMsg({ ok: true, text: '✓ Endereço preenchido' })
      await Promise.allSettled([
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'logradouro', value: newLogradouro, tipo: 'api_lookup', apiSource: 'viacep' }),
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'bairro', value: newBairro, tipo: 'api_lookup', apiSource: 'viacep' }),
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'city', value: newCity, tipo: 'api_lookup', apiSource: 'viacep' }),
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'state', value: newState, tipo: 'api_lookup', apiSource: 'viacep' }),
        recordFieldSource(supabase, { organizationId, clientId, tableName: 'clients', recordId: clientId, fieldName: 'ibge_code', value: newIbge, tipo: 'api_lookup', apiSource: 'viacep' }),
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'tente novamente.'
      setCepMsg({ ok: false, text: 'Erro: ' + msg })
    } finally {
      setCepLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#878C91', fontSize: '13px' }}>Carregando…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Identificação */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '20px' }}>Identificação</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {([
            { key: 'cpf',              label: 'CPF',               placeholder: '000.000.000-00', lookup: 'cpf' },
            { key: 'name',             label: 'Nome completo',     placeholder: 'Nome completo' },
            { key: 'dateOfBirth',      label: 'Data de nascimento', placeholder: 'DD/MM/AAAA' },
            { key: 'cpfStatus',        label: 'Status CPF',        placeholder: '—', readOnly: true },
            { key: 'cnpj',             label: 'CNPJ (se PJ)',      placeholder: '00.000.000/0001-00', lookup: 'cnpj' },
            { key: 'razaoSocial',      label: 'Razão social',      placeholder: 'Preenchido via CNPJ', readOnly: true },
            { key: 'cnae',             label: 'CNAE principal',    placeholder: '—', readOnly: true },
            { key: 'naturezaJuridica', label: 'Natureza jurídica', placeholder: '—', readOnly: true },
          ] as { key: keyof PessoaForm; label: string; placeholder: string; readOnly?: boolean; lookup?: string }[]).map(({ key, label, placeholder, readOnly, lookup }) => (
            <div key={key}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  className="input-field"
                  style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: readOnly ? 'var(--color-surface-2)' : '#fff' }}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: applyPessoaMask(key, e.target.value) }))}
                  placeholder={placeholder}
                  readOnly={readOnly}
                />
                {lookup === 'cpf' && (
                  <button type="button" onClick={lookupCPF} disabled={cpfLoading}
                    style={{ padding: '0 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--brand-orange)', whiteSpace: 'nowrap', opacity: cpfLoading ? 0.6 : 1 }}>
                    {cpfLoading ? '…' : 'Buscar →'}
                  </button>
                )}
                {lookup === 'cnpj' && (
                  <button type="button" onClick={lookupCNPJ} disabled={cnpjLoading}
                    style={{ padding: '0 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--brand-orange)', whiteSpace: 'nowrap', opacity: cnpjLoading ? 0.6 : 1 }}>
                    {cnpjLoading ? '…' : 'Buscar →'}
                  </button>
                )}
              </div>
              {lookup === 'cpf'  && cpfMsg  && <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: cpfMsg.ok  ? '#16a34a' : '#dc2626' }}>{cpfMsg.text}</div>}
              {lookup === 'cnpj' && cnpjMsg && <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: cnpjMsg.ok ? '#16a34a' : '#dc2626' }}>{cnpjMsg.text}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Endereço */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '20px' }}>Endereço</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {([
            { key: 'cep',        label: 'CEP',         placeholder: '00000-000', lookup: true },
            { key: 'logradouro', label: 'Logradouro',  placeholder: 'Preenchido via CEP' },
            { key: 'numero',     label: 'Número',      placeholder: '123' },
            { key: 'complemento',label: 'Complemento', placeholder: 'Apto, sala…' },
            { key: 'bairro',     label: 'Bairro',      placeholder: '—' },
            { key: 'city',       label: 'Município',   placeholder: '—' },
            { key: 'state',      label: 'UF',          placeholder: '—' },
            { key: 'ibgeCode',   label: 'Código IBGE', placeholder: '—' },
          ] as { key: keyof PessoaForm; label: string; placeholder: string; lookup?: boolean }[]).map(({ key, label, placeholder, lookup }) => (
            <div key={key}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  className="input-field"
                  style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: applyPessoaMask(key, e.target.value) }))}
                  placeholder={placeholder}
                />
                {lookup && (
                  <button type="button" onClick={lookupCEP} disabled={cepLoading}
                    style={{ padding: '0 12px', border: '1.5px solid var(--color-border)', borderRadius: '8px', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--brand-orange)', whiteSpace: 'nowrap', opacity: cepLoading ? 0.6 : 1 }}>
                    {cepLoading ? '…' : 'Buscar →'}
                  </button>
                )}
              </div>
              {lookup && cepMsg && <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: cepMsg.ok ? '#16a34a' : '#dc2626' }}>{cepMsg.text}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Contato */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '14px', color: '#010205', marginBottom: '20px' }}>Contato</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {([
            { key: 'whatsapp', label: 'WhatsApp / Celular', placeholder: '(00) 00000-0000' },
            { key: 'email',    label: 'E-mail',             placeholder: 'produtor@email.com' },
          ] as { key: keyof PessoaForm; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
              <input
                className="input-field"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: applyPessoaMask(key, e.target.value) }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#878C91', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Como conheceu?</div>
            <select
              className="input-field"
              style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.comoConheceu}
              onChange={e => setForm(p => ({ ...p, comoConheceu: e.target.value }))}>
              <option value="">Selecionar…</option>
              {['Indicação', 'Sindicato / Cooperativa', 'Redes sociais', 'Outros'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save bar */}
      {saveError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>{saveError}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando…' : 'Salvar dados'}
        </button>
        {saved && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✓ Salvo com sucesso</span>}
      </div>
    </div>
  )
}
