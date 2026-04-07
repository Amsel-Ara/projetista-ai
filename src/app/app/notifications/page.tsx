'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const ORG_ID = 'a0000000-0000-0000-0000-000000000001'

type Notification = {
  id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
      if (data) setNotifications(data)
      setLoading(false)
    }
    load()
  }, [])

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('organization_id', ORG_ID)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '26px', color: '#010205', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            Notificações
          </h1>
          <p style={{ color: '#878C91', fontSize: '14px' }}>
            {loading ? '…' : `${unread} não lida${unread !== 1 ? 's' : ''}`}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            style={{ fontSize: '13px', color: '#878C91', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#878C91', fontSize: '14px' }}>Carregando...</p>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 0', color: '#878C91' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>🔔</div>
          <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#010205' }}>
            Nenhuma notificação
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto' }}>
            Você está em dia! Atualizações de documentos e solicitações aparecerão aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '18px 22px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
              borderLeft: n.is_read ? 'none' : '4px solid #B95B37',
              opacity: n.is_read ? 0.72 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#FDF0EB', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '13px', flexShrink: 0,
                }}>
                  🔔
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#010205' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#878C91', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(n.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {n.body && (
                    <p style={{ fontSize: '13px', color: '#878C91', lineHeight: 1.5, margin: 0 }}>
                      {n.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
