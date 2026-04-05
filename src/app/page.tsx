'use client'

import { useEffect, useState } from 'react'

const DEADLINE = new Date('2026-06-30T23:59:59-03:00')

function pad(n: number) { return n < 10 ? '0' + n : String(n) }

function useCountdown() {
  const [time, setTime] = useState({ days: 0, hours: '00', mins: '00', secs: '00', expired: false })
  useEffect(() => {
    function calc() {
      const diff = DEADLINE.getTime() - Date.now()
      if (diff <= 0) { setTime({ days: 0, hours: '00', mins: '00', secs: '00', expired: true }); return }
      setTime({
        days:    Math.floor(diff / 864e5),
        hours:   pad(Math.floor((diff % 864e5) / 36e5)),
        mins:    pad(Math.floor((diff % 36e5) / 6e4)),
        secs:    pad(Math.floor((diff % 6e4) / 1e3)),
        expired: false,
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Home() {
  const cd = useCountdown()

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --orange:       #B95B37;
          --orange-dark:  #AC5B3C;
          --orange-light: #F5EAE4;
          --orange-mid:   #DFA080;
          --black:        #010205;
          --bg-primary:   #FAFAFA;
          --bg-secondary: #F3F3F3;
          --gray:         #878C91;
          --white:        #FFFFFF;
          --border:       rgba(1,2,5,0.10);
          --radius-sm:    8px;
          --radius-md:    12px;
          --radius-lg:    16px;
          --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font); color: var(--black); background: var(--bg-primary); line-height: 1.6; }

        .lp-nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 0.5px solid var(--border); position: sticky; top: 0; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); z-index: 100; }
        .lp-nav-logo { font-size: 16px; font-weight: 700; color: var(--black); letter-spacing: -0.02em; text-decoration: none; }
        .lp-nav-logo span { color: var(--orange); }
        .lp-nav-cta { background: var(--orange); color: var(--white); font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: var(--radius-sm); text-decoration: none; transition: background 0.15s; }
        .lp-nav-cta:hover { background: var(--orange-dark); }

        .lp-container { max-width: 720px; margin: 0 auto; padding: 0 1.5rem; }
        .lp-section { padding: 4rem 0; border-bottom: 0.5px solid var(--border); }
        .lp-section:last-of-type { border-bottom: none; }

        .lp-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 99px; }
        .lp-pill-orange { background: var(--orange-light); color: var(--orange-dark); }
        .lp-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--orange); flex-shrink: 0; }

        .lp-hero { background: var(--white); padding: 3.5rem 0 3rem; border-bottom: 0.5px solid var(--border); }
        .lp-hero-h1 { font-size: clamp(26px, 5vw, 38px); font-weight: 700; line-height: 1.18; letter-spacing: -0.025em; margin-bottom: 1rem; color: var(--black); }
        .lp-hero-h1 .ai { color: var(--orange); }
        .lp-hero-sub { font-size: 17px; color: var(--gray); line-height: 1.65; margin-bottom: 1.75rem; max-width: 580px; }
        .lp-cta-primary { display: inline-block; background: var(--orange); color: var(--white); font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: var(--radius-sm); text-decoration: none; transition: background 0.15s; }
        .lp-cta-primary:hover { background: var(--orange-dark); }
        .lp-cta-note { font-size: 12px; color: var(--gray); margin-top: 8px; }

        .lp-section-heading { font-size: clamp(20px, 4vw, 28px); font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 1.25rem; color: var(--black); }
        .lp-pain-list { list-style: none; margin-bottom: 1.5rem; }
        .lp-pain-list li { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 0.5px solid var(--border); font-size: 15px; color: var(--gray); }
        .lp-pain-list li:last-child { border-bottom: none; }
        .lp-x-badge { width: 20px; height: 20px; border-radius: 50%; background: rgba(185,91,55,0.12); color: var(--orange); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .lp-pain-conclusion { background: var(--white); border-left: 3px solid var(--orange); padding: 14px 18px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 15px; color: var(--gray); line-height: 1.6; }
        .lp-pain-conclusion strong { color: var(--black); font-weight: 600; }

        .lp-how-intro { font-size: 15px; color: var(--gray); margin-bottom: 2rem; line-height: 1.65; }
        .lp-step { display: flex; gap: 16px; }
        .lp-step-left { display: flex; flex-direction: column; align-items: center; }
        .lp-step-num { width: 32px; height: 32px; border-radius: 50%; background: var(--orange-light); color: var(--orange); font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lp-step-line { width: 1px; flex: 1; background: var(--border); margin: 4px 0; min-height: 24px; }
        .lp-step:last-child .lp-step-line { display: none; }
        .lp-step-content { padding-bottom: 24px; flex: 1; }
        .lp-step-title { font-size: 15px; font-weight: 700; color: var(--black); margin-bottom: 4px; }
        .lp-step-body { font-size: 14px; color: var(--gray); line-height: 1.55; }

        .lp-outcome-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
        .lp-outcome-card { background: var(--white); border: 0.5px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; }
        .lp-outcome-num { font-size: 34px; font-weight: 700; color: var(--orange); margin-bottom: 4px; letter-spacing: -0.02em; }
        .lp-outcome-label { font-size: 13px; color: var(--gray); line-height: 1.45; }
        .lp-outcome-footnote { font-size: 11px; color: var(--gray); margin-top: 12px; opacity: 0.7; }

        .lp-proof-placeholder { border: 1.5px dashed var(--border); border-radius: var(--radius-md); padding: 2rem; text-align: center; color: var(--gray); font-size: 13px; }

        .lp-faq-item { border-bottom: 0.5px solid var(--border); }
        .lp-faq-item:first-child { border-top: 0.5px solid var(--border); }
        .lp-faq-item details { padding: 1rem 0; }
        .lp-faq-item details summary { font-size: 15px; font-weight: 600; color: var(--black); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .lp-faq-item details summary::-webkit-details-marker { display: none; }
        .lp-faq-item details summary::after { content: '+'; font-size: 22px; font-weight: 300; color: var(--gray); flex-shrink: 0; line-height: 1; }
        .lp-faq-item details[open] summary::after { content: '−'; color: var(--orange); }
        .lp-faq-item details[open] summary { color: var(--orange); }
        .lp-faq-item details p { font-size: 14px; color: var(--gray); line-height: 1.65; margin-top: 8px; }

        .lp-cd-section { background: var(--black); padding: 4rem 0; }
        .lp-cd-label { font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 1rem; letter-spacing: 0.06em; text-transform: uppercase; text-align: center; }
        .lp-cd-timer { display: flex; justify-content: center; align-items: flex-start; gap: 8px; margin-bottom: 2rem; }
        .lp-cd-unit { text-align: center; min-width: 72px; }
        .lp-cd-num { font-size: 52px; font-weight: 700; color: var(--white); line-height: 1; letter-spacing: -0.04em; display: block; }
        .lp-cd-unit-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .lp-cd-sep { font-size: 44px; font-weight: 300; color: rgba(255,255,255,0.2); padding-top: 4px; }
        .lp-cd-inner { text-align: center; }
        .lp-cd-heading { font-size: clamp(20px, 4vw, 28px); font-weight: 700; letter-spacing: -0.02em; color: var(--white); margin-bottom: 0.75rem; }
        .lp-cd-sub { font-size: 16px; color: rgba(255,255,255,0.55); line-height: 1.65; margin-bottom: 2rem; max-width: 520px; margin-left: auto; margin-right: auto; }
        .lp-cta-inverted { display: inline-block; background: var(--orange); color: var(--white); font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: var(--radius-sm); text-decoration: none; transition: background 0.15s; }
        .lp-cta-inverted:hover { background: var(--orange-dark); }
        .lp-cd-note { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 10px; }

        .lp-wa-strip { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); padding: 14px 18px; margin-top: 16px; text-align: left; }
        .lp-wa-icon { width: 36px; height: 36px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lp-wa-text { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.45; }
        .lp-wa-text a { color: var(--white); font-weight: 600; text-decoration: none; }

        .lp-footer { background: var(--white); padding: 2rem 0; border-top: 0.5px solid var(--border); }
        .lp-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .lp-footer-logo { font-size: 15px; font-weight: 700; color: var(--black); }
        .lp-footer-logo span { color: var(--orange); }
        .lp-footer-links { font-size: 13px; color: var(--gray); }
        .lp-footer-links a { color: var(--gray); text-decoration: none; margin-left: 16px; }
        .lp-footer-links a:hover { color: var(--orange); }
        .df { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        @media (max-width: 520px) {
          .lp-nav { padding: 1rem; }
          .lp-container { padding: 0 1rem; }
          .lp-cd-num { font-size: 38px; }
          .lp-cd-unit { min-width: 52px; }
          .lp-footer-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <a href="/" className="lp-nav-logo">Projetista<span>.AI</span></a>
        <a href="#countdown" className="lp-nav-cta">Agendar demonstração</a>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-pill lp-pill-orange" style={{ marginBottom: '1.25rem' }}>
            <span className="lp-pill-dot" />
            Plano Safra 2026 — encerra 30 de junho
          </div>
          <h1 className="lp-hero-h1">
            Feche 2x mais clientes<br />
            neste Plano Safra — com<br />
            <span className="ai">IA</span> cuidando de toda<br />
            a burocracia por você
          </h1>
          <p className="lp-hero-sub">
            Nossa IA lê os documentos do produtor, preenche os formulários do banco e organiza tudo automaticamente — enquanto você fica no campo fechando projetos.
          </p>
          <a href="#countdown" className="lp-cta-primary">Agendar demonstração gratuita</a>
          <p className="lp-cta-note">Sem compromisso · demonstração de 30 minutos · resposta em até 24h</p>
        </div>
      </section>

      {/* ── Pain ── */}
      <section className="lp-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="lp-container">
          <h2 className="lp-section-heading">
            O Plano Safra tem prazo.<br />Burocracia não deveria ser<br />o que te impede de aproveitá-lo.
          </h2>
          <ul className="lp-pain-list">
            {[
              'Semanas preenchendo os mesmos formulários para bancos diferentes',
              'Correndo atrás de documentos e informações dos produtores',
              'Horas em tarefas administrativas que te afastam do campo',
              'Capacidade limitada de atender novos projetos no pico da safra',
            ].map((text, i) => (
              <li key={i}>
                <span className="lp-x-badge">✕</span>
                {text}
              </li>
            ))}
          </ul>
          <div className="lp-pain-conclusion">
            Resultado: você chega no 30 de junho com <strong>menos projetos fechados do que poderia</strong> — não por falta de clientes, mas por falta de tempo.
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section" style={{ background: 'var(--white)' }}>
        <div className="lp-container">
          <div className="lp-pill lp-pill-orange" style={{ marginBottom: '1rem' }}>Como a IA funciona</div>
          <h2 className="lp-section-heading">Seu back-office automatizado,<br />do documento ao banco</h2>
          <p className="lp-how-intro">A plataforma conecta os documentos do produtor diretamente aos formulários bancários — sem você precisar tocar em nada.</p>
          <div>
            {[
              { title: 'Coleta inteligente de documentos', body: 'A IA identifica quais documentos são necessários para cada banco e programa, e orienta o produtor a enviar pelo celular — sem precisar de você no meio.' },
              { title: 'Leitura e extração automática',    body: 'A IA lê cada documento, extrai as informações relevantes e organiza tudo no formato exato que cada banco exige.' },
              { title: 'Preenchimento de formulários bancários', body: 'Os formulários do Banco do Brasil, Sicredi, e outros são preenchidos automaticamente — múltiplos bancos em paralelo, no tempo que levaria para preencher um.' },
              { title: 'Você revisa e assina',             body: 'Você mantém controle total. Revisa, corrige se necessário, e assina. A responsabilidade técnica e o relacionamento com o cliente continuam sendo seus — sempre.' },
            ].map((step, i) => (
              <div className="lp-step" key={i}>
                <div className="lp-step-left">
                  <div className="lp-step-num">{i + 1}</div>
                  <div className="lp-step-line" />
                </div>
                <div className="lp-step-content">
                  <p className="lp-step-title">{step.title}</p>
                  <p className="lp-step-body">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Swim-lane diagram ── */}
      <section className="lp-section" style={{ background: 'var(--bg-secondary)', padding: '3rem 0' }}>
        <div className="lp-container">
          {/* Actor pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            {[
              { label: 'Produtor',        bg: '#fff',     color: '#555',    dot: '#878C91', border: 'rgba(0,0,0,0.1)' },
              { label: 'IA Projetista.AI', bg: '#F5EAE4', color: '#993D1F', dot: '#B95B37', border: '#DDA070' },
              { label: 'Você',            bg: '#010205',  color: '#fff',    dot: '#fff',    border: 'transparent' },
              { label: 'Banco',           bg: '#fff',     color: '#555',    dot: '#878C91', border: 'rgba(0,0,0,0.1)' },
            ].map((a, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '99px', background: a.bg, color: a.color, border: `0.5px solid ${a.border}` }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: a.dot, display: 'inline-block', flexShrink: 0 }} />
                  {a.label}
                </span>
              </div>
            ))}
          </div>

          <svg width="100%" viewBox="0 0 680 440" style={{ display: 'block' }}>
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            <line x1="170" y1="0" x2="170" y2="400" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <line x1="340" y1="0" x2="340" y2="400" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <line x1="510" y1="0" x2="510" y2="400" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />

            {/* Step 1 — Produtor */}
            <rect x="20" y="20" width="140" height="72" rx="8" fill="#fff" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
            <text className="df" fontSize="10" fontWeight="700" fill="#878C91" x="90" y="34" textAnchor="middle" dominantBaseline="central">1</text>
            <text className="df" fontSize="13" fontWeight="600" fill="#1A1A18" x="90" y="50" textAnchor="middle" dominantBaseline="central">Envia documentos</text>
            <text className="df" fontSize="11" fill="#878C91" x="90" y="70" textAnchor="middle" dominantBaseline="central">Pelo celular, via link</text>

            <line x1="160" y1="56" x2="198" y2="56" stroke="#B95B37" strokeWidth="1.5" markerEnd="url(#arr)" />
            <text className="df" fontSize="10" fill="#B95B37" x="179" y="47" textAnchor="middle">docs</text>

            {/* Step 2 — AI: Lê */}
            <rect x="200" y="20" width="136" height="72" rx="8" fill="#F5EAE4" stroke="#C96040" strokeWidth="0.5" />
            <text className="df" fontSize="10" fontWeight="700" fill="#B95B37" x="268" y="34" textAnchor="middle" dominantBaseline="central">2</text>
            <text className="df" fontSize="13" fontWeight="600" fill="#993D1F" x="268" y="50" textAnchor="middle" dominantBaseline="central">Lê e extrai dados</text>
            <text className="df" fontSize="11" fill="#878C91" x="268" y="70" textAnchor="middle" dominantBaseline="central">OCR + classificação</text>

            <line x1="268" y1="92" x2="268" y2="128" stroke="#B95B37" strokeWidth="1.5" markerEnd="url(#arr)" />

            {/* Step 3 — AI: Preenche */}
            <rect x="200" y="132" width="136" height="72" rx="8" fill="#F5EAE4" stroke="#C96040" strokeWidth="0.5" />
            <text className="df" fontSize="10" fontWeight="700" fill="#B95B37" x="268" y="146" textAnchor="middle" dominantBaseline="central">3</text>
            <text className="df" fontSize="13" fontWeight="600" fill="#993D1F" x="268" y="162" textAnchor="middle" dominantBaseline="central">Preenche formulários</text>
            <text className="df" fontSize="11" fill="#878C91" x="268" y="182" textAnchor="middle" dominantBaseline="central">BB, Sicredi, outros</text>

            <line x1="268" y1="204" x2="268" y2="240" stroke="#B95B37" strokeWidth="1.5" markerEnd="url(#arr)" />

            {/* Step 4 — AI: Organiza */}
            <rect x="200" y="244" width="136" height="72" rx="8" fill="#F5EAE4" stroke="#C96040" strokeWidth="0.5" />
            <text className="df" fontSize="10" fontWeight="700" fill="#B95B37" x="268" y="258" textAnchor="middle" dominantBaseline="central">4</text>
            <text className="df" fontSize="13" fontWeight="600" fill="#993D1F" x="268" y="274" textAnchor="middle" dominantBaseline="central">Organiza dossiê</text>
            <text className="df" fontSize="11" fill="#878C91" x="268" y="294" textAnchor="middle" dominantBaseline="central">Pronto para revisão</text>

            <line x1="336" y1="280" x2="372" y2="280" stroke="rgba(0,0,0,0.20)" strokeWidth="1.5" markerEnd="url(#arr)" />
            <text className="df" fontSize="10" fill="#878C91" x="354" y="270" textAnchor="middle">revisa</text>

            {/* Step 5 — Você */}
            <rect x="376" y="244" width="130" height="72" rx="8" fill="#fff" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
            <text className="df" fontSize="10" fontWeight="700" fill="#878C91" x="441" y="258" textAnchor="middle" dominantBaseline="central">5</text>
            <text className="df" fontSize="13" fontWeight="600" fill="#1A1A18" x="441" y="274" textAnchor="middle" dominantBaseline="central">Revisa e aprova</text>
            <text className="df" fontSize="11" fill="#878C91" x="441" y="294" textAnchor="middle" dominantBaseline="central">Controle total seu</text>

            <line x1="506" y1="280" x2="662" y2="280" stroke="rgba(0,0,0,0.20)" strokeWidth="1.5" />
            <text className="df" fontSize="10" fill="#878C91" x="524" y="270" textAnchor="middle">envia</text>

            {/* Step 6 — Banco */}
            <rect x="546" y="244" width="116" height="72" rx="8" fill="#fff" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
            <text className="df" fontSize="10" fontWeight="700" fill="#878C91" x="604" y="258" textAnchor="middle" dominantBaseline="central">6</text>
            <text className="df" fontSize="13" fontWeight="600" fill="#1A1A18" x="604" y="274" textAnchor="middle" dominantBaseline="central">Banco recebe</text>
            <text className="df" fontSize="11" fill="#878C91" x="604" y="294" textAnchor="middle" dominantBaseline="central">Análise de crédito</text>
            <line x1="544" y1="280" x2="548" y2="280" stroke="rgba(0,0,0,0.20)" strokeWidth="1.5" markerEnd="url(#arr)" />

            <line x1="604" y1="316" x2="604" y2="348" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
            <line x1="604" y1="348" x2="496" y2="356" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" markerEnd="url(#arr)" />

            {/* Outcome */}
            <rect x="200" y="356" width="290" height="58" rx="8" fill="#010205" stroke="#010205" strokeWidth="1" />
            <text className="df" fontSize="14" fontWeight="700" fill="#fff" x="345" y="376" textAnchor="middle" dominantBaseline="central">Crédito aprovado</text>
            <text className="df" fontSize="11" fill="#B95B37" x="345" y="396" textAnchor="middle" dominantBaseline="central">Você fechou mais um projeto</text>

            {/* Legend */}
            <rect x="20" y="418" width="12" height="12" rx="2" fill="#F5EAE4" stroke="#C96040" strokeWidth="1" />
            <text className="df" fontSize="11" fill="#878C91" x="38" y="424" dominantBaseline="central">IA automatiza</text>
            <rect x="160" y="418" width="12" height="12" rx="2" fill="#fff" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <text className="df" fontSize="11" fill="#878C91" x="178" y="424" dominantBaseline="central">Você / Produtor / Banco</text>
            <rect x="370" y="418" width="12" height="12" rx="2" fill="#010205" />
            <text className="df" fontSize="11" fill="#878C91" x="388" y="424" dominantBaseline="central">Resultado</text>
          </svg>
        </div>
      </section>

      {/* ── Outcomes ── */}
      <section className="lp-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="lp-container">
          <h2 className="lp-section-heading">O que muda na prática</h2>
          <div className="lp-outcome-grid">
            {[
              { num: '−80%',   label: 'Tempo gasto por dossiê de crédito rural' },
              { num: '2×',     label: 'Capacidade de atender projetos no mesmo período' },
              { num: '0',      label: 'Contratações necessárias para escalar' },
              { num: '+campo', label: 'Mais tempo com produtores, menos no escritório' },
            ].map((o, i) => (
              <div className="lp-outcome-card" key={i}>
                <p className="lp-outcome-num">{o.num}</p>
                <p className="lp-outcome-label">{o.label}</p>
              </div>
            ))}
          </div>
          <p className="lp-outcome-footnote">Estimativas baseadas em testes com projetistas parceiros. Resultados variam conforme volume e complexidade dos projetos.</p>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="lp-section" style={{ background: 'var(--white)' }}>
        <div className="lp-container">
          <h2 className="lp-section-heading" style={{ marginBottom: '1.5rem' }}>O que projetistas que testaram dizem</h2>
          <div className="lp-proof-placeholder">
            Adicionar depoimento real aqui — nome, foto, cidade, tipo de projeto.<br />
            Um print de WhatsApp ou vídeo de 30 segundos funciona perfeitamente.
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="lp-container">
          <h2 className="lp-section-heading" style={{ marginBottom: '1.5rem' }}>Perguntas frequentes</h2>
          {[
            { q: 'Isso é seguro e aceito pelos bancos?', a: 'Sim. A plataforma prepara e organiza os documentos — o envio e a validação final continuam sendo feitos por você, exatamente como hoje. Os bancos recebem os mesmos formulários preenchidos corretamente, só que em muito menos tempo.' },
            { q: 'Funciona com Pronaf e outros programas além do Plano Safra?', a: 'Sim. A plataforma foi construída para os principais programas de crédito rural — Pronaf, Pronamp, e linhas de investimento do Banco do Brasil, Sicredi e cooperativas parceiras.' },
            { q: 'Se algo estiver errado no preenchimento, quem é responsável?', a: 'Você sempre revisa antes de qualquer envio. A responsabilidade técnica é, e continua sendo, do projetista. Nossa IA elimina o trabalho manual — não substitui seu julgamento profissional.' },
            { q: 'Qual é o preço?', a: 'Estamos em fase de lançamento e definindo os planos com base no feedback dos primeiros usuários. Quem entrar agora terá condições especiais mantidas enquanto usar a plataforma. Fale com a gente para saber mais.' },
            { q: 'Preciso instalar alguma coisa ou é tudo online?', a: 'Tudo online. Você acessa pelo navegador, sem instalação. Os produtores enviam os documentos pelo celular via link — sem precisar baixar nada.' },
          ].map((item, i) => (
            <div className="lp-faq-item" key={i}>
              <details>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* ── Countdown / CTA ── */}
      <section className="lp-cd-section" id="countdown">
        <div className="lp-container">
          <div className="lp-cd-inner">
            <p className="lp-cd-label">Plano Safra 2026 — encerra em 30 de junho</p>

            {cd.expired ? (
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: '2rem' }}>
                Plano Safra 2026 encerrado — próxima janela em outubro.
              </p>
            ) : (
              <div className="lp-cd-timer">
                <div className="lp-cd-unit">
                  <span className="lp-cd-num">{cd.days}</span>
                  <span className="lp-cd-unit-label">dias</span>
                </div>
                <span className="lp-cd-sep">:</span>
                <div className="lp-cd-unit">
                  <span className="lp-cd-num">{cd.hours}</span>
                  <span className="lp-cd-unit-label">horas</span>
                </div>
                <span className="lp-cd-sep">:</span>
                <div className="lp-cd-unit">
                  <span className="lp-cd-num">{cd.mins}</span>
                  <span className="lp-cd-unit-label">min</span>
                </div>
                <span className="lp-cd-sep">:</span>
                <div className="lp-cd-unit">
                  <span className="lp-cd-num">{cd.secs}</span>
                  <span className="lp-cd-unit-label">seg</span>
                </div>
              </div>
            )}

            <h2 className="lp-cd-heading">Ainda dá tempo de virar esse Plano Safra</h2>
            <p className="lp-cd-sub">Cada semana que passa é uma semana a menos para fechar projetos. Agende uma demonstração gratuita e veja como a IA pode liberar seu tempo antes do prazo.</p>
            <a href="https://calendly.com/SEU-LINK-AQUI" className="lp-cta-inverted" target="_blank" rel="noopener noreferrer">
              Agendar demonstração gratuita
            </a>
            <p className="lp-cd-note">Sem compromisso · demonstração de 30 minutos · resposta em até 24h</p>

            <div className="lp-wa-strip">
              <div className="lp-wa-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <p className="lp-wa-text">
                Prefere falar antes de agendar?{' '}
                <a href="https://wa.me/55SEUNUMEROAQUI?text=Ol%C3%A1%2C+quero+saber+mais+sobre+o+Projetista.AI" target="_blank" rel="noopener noreferrer">
                  Manda uma mensagem no WhatsApp
                </a>{' '}
                — respondemos na hora.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <span className="lp-footer-logo">Projetista<span>.AI</span></span>
            <div className="lp-footer-links">
              <a href="mailto:hello@amsel-ara.com">hello@amsel-ara.com</a>
              <a href="https://amsel-ara.com" target="_blank" rel="noopener noreferrer">amsel-ara.com</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
