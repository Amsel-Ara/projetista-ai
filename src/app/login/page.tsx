'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/app/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '24px', color: '#B95B37', letterSpacing: '-0.5px' }}>
              Projetista.Ai
            </span>
          </a>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 2px 20px rgba(1,2,5,0.08)' }}>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '22px', color: '#010205', marginBottom: '8px', textAlign: 'center' }}>
            Entrar na plataforma
          </h1>
          <p style={{ color: '#878C91', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>
            Acesse sua conta para continuar
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#010205', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
                  borderRadius: '8px', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.2s',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
                onFocus={e => e.target.style.borderColor = '#B95B37'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#010205', marginBottom: '6px' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
                  borderRadius: '8px', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.2s',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
                onFocus={e => e.target.style.borderColor = '#B95B37'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '14px', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', background: loading ? '#d4956f' : '#B95B37',
                color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px',
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Manrope, sans-serif', transition: 'background 0.2s',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#878C91' }}>
          Não tem acesso?{' '}
          <a href="mailto:hello@amsel-ara.com" style={{ color: '#B95B37', textDecoration: 'none', fontWeight: 600 }}>
            Fale com a equipe
          </a>
        </p>
      </div>
    </div>
  )
}
