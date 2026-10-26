import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Headphones,
  Lightbulb,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Waves,
  X,
} from "lucide-react";

const blue = "#0B5CFF";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="logo-mark"><span /><span /><span /></div>
      <span className="text-[17px] font-extrabold tracking-[-0.06em] text-[#071A33]">CONSULT<span className="text-[#0B5CFF]">PRO</span></span>
    </div>
  );
}

function Button({ children, variant = "primary", onClick }: { children: React.ReactNode; variant?: "primary" | "ghost" | "dark"; onClick?: () => void }) {
  return <button onClick={onClick} className={`btn ${variant === "primary" ? "btn-primary" : variant === "dark" ? "btn-dark" : "btn-ghost"}`}>{children}<ArrowRight size={15} /></button>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow"><span className="eyebrow-dot" />{children}</div>;
}

function Waveform({ small = false }: { small?: boolean }) {
  const bars = [12, 21, 34, 17, 45, 27, 55, 39, 18, 33, 48, 23, 40, 18, 32, 50, 28, 16, 41, 25, 37, 19, 31, 13];
  return <div className={`waveform ${small ? "waveform-small" : ""}`}>{bars.map((height, i) => <span key={i} style={{ height: `${height}px`, animationDelay: `${i * 55}ms` }} />)}</div>;
}

function DigitalPractitioner() {
  return <div className="practitioner-wrap">
    <div className="halo halo-one" /><div className="halo halo-two" />
    <div className="particle particle-a" /><div className="particle particle-b" /><div className="particle particle-c" />
    <div className="practitioner-shadow" />
    <div className="digital-person">
      <div className="person-head"><div className="person-ear" /><div className="person-face"><span className="face-eye eye-one" /><span className="face-eye eye-two" /><span className="nose" /><span className="mouth" /></div><div className="hair" /></div>
      <div className="person-neck" />
      <div className="person-body"><div className="coat-line" /><div className="coat-pocket"><span /></div><div className="collar collar-left" /><div className="collar collar-right" /><div className="badge-pill">CP</div></div>
      <div className="person-arm arm-left" /><div className="person-arm arm-right" />
    </div>
    <div className="orbit orbit-a" /><div className="orbit orbit-b" />
    <div className="hero-wave"><Waveform /></div>
  </div>;
}

function ScoreRing({ score = 82, label = "Score" }: { score?: number; label?: string }) {
  return <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><div><strong>{score}</strong><small>{label}</small></div></div>;
}

const signalCards = [
  { icon: Waves, title: "Voix", text: "Le rythme, les pauses et les variations qui donnent du relief à l'échange.", tone: "blue" },
  { icon: MessageCircle, title: "Conversation", text: "Les questions, reformulations et marqueurs d'écoute qui structurent le dialogue.", tone: "cyan" },
  { icon: Activity, title: "Interaction", text: "Les signaux d'engagement et la qualité de la relation praticien–patient.", tone: "navy" },
  { icon: Sparkles, title: "Coaching", text: "Des recommandations personnalisées pour faire évoluer chaque consultation.", tone: "blue" },
];

const recommendations = [
  { icon: MessageCircle, title: "Communication", text: "Augmenter l'utilisation de questions ouvertes pendant la phase d'exploration.", action: "Préparer des questions ouvertes" },
  { icon: Waves, title: "Débit vocal", text: "Ralentir légèrement votre débit lors de l'introduction des questions importantes.", action: "Explorer le débit vocal" },
  { icon: RotateCcw, title: "Reformulation", text: "Utiliser davantage de reformulations pour confirmer que la préoccupation a été comprise.", action: "Voir des exemples" },
];

