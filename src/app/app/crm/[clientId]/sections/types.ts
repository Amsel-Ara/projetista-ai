import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Shared section props ───────────────────────────────────────────────────

export interface SectionProps {
  clientId:       string
  organizationId: string
}

// ─── ClientData (mirrored from page.tsx for onClientUpdate callbacks) ───────

export interface ClientData {
  id: string; name: string; initials: string; whatsapp: string; email: string
  city: string; state: string; farmName: string; farmAddress: string
  assignedTo: string; cpf: string
  cnpj: string; razaoSocial: string; cnae: string; naturezaJuridica: string
  dateOfBirth: string; cpfStatus: string
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; ibgeCode: string; comoConheceu: string
}

// ─── recordFieldSource helper ────────────────────────────────────────────────
// Call this after every successful .update() or .insert() to write data-origin.

export async function recordFieldSource(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    clientId:       string
    tableName:      string
    recordId:       string
    fieldName:      string
    value:          unknown
    tipo:           'manual' | 'api_lookup' | 'system'
    apiSource?:     string
  }
): Promise<void> {
  await supabase.from('field_sources').insert({
    organization_id: params.organizationId,
    client_id:       params.clientId,
    document_id:     null,
    tipo:            params.tipo,
    api_source:      params.apiSource ?? null,
    table_name:      params.tableName,
    field_name:      params.fieldName,
    record_id:       params.recordId,
    extracted_value: params.value != null ? String(params.value) : null,
  })
}

// ─── Input mask helpers (shared across sections) ─────────────────────────────

export function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

export function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0,5)}-${d.slice(5)}`
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 0) return d
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export function maskDate(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
}

export function maskNIRF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 7) return d
  return `${d.slice(0,7)}-${d.slice(7)}`
}

// ─── Common style helpers ─────────────────────────────────────────────────────

export const CARD_STYLE: React.CSSProperties = {
  background: '#fff',
  borderRadius: '14px',
  padding: '24px',
  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
}

export const SECTION_HEADER_STYLE: React.CSSProperties = {
  fontFamily: 'Manrope, sans-serif',
  fontWeight: 700,
  fontSize: '14px',
  color: '#010205',
  marginBottom: '20px',
}

export const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#878C91',
  letterSpacing: '0.5px',
  marginBottom: '6px',
  textTransform: 'uppercase' as const,
}
