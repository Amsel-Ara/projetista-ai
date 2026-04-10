import type { SupabaseClient } from '@supabase/supabase-js'

export type ChecklistItem = {
  doc_key:        string
  label:          string
  category:       string   // A | B | C | D | E | F
  has_expiry:     boolean
  sort_order:     number
  source:         'MCR' | 'BB' | 'MCR+BB'
  required_level: 'mandatory' | 'conditional'
  notes:          string | null
  validity_days:  number | null   // days from issue date; null = doc has explicit expiry or doesn't expire
}

export type CreditProgram = {
  id:                 string
  bank:               string | null
  code:               string
  display_name:       string
  category:           'custeio' | 'investimento' | 'fundiario'
  eligibility:        string | null
  purpose:            string | null
  interest_rate_min:  number | null
  interest_rate_max:  number | null
  credit_limit_text:  string | null
  term_text:          string | null
  grace_text:         string | null
  mcr_chapter:        string | null
  safra:              string | null
  notes:              string | null
}

/**
 * Fetch all credit programs (MCR + bank-proprietary).
 * Returns them grouped by category for the two-dropdown UI.
 */
export async function fetchPrograms(
  supabase: SupabaseClient,
  bank: string
): Promise<CreditProgram[]> {
  const { data, error } = await supabase
    .from('credit_programs')
    .select('*')
    .or(`bank.is.null,bank.eq.${bank}`)
    .order('category')
    .order('display_name')
  if (error) throw error
  return (data ?? []) as CreditProgram[]
}

/**
 * Resolve the document checklist for a given program code + bank.
 * Returns only mandatory and conditional documents (not_applicable excluded).
 *
 * Query logic:
 *   - Find the credit_program row where code = programCode AND bank IS NULL (MCR programs)
 *     OR bank = bankSlug (bank-proprietary programs)
 *   - Return program_doc_requirements where bank IS NULL (MCR req) OR bank = bankSlug (bank addition)
 *   - Exclude required_level = 'not_applicable'
 */
export async function resolveChecklist(
  supabase: SupabaseClient,
  programCode: string,
  bankSlug: string
): Promise<ChecklistItem[]> {
  // First: find the program (MCR program or bank-proprietary)
  const { data: program, error: progErr } = await supabase
    .from('credit_programs')
    .select('id, bank')
    .eq('code', programCode)
    .or(`bank.is.null,bank.eq.${bankSlug}`)
    .maybeSingle()

  if (progErr || !program) return []

  // Then: fetch junction rows for this program, scoped to MCR + bank additions
  const { data, error } = await supabase
    .from('program_doc_requirements')
    .select(`
      source,
      required_level,
      notes,
      bank,
      validity_days,
      doc_types (
        doc_key,
        label,
        category,
        has_expiry,
        sort_order
      )
    `)
    .eq('program_id', program.id)
    .or(`bank.is.null,bank.eq.${bankSlug}`)
    .neq('required_level', 'not_applicable')
    .order('doc_types(sort_order)')

  if (error) return []

  return (data ?? []).map((row: any) => ({
    doc_key:        row.doc_types.doc_key,
    label:          row.doc_types.label,
    category:       row.doc_types.category,
    has_expiry:     row.doc_types.has_expiry,
    sort_order:     row.doc_types.sort_order,
    source:         row.source,
    required_level: row.required_level,
    notes:          row.notes,
    validity_days:  row.validity_days ?? null,
  }))
}

/** Map display bank name → DB slug used in credit_programs */
export const BANK_SLUGS: Record<string, string> = {
  'Banco do Brasil': 'banco_do_brasil',
  'Bradesco':        'bradesco',
  'Sicoob':          'sicoob',
  'Cresol':          'cresol',
  'BNB':             'bnb',
}

export const CATEGORY_LABELS: Record<string, string> = {
  custeio:     'Custeio',
  investimento: 'Investimento',
  fundiario:   'Fundiário',
}
