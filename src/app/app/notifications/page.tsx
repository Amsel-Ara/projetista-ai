const NOTIFICATIONS = [
  { id: 1, client: 'João Silva', title: 'Documento precisa de revisão', body: 'A Matrícula do imóvel foi processada mas tem campos com baixa confiança. Verifique antes de continuar.', date: '31/03/2026 14:32', read: false, type: 'warning' },
  { id: 2, client: 'Maria Costa', title: 'Documentos pendentes', body: 'Faltam 5 documentos para completar a solicitação Pronamp. Última atividade há 3 dias.', date: '30/03/2026 10:15', read: false, type: 'alert' },
  { id: 3, client: 'Pedro Alves', title: 'ITR processado com sucesso', body: 'O ITR 2024 foi processado e todos os campos foram extraídos com sucesso.', date: '29/03/2026 16:40', read: true, type: 'success' },
  { id: 4, client: 'Ana Lima', title: 'Solicitação enviada ao banco', body: 'O formulário Pronaf Custeio foi gerado e enviado ao Banco do Brasil.', date: '28/03/2026 09:00', read: true, type: 'success' },
  { id: 5, client: 'Carlos Souza', title: 'Solicitação aprovada!', body: 'A solicitação de crédito Pronaf Custeio foi aprovada pelo Banco do Brasil. Parabéns!', date: '27/03/2026 15:22', read: true, type: 'success' },
]

const TYPE_CFG = {
  success: { color: '#16a34a', bg: '#f0fdf4', icon: '✓' },
  warning: { color: '#d97706', bg: '#fffbeb', icon: '!' },
  alert:   { color: '#dc2626', bg: '#fef2f2', icon: '✕' },
}

export default function NotificationsPage() {
  const unread = NOTIFICATIONS.filter(n => !n.read).length

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '26px', color: '#010205', letterSpacing: '-0.5px', marginBottom: '4px' }}>Notificações</h1>
          <p style={{ color: '#878C91', fontSize: '14px' }}>{unread} não lidas</p>
        </div>
        {unread > 0 && (
          <button style={{ fontSize: '13px', color: '#878C91', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Marcar todas como lidas</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {NOTIFICATIONS.map(n => {
          const cfg = TYPE_CFG[n.type as keyof typeof TYPE_CFG]
          return (
            <div key={n.id} style={{
              background: '#fff', borderRadius: '12px', padding: '18px 22px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
              borderLeft: n.read ? 'none' : `4px solid ${cfg.color}`,
              opacity: n.read ? 0.75 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#010205' }}>{n.title}</span>
                      <span style={{ fontSize: '12px', color: '#878C91', marginLeft: '8px' }}>— {n.client}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#878C91', flexShrink: 0 }}>{n.date}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#878C91', lineHeight: 1.5 }}>{n.body}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
