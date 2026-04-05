export default function Home() {
  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        :root{--orange:#B95B37;--orange-dark:#ac5b3c;--black:#010205;--gray:#878c91;--bg:#fafafa;--bg2:#f3f3f3;--white:#fff;--px:80px;}
        body{font-family:'Plus Jakarta Sans','Trebuchet MS',ui-sans-serif,sans-serif;background:var(--bg);color:var(--black);overflow-x:hidden;}
        a{text-decoration:none;color:inherit;}
        nav{background:var(--white);display:flex;align-items:center;justify-content:space-between;padding:18px var(--px);position:sticky;top:0;z-index:100;box-shadow:0 1px 0 #eee;}
        .nav-logo{font-family:'Manrope','Trebuchet MS',sans-serif;font-weight:700;font-size:22px;letter-spacing:-1.2px;white-space:nowrap;}
        .btn-nav{background:var(--white);color:var(--black);border:2px solid var(--black);border-radius:50px;padding:11px 22px;font-family:'Manrope','Trebuchet MS',sans-serif;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;}
        .btn-primary{background:var(--orange);color:var(--white);border:none;border-radius:70px;padding:16px 28px;font-size:15px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;letter-spacing:-0.3px;}
        .btn-outline{border:1.5px solid var(--black);border-radius:50px;padding:14px 22px;font-family:'Manrope','Trebuchet MS',sans-serif;font-weight:700;font-size:14px;cursor:pointer;background:none;white-space:nowrap;}
        .btn-dark{background:var(--black);color:var(--white);border:none;border-radius:70px;padding:16px 28px;font-size:15px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;}
        .hero{background:var(--white);padding:80px var(--px);display:flex;align-items:center;justify-content:space-between;gap:40px;flex-wrap:wrap;}
        .hero-left{flex:1;min-width:280px;}
        .hero h1{font-size:54px;font-weight:700;line-height:1.1;letter-spacing:-2px;margin-bottom:32px;}
        .hero-sub{font-size:24px;font-weight:500;color:var(--gray);line-height:1.5;margin-bottom:40px;}
        .hero-card{background:var(--white);border-radius:20px;padding:24px 28px;width:420px;max-width:100%;box-shadow:0 4px 40px rgba(0,0,0,0.08);flex-shrink:0;}
        .hero-card p{font-size:15px;font-weight:500;line-height:1.5;color:var(--black);margin-bottom:20px;}
        .hero-card-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .hero-card-actions .tag{font-size:12px;font-weight:500;color:var(--gray);}
        .arrow-btn{border:1px solid var(--gray);border-radius:70px;width:48px;height:40px;display:flex;align-items:center;justify-content:center;margin-left:auto;}
        .problem{background:var(--bg);padding:70px var(--px);}
        .problem .highlight{font-size:26px;font-weight:800;color:var(--orange);line-height:1.6;letter-spacing:-0.8px;}
        .problem .lead{font-size:24px;font-weight:600;color:var(--black);line-height:1.6;letter-spacing:-0.8px;margin-bottom:20px;}
        .problem ul{list-style:none;font-size:18px;font-weight:400;color:var(--black);line-height:2;}
        .result-banner{background:var(--bg);padding:40px var(--px);border-top:1px solid #eee;border-bottom:1px solid #eee;}
        .result-banner p{font-size:22px;font-weight:700;letter-spacing:-0.8px;line-height:1.4;}
        .solution{background:var(--bg2);padding:50px 20px;}
        .solution-card{background:var(--white);border-radius:60px;padding:60px 60px;}
        .solution-card h2{font-size:34px;font-weight:600;color:var(--orange);letter-spacing:-1px;line-height:1.3;max-width:820px;margin-bottom:16px;}
        .solution-card .sub{font-size:20px;font-weight:500;color:var(--gray);line-height:1.8;margin-bottom:50px;}
        .solution-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px 40px;}
        .sol-item h3{font-size:20px;font-weight:800;color:var(--orange);letter-spacing:-0.5px;margin-bottom:8px;}
        .sol-item p{font-size:16px;font-weight:400;color:var(--black);line-height:1.4;}
        .emphasis{background:var(--bg);padding:52px var(--px);}
        .emphasis p{font-size:24px;font-weight:700;color:var(--orange);letter-spacing:-0.8px;line-height:1.5;}
        .transform{background:var(--bg);padding:70px var(--px);}
        .transform-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;gap:20px;flex-wrap:wrap;}
        .transform-top h2{font-size:34px;font-weight:600;color:var(--orange);letter-spacing:-1px;line-height:1.3;}
        .cards-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .benefit-card{background:var(--white);border-radius:20px;padding:28px;}
        .benefit-card h3{font-size:18px;font-weight:600;letter-spacing:-0.5px;margin-bottom:12px;}
        .benefit-card p{font-size:15px;font-weight:500;color:var(--gray);line-height:1.6;}
        .credibility{background:var(--bg);padding:60px var(--px);text-align:center;}
        .credibility h2{font-size:24px;font-weight:700;color:var(--orange);letter-spacing:-0.8px;margin-bottom:24px;}
        .credibility blockquote{font-size:22px;font-weight:500;color:var(--black);letter-spacing:-0.8px;line-height:1.5;max-width:860px;margin:0 auto;}
        .early{background:var(--bg);padding:70px var(--px);}
        .early h2{font-size:34px;font-weight:600;color:var(--orange);letter-spacing:-1px;line-height:1.3;max-width:600px;margin-bottom:20px;}
        .early .desc{font-size:15px;font-weight:500;color:var(--gray);line-height:1.8;max-width:500px;margin-bottom:40px;}
        .early-grid{display:grid;grid-template-columns:1.7fr 1fr;gap:20px;}
        .early-list{background:rgba(0,0,0,0.12);border-radius:30px;padding:40px 44px;}
        .early-list ul{list-style:none;font-size:17px;font-weight:600;color:var(--black);line-height:1.8;letter-spacing:-0.5px;}
        .early-spots{background:var(--orange-dark);border-radius:30px;padding:40px;display:flex;align-items:center;justify-content:center;}
        .early-spots p{font-size:24px;font-weight:700;color:var(--white);letter-spacing:-0.8px;line-height:1.5;}
        .cta-section{background:rgba(185,91,55,0.2);padding:80px var(--px);}
        .cta-section h2{font-size:34px;font-weight:600;color:var(--black);letter-spacing:-1px;line-height:1.3;max-width:520px;margin-bottom:40px;}
        footer{background:var(--bg);padding:60px var(--px);display:flex;justify-content:space-between;flex-wrap:wrap;gap:40px;}
        .footer-brand .logo{font-family:'Manrope','Trebuchet MS',sans-serif;font-weight:700;font-size:22px;letter-spacing:-1px;margin-bottom:20px;}
        .social-icons{display:flex;gap:10px;}
        .social-icon{width:34px;height:34px;background:var(--white);border-radius:60px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.1);}
        .footer-contact h4{font-family:'Roboto',sans-serif;font-weight:600;font-size:16px;color:#192031;margin-bottom:16px;}
        .footer-contact .contact-item{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;color:#9b9b9c;font-family:'Roboto',sans-serif;font-size:13px;}
        .footer-contact .contact-item svg{flex-shrink:0;margin-top:1px;}
        @media(max-width:900px){
          :root{--px:40px;}
          .hero{padding:60px var(--px);gap:40px;}.hero h1{font-size:40px;}.hero-sub{font-size:20px;}.hero-card{width:100%;}
          .solution-card{border-radius:40px;padding:40px 40px;}.solution-card h2{font-size:28px;}.solution-card .sub{font-size:18px;}
          .cards-row{grid-template-columns:1fr 1fr;}.early-grid{grid-template-columns:1fr;}.credibility blockquote{font-size:18px;}
        }
        @media(max-width:600px){
          :root{--px:20px;}
          nav{padding:14px var(--px);}.btn-nav{font-size:12px;padding:9px 14px;}.nav-logo{font-size:18px;}
          .hero{flex-direction:column;padding:40px var(--px);align-items:flex-start;}.hero h1{font-size:32px;letter-spacing:-1px;}.hero-sub{font-size:17px;}.hero-card{width:100%;padding:18px;}.btn-primary{font-size:14px;padding:14px 20px;}
          .problem{padding:40px var(--px);}.problem .highlight{font-size:20px;}.problem .lead{font-size:18px;}.problem ul{font-size:15px;line-height:1.9;}
          .result-banner{padding:30px var(--px);}.result-banner p{font-size:17px;}
          .solution{padding:30px 12px;}.solution-card{border-radius:28px;padding:28px 20px;}.solution-card h2{font-size:22px;}.solution-card .sub{font-size:15px;margin-bottom:32px;}.solution-grid{grid-template-columns:1fr;gap:36px;}.sol-item h3{font-size:17px;}.sol-item p{font-size:14px;}
          .emphasis{padding:36px var(--px);}.emphasis p{font-size:18px;}
          .transform{padding:40px var(--px);}.transform-top{flex-direction:column;align-items:flex-start;}.transform-top h2{font-size:26px;}.cards-row{grid-template-columns:1fr;gap:14px;}.benefit-card{padding:20px;}.benefit-card h3{font-size:16px;}.benefit-card p{font-size:14px;}
          .credibility{padding:40px var(--px);}.credibility h2{font-size:18px;}.credibility blockquote{font-size:16px;}
          .early{padding:40px var(--px);}.early h2{font-size:26px;}.early .desc{font-size:14px;}.early-grid{grid-template-columns:1fr;}.early-list{padding:28px 24px;}.early-list ul{font-size:14px;}.early-spots{padding:28px 24px;}.early-spots p{font-size:20px;}
          .cta-section{padding:40px var(--px);}.cta-section h2{font-size:24px;}.btn-dark{font-size:13px;padding:13px 18px;}
          footer{flex-direction:column;padding:40px var(--px);gap:32px;}
        }
      `}</style>

      <nav>
        <div className="nav-logo">Projetista.Ai</div>
        <a href="/login"><button className="btn-nav">Agende uma demonstração</button></a>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <h1>IA para projetistas rurais</h1>
          <p className="hero-sub">Automações que aceleram solicitações de crédito com os bancos.</p>
          <a href="/login"><button className="btn-primary">
            Agende uma demonstração
            <svg fill="white" width="20" height="20" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
          </button></a>
        </div>
        <div className="hero-card">
          <p>Pegar os documentos na pasta e preencher o formulário do Banco do Brasil</p>
          <div className="hero-card-actions">
            <svg width="22" height="22" fill="none" stroke="#737373" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            <svg width="22" height="22" fill="none" stroke="#737373" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M10 18h4"/></svg>
            <svg width="22" height="22" fill="none" stroke="#737373" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span className="tag">MY DATA</span>
            <div className="arrow-btn">
              <svg width="18" height="18" fill="none" stroke="#737373" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
            </div>
          </div>
        </div>
      </section>

      <section className="problem">
        <p className="highlight">Você Perde Tempo Demais com Burocracia!</p>
        <p className="lead">Projetistas rurais enfrentam os mesmos desafios todos os dias:</p>
        <ul>
          <li>✗ Semanas preenchendo formulários diferentes para cada banco</li>
          <li>✗ Correndo atrás de documentos e informações dos produtores</li>
          <li>✗ Tarefas administrativas que impedem você de focar nos clientes</li>
          <li>✗ Capacidade limitada de atender novos projetos</li>
        </ul>
      </section>

      <div className="result-banner">
        <p>Resultado: Você trabalha muito, mas não consegue escalar seu negócio.</p>
      </div>

      <section className="solution">
        <div className="solution-card">
          <h2>Imagine ter uma equipe de retaguarda cuidando de toda a papelada</h2>
          <p className="sub">Nossa plataforma IA funciona como seu back office dedicado:</p>
          <div className="solution-grid">
            <div className="sol-item">
              <div style={{position:'relative',height:'140px',marginBottom:'20px'}}>
                <div style={{position:'absolute',top:0,left:0,width:'220px',height:'110px',border:'2px solid var(--orange)',borderRadius:'18px'}}></div>
                <div style={{position:'absolute',top:'26px',left:'46px',width:'220px',height:'98px',border:'2px solid var(--orange)',borderRadius:'18px',background:'var(--bg2)'}}></div>
              </div>
              <h3>Coleta de Documentação</h3>
              <p>Auxiliamos na identificação e organização de todos os documentos necessários</p>
            </div>
            <div className="sol-item">
              <div style={{height:'140px',marginBottom:'20px',display:'flex',alignItems:'center'}}>
                <svg width="100%" viewBox="0 0 260 150" fill="none" style={{maxWidth:'260px'}}>
                  <rect x="1" y="1" width="258" height="148" rx="18" stroke="#B95B37" strokeWidth="1.5"/>
                  <rect x="18" y="24" width="44" height="26" rx="13" stroke="#B95B37" strokeWidth="1.5"/>
                  <circle cx="31" cy="37" r="9" stroke="#B95B37" strokeWidth="1.5"/>
                  <line x1="76" y1="37" x2="235" y2="37" stroke="#B95B37" strokeWidth="1.5" strokeLinecap="round"/>
                  <rect x="18" y="62" width="44" height="26" rx="13" fill="#7a4030" stroke="#B95B37" strokeWidth="1.5"/>
                  <circle cx="49" cy="75" r="9" fill="white"/>
                  <line x1="76" y1="75" x2="235" y2="75" stroke="#B95B37" strokeWidth="1.5" strokeLinecap="round"/>
                  <rect x="18" y="100" width="44" height="26" rx="13" stroke="#B95B37" strokeWidth="1.5"/>
                  <circle cx="31" cy="113" r="9" stroke="#B95B37" strokeWidth="1.5"/>
                  <line x1="76" y1="113" x2="235" y2="113" stroke="#B95B37" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Preenchimento Automatizado</h3>
              <p>Completamos formulários de múltiplos bancos simultaneamente</p>
            </div>
            <div className="sol-item">
              <div style={{height:'140px',marginBottom:'20px',display:'flex',alignItems:'center'}}>
                <div style={{width:'100%',maxWidth:'280px',height:'130px',border:'2px solid var(--orange)',borderRadius:'18px',padding:'10px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'1fr 1fr',gap:'8px'}}>
                  {[...Array(6)].map((_, i) => <div key={i} style={{border:'2px solid var(--orange)',borderRadius:'8px'}}></div>)}
                </div>
              </div>
              <h3>Gestão Administrativa</h3>
              <p>Cuidamos da papelada enquanto você mantém o controle e relacionamento com seus clientes</p>
            </div>
            <div className="sol-item">
              <div style={{height:'140px',marginBottom:'20px',display:'flex',alignItems:'center'}}>
                <svg width="130" height="130" viewBox="0 0 155 155" fill="none">
                  <circle cx="77.5" cy="77.5" r="70" stroke="#B95B37" strokeWidth="1.5"/>
                  <line x1="77.5" y1="77.5" x2="77.5" y2="36" stroke="#B95B37" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="77.5" y1="77.5" x2="104" y2="100" stroke="#B95B37" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Mais Capacidade</h3>
              <p>Atenda mais clientes no mesmo tempo</p>
            </div>
          </div>
        </div>
      </section>

      <div className="emphasis">
        <p>Você permanece responsável pelo processo e relacionamento com o cliente. Nós apenas eliminamos o trabalho operacional.</p>
      </div>

      <section className="transform">
        <div className="transform-top">
          <h2>Transforme sua Operação</h2>
          <a href="/login"><button className="btn-outline">Agende uma demonstração</button></a>
        </div>
        <div className="cards-row">
          <div className="benefit-card"><h3>Ganhe tempo</h3><p>Reduza de semanas para horas o tempo gasto em cada aplicação de crédito.</p></div>
          <div className="benefit-card"><h3>Foque no Estratégico</h3><p>Dedique seu tempo ao que realmente importa: consultoria e relacionamento com clientes.</p></div>
          <div className="benefit-card"><h3>Escale Seu Negócio</h3><p>Atenda mais clientes sem contratar mais pessoas ou trabalhar mais horas.</p></div>
        </div>
      </section>

      <section className="credibility">
        <h2>Desenvolvido Por Quem Entende o Setor</h2>
        <blockquote>&ldquo;Estamos construindo esta solução em parceria com projetistas rurais experientes para garantir que atende às necessidades reais do mercado.&rdquo;</blockquote>
      </section>

      <section className="early">
        <h2>Seja um dos primeiros</h2>
        <p className="desc">Estamos selecionando um grupo exclusivo de projetistas rurais para participar do nosso programa de lançamento.</p>
        <div className="early-grid">
          <div className="early-list">
            <ul>
              <li>✗ Acesso antecipado à plataforma</li>
              <li>✗ Preço especial vitalício</li>
              <li>✗ Suporte prioritário e personalizado</li>
              <li>✗ Sem compromisso - cancele quando quiser</li>
            </ul>
          </div>
          <div className="early-spots"><p>Apenas 20 vagas disponíveis</p></div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Cadastre-se agora para garantir sua vaga no programa Early Adopter</h2>
        <a href="/login"><button className="btn-dark">
          Quero fazer parte do lançamento
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
        </button></a>
      </section>

      <footer>
        <div className="footer-brand">
          <div className="logo">Projetista.Ai</div>
          <div className="social-icons">
            <div className="social-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="#010205"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg></div>
            <div className="social-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="#010205"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg></div>
            <div className="social-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#010205" strokeWidth="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></div>
            <div className="social-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#010205" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></div>
          </div>
        </div>
        <div className="footer-contact">
          <h4>Contato</h4>
          <div className="contact-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#B95B37"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            4930921066170
          </div>
          <div className="contact-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#B95B37"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            hello@amsel-ara.com
          </div>
          <div className="contact-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#B95B37"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            Av. Faria Lima 1739, São Paulo 01452-001
          </div>
        </div>
      </footer>
    </>
  )
}
