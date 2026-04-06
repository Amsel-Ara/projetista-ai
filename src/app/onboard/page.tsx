'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardPage() {
  const [accepted, setAccepted]   = useState(false)
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState('')
  const router  = useRouter()
  const supabase = createClient()

  async function handleAccept() {
    if (!accepted || loading) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({
      data: {
        terms_accepted:    true,
        terms_accepted_at: new Date().toISOString(),
      },
    })

    if (error) {
      setError('Não foi possível registrar sua aceitação. Tente novamente.')
      setLoading(false)
      return
    }

    router.push('/app/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Manrope, Plus Jakarta Sans, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: '24px', color: '#010205', letterSpacing: '-0.5px' }}>
              Projetista<span style={{ color: '#B95B37' }}>.Ai</span>
            </span>
          </a>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 2px 20px rgba(1,2,5,0.08)',
        }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: '#FDF0EB', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" fill="none" stroke="#B95B37" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#010205', marginBottom: '8px' }}>
              Bem-vindo(a) ao Projetista.Ai
            </h1>
            <p style={{ fontSize: '14px', color: '#878C91', lineHeight: 1.6 }}>
              Antes de acessar a plataforma, leia e aceite os nossos Termos de Uso.
            </p>
          </div>

          {/* T&C box */}
          <div style={{
            border: '1.5px solid #e5e7eb',
            borderRadius: '10px',
            padding: '16px 20px',
            background: '#FAFAFA',
            maxHeight: '260px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#010205',
            marginBottom: '12px',
          }}>
            <p style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}>Termos de Uso — Projetista.Ai</p>

            <p style={{ marginBottom: '10px' }}>
              Ao acessar a plataforma Projetista.Ai, o usuário concorda com os presentes Termos de Uso e com a Política de Privacidade.
            </p>

            <p style={{ fontWeight: 600, marginBottom: '4px' }}>1. Uso da Plataforma</p>
            <p style={{ marginBottom: '10px', color: '#4B5563' }}>
              O acesso é concedido exclusivamente a profissionais e empresas habilitados pelo administrador da plataforma. É expressamente proibido compartilhar credenciais de acesso com terceiros.
            </p>

            <p style={{ fontWeight: 600, marginBottom: '4px' }}>2. Dados e Privacidade (LGPD)</p>
            <p style={{ marginBottom: '10px', color: '#4B5563' }}>
              As informações inseridas na plataforma são tratadas com sigilo profissional e protegidas conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Não compartilhamos dados com terceiros sem consentimento explícito.
            </p>

            <p style={{ fontWeight: 600, marginBottom: '4px' }}>3. Propriedade dos Dados</p>
            <p style={{ marginBottom: '10px', color: '#4B5563' }}>
              Todo o conteúdo, relatórios e documentos gerados na plataforma pertencem ao usuário e/ou à sua organização contratante. A Projetista.Ai não reivindica direitos sobre os dados dos seus clientes.
            </p>

            <p style={{ fontWeight: 600, marginBottom: '4px' }}>4. Responsabilidade Técnica</p>
            <p style={{ marginBottom: '10px', color: '#4B5563' }}>
              O Projetista.Ai é uma ferramenta de apoio à elaboração de projetos de crédito rural. A responsabilidade técnica e legal pelas operações de crédito é sempre do profissional habilitado. A plataforma não substitui o julgamento do projetista.
            </p>

            <p style={{ fontWeight: 600, marginBottom: '4px' }}>5. Alterações dos Termos</p>
            <p style={{ color: '#4B5563' }}>
              Estes termos podem ser atualizados periodicamente. Usuários serão notificados com antecedência razoável sobre mudanças relevantes. O uso continuado da plataforma após a notificação implica aceitação das alterações.
            </p>
          </div>

          {/* Full terms link */}
          <div style={{ marginBottom: '24px' }}>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '13px', color: '#B95B37', textDecoration: 'none', fontWeight: 600 }}
            >
              Ver termos completos →
            </a>
          </div>

          {/* Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#010205',
            lineHeight: 1.5,
          }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              style={{ marginTop: '2px', accentColor: '#B95B37', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
            />
            Li e aceito os <strong style={{ marginLeft: '4px' }}>Termos de Uso</strong> e a <strong style={{ marginLeft: '4px' }}>Política de Privacidade</strong> da Projetista.Ai
          </label>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
              padding: '12px', marginBottom: '16px', fontSize: '14px', color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            style={{
              width: '100%',
              padding: '13px',
              background: !accepted || loading ? '#d4956f' : '#B95B37',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: !accepted || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Manrope, sans-serif',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Registrando...' : 'Aceitar e entrar na plataforma'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#878C91' }}>
          Problemas com o acesso?{' '}
          <a href="mailto:hello@projetista.ai" style={{ color: '#B95B37', textDecoration: 'none', fontWeight: 600 }}>
            Fale com a equipe
          </a>
        </p>
      </div>
    </div>
  )
}
