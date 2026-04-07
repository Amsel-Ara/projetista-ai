'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    href: '/app/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/app/crm',
    label: 'CRM',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: '/app/notifications',
    label: 'Notificações',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/app/chat',
    label: 'Assistente IA',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [userName,     setUserName]     = useState('')
  const [userInitials, setUserInitials] = useState('…')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
      setUserName(name)
      const parts = name.trim().split(/\s+/)
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase()
      setUserInitials(initials || '?')
    })
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-surface-2)', fontFamily: 'var(--font-body)' }}>
      {/* Sidebar — fixed, 220px */}
      <aside style={{
        width: '220px',
        background: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 50,
      }}>

        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
              Projetista<span style={{ color: 'var(--brand-orange)' }}>.Ai</span>
            </div>
          </Link>
          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '3px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.5 }}>
            Plataforma
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  /* Active: orange left border + subtle orange bg; Inactive: transparent */
                  background: active ? 'var(--brand-orange-bg)' : 'transparent',
                  borderLeft: active ? '3px solid var(--brand-orange)' : '3px solid transparent',
                  paddingLeft: '10px',
                  color: active ? 'var(--brand-orange)' : 'var(--color-text-secondary)',
                  fontWeight: active ? 600 : 400,
                  fontSize: '14px',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}>
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            transition: 'background 0.15s',
          }}>
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--brand-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              letterSpacing: '0.5px',
            }}>
              {userInitials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || '…'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                Administrador
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '32px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