export default function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSignal, setActiveSignal] = useState(1);
  const [selectedPhrase, setSelectedPhrase] = useState("open");
  const [chatOpen, setChatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      document.documentElement.style.setProperty("--mouse-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${event.clientY}px`);
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 20); window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, []);

  return <main className="overflow-hidden bg-white text-[#111827]">
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}><div className="container-wide flex h-[76px] items-center justify-between"><Logo /><nav className="hidden items-center gap-8 lg:flex"><Link to="#accueil">Accueil</Link><Link to="#concept">Le concept</Link><Link to="#fonctionnement">Comment ça fonctionne</Link><Link to="#analyse">Analyse</Link><Link to="#coaching">Coaching</Link><Link to="#securite">Sécurité</Link></nav><div className="hidden items-center gap-5 lg:flex"><Link className="text-sm font-semibold text-[#071A33]" to="/login">Se connecter</Link><Link className="btn btn-primary" to="/login">Accéder à la plateforme <ArrowRight size={15} /></Link></div><button aria-label="Menu" className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>{menuOpen && <div className="mobile-menu"><Link to="#accueil" onClick={() => setMenuOpen(false)}>Accueil</Link><Link to="#concept" onClick={() => setMenuOpen(false)}>Le concept</Link><Link to="#fonctionnement" onClick={() => setMenuOpen(false)}>Comment ça fonctionne</Link><Link to="#analyse" onClick={() => setMenuOpen(false)}>Analyse</Link><Link to="#coaching" onClick={() => setMenuOpen(false)}>Coaching</Link><Link to="#securite" onClick={() => setMenuOpen(false)}>Sécurité</Link><Link className="btn btn-primary" to="/login">Accéder à la plateforme <ArrowRight size={15} /></Link></div>}</header>

    <section id="accueil" className="hero-section"><div className="hero-glow" /><div className="container-wide hero-grid"><div className="hero-copy animate-rise"><SectionLabel>AI-POWERED PRACTITIONER COACHING</SectionLabel><h1>Comprendre chaque conversation.<br /><em>Améliorer chaque consultation.</em></h1><p className="hero-lead">Consult Pro transforme les conversations entre praticien et patient en insights intelligents pour accompagner le praticien dans l'amélioration de sa communication.</p><div className="flex flex-wrap gap-3"><button className="btn btn-primary" onClick={() => document.querySelector("#concept")?.scrollIntoView({ behavior: "smooth" })}>Découvrir Consult Pro <ArrowRight size={15} /></button><Link className="btn btn-ghost" to="/login">Se connecter <ArrowRight size={15} /></Link></div><div className="trust-line"><ShieldCheck size={16} />Conçu pour les praticiens dentaires <span /> La décision humaine reste centrale</div></div><div className="hero-visual animate-fade"><DigitalPractitioner /><div className="float-card voice-card"><div className="float-card-head"><span className="status-dot" />Analyse vocale <b>Active</b></div><Waveform small /></div><div className="float-card score-card"><span>Communication</span><strong>82<span>/100</span></strong><div className="mini-bar"><i /></div></div><div className="float-card insight-card"><span className="mini-icon"><Sparkles size={13} /></span><div><small>Insight détecté</small><strong>Questions ouvertes</strong><b>72%</b></div></div><div className="float-card ai-card"><span className="ai-pulse"><BrainCircuit size={14} /></span>Analyse IA <span className="live-dot" /></div></div></div><div className="hero-bottom"><div><span>VOICE</span><i /><span>AI</span><i /><span>ANALYSIS</span><i /><span>INSIGHT</span><i /><span>COACHING</span></div><span className="scroll-hint">Défiler pour explorer <ChevronRight size={14} /></span></div></section>

    <section id="concept" className="section section-light"><div className="container-wide"><div className="section-heading centered"><SectionLabel>AU-DELÀ DE LA TRANSCRIPTION</SectionLabel><h2>Et si chaque conversation pouvait<br /><span>devenir une source d'apprentissage ?</span></h2><p>Une consultation ne se résume pas aux mots échangés. Le rythme, les pauses, les questions et la dynamique de l'échange deviennent des informations utiles au praticien.</p></div><div className="signal-grid">{signalCards.map(({ icon: Icon, title, text, tone }, index) => <button key={title} className={`signal-card ${activeSignal === index ? "active" : ""} tone-${tone}`} onMouseEnter={() => setActiveSignal(index)} onClick={() => setActiveSignal(index)}><div className="signal-top"><div className="icon-box"><Icon size={21} /></div><span>0{index + 1}</span></div><div className="signal-art">{index === 0 ? <Waveform /> : index === 1 ? <div className="conversation-art"><span /><span /><span /></div> : <div className="nodes-art"><i /><i /><i /></div>}</div><h3>{title}</h3><p>{text}</p><span className="learn-more">Explorer le signal <ArrowRight size={15} /></span></button>)}</div></div></section>

    <section id="fonctionnement" className="section method-section"><div className="container-wide"><div className="section-heading"><SectionLabel>UNE MÉTHODE CLAIRE</SectionLabel><h2>De la conversation<br /><span>à l'insight.</span></h2><p>Un flux simple et transparent pour faire émerger des pistes d'amélioration concrètes.</p></div><div className="method-pipeline">{[[Mic, "Audio", "La consultation est enregistrée."], [FileText, "Transcription", "La conversation devient du texte."], [UserRound, "Diarisation", "Le système distingue les voix."], [BrainCircuit, "Analyse IA", "Voix, discours et interaction sont analysés."], [BarChart3, "Insights", "Les données deviennent compréhensibles."], [Sparkles, "Coaching", "Des recommandations personnalisées."]].map(([Icon, title, description], index) => <div className="method-step" key={title as string}><div className="step-number">0{index + 1}</div><div className="step-icon"><Icon size={21} /></div><h3>{title as string}</h3><p>{description as string}</p>{index < 5 && <div className="step-connector"><span /></div>}</div>)}</div></div></section>

    <section id="analyse" className="section coaching-section"><div className="container-wide"><div className="section-heading centered"><SectionLabel>COACHING PERSONNALISÉ</SectionLabel><h2>Votre consultation.<br /><span>Vos insights. Votre progression.</span></h2></div><div className="coaching-shell"><div className="transcript-panel"><div className="panel-label"><span>TRANSCRIPTION</span><span className="panel-live"><i /> Analyse en cours</span></div><div className="transcript-meta"><div className="avatar-doc">DM</div><div><strong>Consultation #024</strong><span>Dr. Martin · 24 min 38 sec</span></div><MoreHorizontal size={18} /></div><div className="transcript-body"><div className="transcript-row"><span className="speaker">PATIENT</span><p>Depuis quelques semaines, j'ai une gêne quand je mâche de ce côté.</p></div><div className={`transcript-row highlighted ${selectedPhrase === "open" ? "selected" : ""}`} onMouseEnter={() => setSelectedPhrase("open")}><span className="speaker doctor">DOCTEUR</span><p>Depuis quand ressentez-vous <mark>cette gêne ?</mark></p><small>Question ouverte</small></div><div className="transcript-row"><span className="speaker">PATIENT</span><p>Depuis trois semaines environ, surtout le soir.</p></div><div className={`transcript-row highlighted ${selectedPhrase === "closed" ? "selected" : ""}`} onMouseEnter={() => setSelectedPhrase("closed")}><span className="speaker doctor">DOCTEUR</span><p>Est-ce que vous avez <mark>mal au froid ?</mark></p><small>Question fermée</small></div><div className="transcript-row"><span className="speaker">PATIENT</span><p>Un peu, oui. Mais c'est surtout quand je serre les dents.</p></div></div><div className="transcript-footer"><span><ScanLine size={14} /> 98% de confiance</span><span>Français (FR)</span></div></div><div className="ai-panel"><div className="panel-label"><span><span className="ai-pulse small"><Sparkles size={12} /></span> CONSULT PRO AI</span><span className="complete-label"><Check size={13} /> Analyse terminée</span></div><div className="ai-metrics"><div><span>Questions ouvertes</span><strong className={selectedPhrase === "open" ? "metric-active" : ""}>72%</strong><i><b style={{ width: "72%" }} /></i></div><div><span>Reformulation</span><strong>81%</strong><i><b style={{ width: "81%" }} /></i></div><div><span>Écoute active</span><strong>86%</strong><i><b style={{ width: "86%" }} /></i></div><div><span>Interruptions</span><strong>12</strong><i><b className="muted-bar" style={{ width: "32%" }} /></i></div></div><div className="coaching-insight"><div className="insight-title"><Sparkles size={14} /> INSIGHT DE COACHING</div><p>Votre consultation montre une bonne écoute active. Introduire davantage de questions ouvertes pourrait encourager le patient à préciser son expérience.</p></div><div className="suggested-question"><span>QUESTION SUGGÉRÉE</span><p>« Pouvez-vous me décrire plus précisément ce que vous ressentez ? »</p></div><button className="panel-action">Voir plus de recommandations <ArrowRight size={15} /></button></div></div></div></section>

    <section id="dashboard" className="section dashboard-section"><div className="container-wide"><div className="dashboard-intro"><div><SectionLabel>VUE D'ENSEMBLE</SectionLabel><h2>Un tableau de bord<br /><span>pensé pour la clarté.</span></h2><p>Retrouvez l'essentiel de chaque consultation, puis observez votre progression dans le temps.</p></div><button className="period-select">7 dernières consultations <ChevronRight size={15} /></button></div><div className="dashboard"><aside className="dash-side"><Logo /><div className="dash-nav"><span className="active"><BarChart3 size={16} />Dashboard</span><span><Headphones size={16} />Consultations</span><span><Sparkles size={16} />Insights</span><span><TrendingUp size={16} />Progression</span><span><CircleHelp size={16} />Ressources</span></div><div className="dash-side-bottom"><LockKeyhole size={15} /> Données sécurisées</div></aside><div className="dash-main"><div className="dash-top"><div><span>Bonjour, Dr. Martin</span><h3>Vos derniers insights sont prêts.</h3></div><div className="dash-user"><span className="notification-dot" /><div className="user-avatar">DM</div></div></div><div className="dash-grid"><div className="main-score-card"><div><span className="card-kicker">DERNIÈRE CONSULTATION</span><strong>Consultation #024</strong><small><Clock3 size={13} /> 24 min 38 sec <i /> <b>Analysée</b></small></div><ScoreRing /><span className="score-caption">Score de communication</span></div><div className="metrics-row">{[["Écoute active", "86%", "up"], ["Empathie", "78%", "up"], ["Questions ouvertes", "72%", "down"], ["Reformulation", "81%", "up"]].map(([label, value, trend]) => <div className="dash-metric" key={label}><span>{label}</span><strong>{value}</strong><small className={trend === "down" ? "neutral" : ""}><TrendingUp size={12} /> {trend === "down" ? "à travailler" : "+8%"}</small></div>)}</div><div className="evolution-card"><div className="chart-head"><div><span className="card-kicker">ÉVOLUTION PERSONNELLE</span><strong>Communication evolution</strong></div><span className="chart-period">Oct — Déc 2026 <ChevronRight size={13} /></span></div><div className="line-chart"><div className="chart-y"><span>100</span><span>80</span><span>60</span><span>40</span></div><svg viewBox="0 0 700 180" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={blue} stopOpacity=".18" /><stop offset="1" stopColor={blue} stopOpacity="0" /></linearGradient></defs><path d="M0 145 C40 136 58 130 95 132 S145 113 180 118 S232 92 270 105 S325 91 360 88 S410 96 445 76 S500 68 530 70 S580 48 610 54 S660 27 700 35 V180 H0Z" fill="url(#chartFill)" /><path d="M0 145 C40 136 58 130 95 132 S145 113 180 118 S232 92 270 105 S325 91 360 88 S410 96 445 76 S500 68 530 70 S580 48 610 54 S660 27 700 35" fill="none" stroke={blue} strokeWidth="3" strokeLinecap="round" /></svg><div className="chart-x"><span>Consult. 01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span></div></div></div><div className="strengths-card"><div><span className="card-kicker">VOS POINTS FORTS</span><strong>Ce qui fonctionne</strong></div>{["Explications claires", "Écoute active", "Reformulations pertinentes"].map(item => <span key={item}><Check size={14} />{item}</span>)}<div className="opportunities"><span className="card-kicker">AXES D'AMÉLIORATION</span>{["Poser plus de questions ouvertes", "Réduire les interruptions", "Ajuster le débit vocal"].map(item => <span key={item}><ArrowRight size={13} />{item}</span>)}</div></div></div></div></div></div></section>

    <section className="section vigilance-section"><div className="container-wide vigilance-grid"><div className="vigilance-copy"><SectionLabel>VIGILANCE SYSTÉMIQUE</SectionLabel><h2>Voir le tableau<br /><span>dans son ensemble.</span></h2><p>Un indicateur intégré pour soutenir votre vigilance et guider vos prochaines questions — jamais pour poser un diagnostic.</p><div className="disclaimer"><ShieldCheck size={17} /><span><strong>Indicateur non diagnostique.</strong><br />Destiné à soutenir la réflexion du praticien et son questionnement.</span></div></div><div className="vigilance-visual"><div className="radar-lines"><i /><i /><i /><i /></div><div className="vigilance-ring"><div><strong>72</strong><span>Score de<br />vigilance systémique</span></div></div><div className="dimension dim-one"><b>S1</b><span>Émotionnel</span><strong>82</strong></div><div className="dimension dim-two"><b>S2</b><span>Fonctionnel</span><strong>69</strong></div><div className="dimension dim-three"><b>S3</b><span>Systémique</span><strong>61</strong></div><div className="dimension dim-four"><b>S4</b><span>Relationnel</span><strong>76</strong></div></div></div></section>

    <section id="coaching" className="section recommendations-section"><div className="container-wide"><div className="section-heading centered"><SectionLabel>RECOMMANDATIONS ACTIONNABLES</SectionLabel><h2>L'intelligence qui<br /><span>devient action.</span></h2><p>Des suggestions simples, contextualisées et directement applicables à votre prochaine consultation.</p></div><div className="recommendation-grid">{recommendations.map(({ icon: Icon, title, text, action }, index) => <div className="recommendation-card" key={title}><div className="rec-top"><div className="icon-box"><Icon size={19} /></div><span>PRIORITÉ 0{index + 1}</span></div><h3>{title}</h3><p>{text}</p><div className="rec-action"><span>PROCHAINE ÉTAPE</span><strong>{action}</strong><button aria-label="Voir l'insight"><ArrowRight size={15} /></button></div></div>)}</div></div></section>

    <section className="section assistant-section"><div className="container-wide assistant-grid"><div><SectionLabel>VOTRE ASSISTANT DE COACHING</SectionLabel><h2>Posez une question<br /><span>à votre consultation.</span></h2><p>Explorez vos données en langage naturel et obtenez des pistes de réflexion contextualisées.</p><div className="assistant-points"><span><Check size={14} />Réponses basées sur votre consultation</span><span><Check size={14} />Pas de diagnostic automatisé</span></div></div><div className="chat-card"><div className="chat-head"><div className="ai-pulse"><Sparkles size={14} /></div><div><strong>Consult Pro AI</strong><span><i /> En ligne</span></div><MoreHorizontal size={18} /></div><div className="chat-message user-message">Pourquoi mon score de communication est-il plus bas cette fois-ci ?</div><div className="chat-message ai-message"><span className="chat-ai-icon"><Sparkles size={12} /></span><p>Votre score a principalement été influencé par un taux d'interruption plus élevé et moins de questions ouvertes pendant la phase d'exploration.</p></div><div className="chat-suggestion"><span>SUGGESTION</span><p>« Laissez davantage d'espace au patient pour décrire son expérience avant de passer aux questions ciblées. »</p></div><div className="chat-input" onClick={() => setChatOpen(!chatOpen)}><span>{chatOpen ? "Que souhaitez-vous explorer ?" : "Demander à Consult Pro..."}</span><Mic size={17} /><button aria-label="Envoyer"><ArrowRight size={15} /></button></div></div></div></section>

    <section id="securite" className="section ethics-section"><div className="container-wide"><div className="section-heading centered"><SectionLabel>CONFIANCE PAR CONCEPTION</SectionLabel><h2>L'IA avec<br /><span>des limites claires.</span></h2><p>Une technologie conçue pour assister les praticiens sans remplacer leur jugement clinique.</p></div><div className="ethics-grid">{[[LockKeyhole, "PRIVÉ", "Vos données de consultation sont traitées avec sécurité et confidentialité."], [ShieldCheck, "NON DIAGNOSTIQUE", "Consult Pro identifie des signaux et génère des recommandations. Il ne pose aucun diagnostic."], [UserRound, "DÉCISION HUMAINE", "Le praticien reste responsable de l'interprétation et des décisions cliniques."]].map(([Icon, title, text]) => <div className="ethics-card" key={title as string}><Icon size={22} /><span>{title as string}</span><p>{text as string}</p><div className="ethics-line" /></div>)}</div></div></section>

    <section className="progress-section"><div className="container-wide"><div className="progress-top"><div><SectionLabel>PROGRESSION PERSONNELLE</SectionLabel><h2>Améliorer la consultation,<br /><span>consultation après consultation.</span></h2></div><Button variant="dark">Voir ma progression</Button></div><div className="progress-layout"><div className="progress-bars">{[["Communication", "+12%", "72%"], ["Questions ouvertes", "+18%", "84%"], ["Reformulation", "+9%", "67%"], ["Interruptions", "-14%", "38%"]].map(([label, value, width]) => <div className="progress-item" key={label}><div><span>{label}</span><strong>{value}</strong></div><i><b style={{ width }} /></i></div>)}</div><div className="timeline"><span>VOTRE ÉVOLUTION</span><div className="timeline-line" />{[["01", "68", "12 OCT"], ["02", "72", "28 OCT"], ["03", "76", "14 NOV"], ["04", "82", "06 DÉC"]].map(([num, score, date], index) => <div className={`timeline-point ${index === 3 ? "current" : ""}`} key={num}><span>{date}</span><i /><strong>{score}</strong><small>Consultation {num}</small></div>)}</div></div></div></section>

    <section className="final-cta"><div className="cta-orb" /><div className="cta-wave"><Waveform /></div><div className="container-wide relative z-10 text-center"><SectionLabel>PRÊT À ÉCOUTER AUTREMENT ?</SectionLabel><h2>Transformez chaque conversation<br /><em>en opportunité de progresser.</em></h2><p>Comprenez votre communication. Découvrez des insights utiles. Construisez de meilleures consultations.</p><div className="flex justify-center gap-3"><Link className="btn btn-primary" to="/login">Accéder à Consult Pro <ArrowRight size={15} /></Link><Link className="btn btn-ghost" to="/login">Se connecter <ArrowRight size={15} /></Link></div></div></section>

    <footer className="site-footer"><div className="container-wide"><div className="footer-main"><div><Logo /><p>Le coaching praticien<br />augmenté par l'IA.</p></div><div className="footer-links"><div><span>PLATEFORME</span><Link to="#plateforme">Fonctionnalités</Link><Link to="#methode">Comment ça marche</Link><Link to="#insights">Insights</Link></div><div><span>RESSOURCES</span><Link to="#securite">Sécurité</Link><Link to="#">Confidentialité</Link><Link to="#">Contact</Link></div><div><span>NOUS SUIVRE</span><Link to="#">LinkedIn</Link><Link to="#">Newsletter</Link></div></div></div><div className="footer-bottom"><span>© 2026 Consult Pro. Tous droits réservés.</span><span>Consult Pro est une solution d'assistance et de coaching pour praticiens. Elle ne fournit pas de diagnostic médical.</span><span>Paris · France</span></div></div></footer>
  </main>;
}
