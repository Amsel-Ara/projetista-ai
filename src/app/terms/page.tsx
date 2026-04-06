export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      fontFamily: 'Manrope, Plus Jakarta Sans, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <span style={{ fontWeight: 800, fontSize: '17px', color: '#010205', letterSpacing: '-0.3px' }}>
          Projetista<span style={{ color: '#B95B37' }}>.Ai</span>
        </span>
        <a href="/onboard" style={{
          fontSize: '14px', color: '#878C91', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          ← Voltar
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#010205', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Termos de Uso e Política de Privacidade
          </h1>
          <p style={{ color: '#878C91', fontSize: '14px' }}>Versão 1.0 — Abril de 2026</p>
        </div>

        <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#010205' }}>

          <Section title="1. Aceitação dos Termos">
            Ao acessar ou utilizar a plataforma Projetista.Ai, o usuário declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com a Política de Privacidade. Caso não concorde com qualquer disposição, o acesso à plataforma não deve ser realizado.
          </Section>

          <Section title="2. Descrição do Serviço">
            A Projetista.Ai é uma plataforma de software como serviço (SaaS) voltada ao apoio de profissionais e empresas especializadas na elaboração de projetos de crédito rural no Brasil. A plataforma auxilia na organização de documentos, extração de informações e preenchimento de formulários bancários, com suporte de inteligência artificial.
          </Section>

          <Section title="3. Uso Permitido e Restrições">
            <p style={{ marginBottom: '12px' }}>O acesso à plataforma é concedido exclusivamente a usuários habilitados pelo administrador da conta. É expressamente proibido:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Compartilhar credenciais de acesso com terceiros</li>
              <li>Utilizar a plataforma para fins ilícitos ou em desacordo com a legislação brasileira</li>
              <li>Realizar engenharia reversa, cópia ou reprodução não autorizada do software</li>
              <li>Inserir dados falsos ou fraudulentos na plataforma</li>
            </ul>
          </Section>

          <Section title="4. Responsabilidade Técnica e Legal">
            O Projetista.Ai é uma ferramenta de apoio à elaboração de projetos de crédito rural. A plataforma não substitui o julgamento técnico do profissional habilitado. A responsabilidade técnica e legal pelas operações de crédito, pelos documentos submetidos e pelas informações declaradas junto às instituições financeiras é sempre e exclusivamente do projetista ou da empresa contratante.
          </Section>

          <Section title="5. Proteção de Dados (LGPD)">
            <p style={{ marginBottom: '12px' }}>A Projetista.Ai respeita e cumpre a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Em relação ao tratamento de dados pessoais:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Finalidade:</strong> Os dados são coletados exclusivamente para a prestação dos serviços contratados</li>
              <li><strong>Necessidade:</strong> Coletamos apenas os dados estritamente necessários para as funcionalidades da plataforma</li>
              <li><strong>Segurança:</strong> Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado</li>
              <li><strong>Compartilhamento:</strong> Não compartilhamos dados pessoais com terceiros sem consentimento explícito, exceto quando exigido por lei</li>
              <li><strong>Direitos do titular:</strong> O usuário pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento</li>
            </ul>
          </Section>

          <Section title="6. Propriedade dos Dados e Conteúdo">
            Todo o conteúdo inserido na plataforma pelos usuários — incluindo documentos, informações de clientes e dados de projetos — permanece de propriedade exclusiva do usuário e/ou de sua organização. A Projetista.Ai não reivindica direitos sobre esses dados e não os utilizará para fins comerciais.
          </Section>

          <Section title="7. Disponibilidade do Serviço">
            A Projetista.Ai envidará seus melhores esforços para manter a plataforma disponível de forma contínua. No entanto, não garantimos disponibilidade ininterrupta e não nos responsabilizamos por eventuais interrupções causadas por manutenção, falhas de terceiros ou casos fortuitos.
          </Section>

          <Section title="8. Alterações dos Termos">
            Estes Termos de Uso podem ser atualizados periodicamente. Alterações relevantes serão comunicadas aos usuários com antecedência razoável por e-mail ou notificação na plataforma. O uso continuado da plataforma após a data de vigência das alterações implica aceitação dos novos termos.
          </Section>

          <Section title="9. Foro e Legislação Aplicável">
            Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de São Paulo — SP como competente para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </Section>

          <div style={{
            marginTop: '40px',
            padding: '20px 24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}>
            <p style={{ fontSize: '14px', color: '#878C91', marginBottom: '4px' }}>Dúvidas sobre estes termos?</p>
            <a href="mailto:hello@projetista.ai" style={{ color: '#B95B37', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
              hello@projetista.ai
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#010205', marginBottom: '12px', letterSpacing: '-0.2px' }}>
        {title}
      </h2>
      <div style={{ color: '#374151' }}>{children}</div>
    </div>
  )
}
