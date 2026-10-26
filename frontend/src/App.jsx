import { Activity, ArrowDown, ArrowRight, AudioLines, BarChart3, BrainCircuit, Check, Clock3, Lightbulb, LockKeyhole, MessageCircle, Mic2, RotateCcw, ShieldCheck, Sparkles, TrendingUp, UserRound, UsersRound, Waves } from "lucide-react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import { ConsultationsPage, DashboardPage, NewAnalysisPage, ProfilePage, ProgressPage, ResultsPage, SettingsPage } from "./pages/PractitionerPages";

function StartAnalysisLink({ className, children }) {
  const { user } = useAuth();
  return <Link className={className} to={user ? "/new-analysis" : "/login"}>{children}</Link>;
}

function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="consultpro-site">
      <header className="cp-header">
        <a className="cp-brand" href="#accueil" aria-label="ConsultPro, accueil">
          <span className="cp-brand-mark"><i /><i /><i /></span>
          <span>CONSULT<span>PRO</span></span>
        </a>
        <nav className="cp-nav" aria-label="Navigation principale">
          <a href="#fonctionnement">Fonctionnement</a>
          <a href="#analyse">Analyse</a>
          <a href="#securite">Confidentialité</a>
        </nav>
        <StartAnalysisLink className="cp-button cp-button-small">Analyser une consultation <ArrowRight size={15} /></StartAnalysisLink>
      </header>

      <main>
        <section className="cp-hero" id="accueil">
          <div className="cp-hero-glow" />
          <div className="cp-container cp-hero-grid">
            <div className="cp-hero-copy">
              <div className="cp-eyebrow"><span /> COACHING PRATICIEN AUGMENTÉ PAR L'IA</div>
              <h1>Chaque échange compte.<br /><em>Faites-en un levier.</em></h1>
              <p>Analysez les conversations de consultation pour mieux comprendre les dynamiques d'échange et identifier des pistes concrètes pour votre pratique.</p>
              <div className="cp-hero-actions">
                <StartAnalysisLink className="cp-button">Lancer une analyse <ArrowRight size={16} /></StartAnalysisLink>
                <a className="cp-text-link" href="#fonctionnement">Découvrir le fonctionnement <ArrowDown size={15} /></a>
              </div>
              <div className="cp-trust"><ShieldCheck size={16} /> Outil de coaching interne, sans diagnostic médical</div>
            </div>
            <div className="cp-hero-art" aria-hidden="true">
              <div className="cp-art-orbit cp-orbit-one" />
              <div className="cp-art-orbit cp-orbit-two" />
              <div className="cp-audio-core"><AudioLines size={58} strokeWidth={1.35} /><span>CONSULTATION<br />ANALYSÉE</span></div>
              <div className="cp-waveform">{[18, 30, 46, 27, 60, 37, 52, 25, 42, 63, 34, 48, 23, 56, 31, 45, 21, 39, 57, 28, 44].map((height, i) => <i key={i} style={{ height }} />)}</div>
              <div className="cp-float-note cp-note-one"><span><Mic2 size={15} /></span><div><small>TRANSCRIPTION</small><strong>Audio vers texte</strong></div></div>
              <div className="cp-float-note cp-note-two"><span><UsersRound size={15} /></span><div><small>ÉCHANGE</small><strong>Deux interlocuteurs</strong></div></div>
              <div className="cp-visual-caption"><span className="cp-live-dot" /> Analyse vocale <b>Prête</b></div>
            </div>
          </div>
          <a className="cp-scroll-cue" href="#fonctionnement">Explorer <ArrowDown size={14} /></a>
        </section>

        <section className="cp-section cp-concept" id="concept">
          <div className="cp-container">
            <div className="cp-section-heading cp-centered-heading">
              <div className="cp-eyebrow"><span /> AU-DELÀ DE LA TRANSCRIPTION</div>
              <h2>La consultation révèle<br /><em>plus que des mots.</em></h2>
              <p>La voix, la conversation et la relation offrent des repères complémentaires pour réfléchir à sa pratique.</p>
            </div>
            <div className="cp-concept-grid">
              <article className="cp-concept-card">
                <div className="cp-card-top"><span className="cp-card-icon"><Waves size={20} /></span><span>01</span></div>
                <div className="cp-card-art cp-mini-wave">{[16, 29, 42, 21, 35, 50, 27, 39, 18, 45, 30, 22].map((height, i) => <i key={i} style={{ height }} />)}</div>
                <h3>La voix</h3><p>Rythme, pauses et variations vocales comme contexte de l'échange.</p>
              </article>
              <article className="cp-concept-card">
                <div className="cp-card-top"><span className="cp-card-icon cp-icon-cyan"><MessageCircle size={19} /></span><span>02</span></div>
                <div className="cp-card-art cp-dialog-art"><i /><i /><i /></div>
                <h3>La conversation</h3><p>Questions, reformulations et répartition de la parole au fil du rendez-vous.</p>
              </article>
              <article className="cp-concept-card">
                <div className="cp-card-top"><span className="cp-card-icon cp-icon-ink"><Activity size={19} /></span><span>03</span></div>
                <div className="cp-card-art cp-insight-art"><i /><i /><i /><span><Sparkles size={16} /></span></div>
                <h3>Les pistes de coaching</h3><p>Des indicateurs pour soutenir l'analyse du praticien, sans automatiser son jugement.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="cp-section cp-process" id="fonctionnement">
          <div className="cp-container">
            <div className="cp-section-heading">
              <div className="cp-eyebrow"><span /> UN FLUX SIMPLE ET TRANSPARENT</div>
              <h2>De la conversation<br /><em>aux pistes de progression.</em></h2>
              <p>Un parcours conçu pour transformer un enregistrement en informations utiles au praticien.</p>
            </div>
            <div className="cp-steps">
              <article><span className="cp-step-number">01</span><div className="cp-step-icon"><Mic2 size={20} /></div><h3>Déposer l'audio</h3><p>Importez un enregistrement de consultation pris en charge.</p></article>
              <article><span className="cp-step-number">02</span><div className="cp-step-icon"><AudioLines size={20} /></div><h3>Transcrire et distinguer</h3><p>Le pipeline transcrit l'échange et regroupe les prises de parole.</p></article>
              <article><span className="cp-step-number">03</span><div className="cp-step-icon"><Activity size={20} /></div><h3>Analyser l'échange</h3><p>Les indicateurs portent sur le dialogue, le rythme et les interactions.</p></article>
              <article><span className="cp-step-number">04</span><div className="cp-step-icon"><Sparkles size={20} /></div><h3>Explorer le coaching</h3><p>Consultez les résultats et des pistes d'amélioration contextualisées.</p></article>
            </div>
          </div>
        </section>

        <section className="cp-section cp-analysis" id="analyse">
          <div className="cp-container">
            <div className="cp-analysis-heading">
              <div>
                <div className="cp-eyebrow"><span /> VOTRE ESPACE D'ANALYSE</div>
                <h2>Une consultation.<br /><em>Un regard neuf.</em></h2>
              </div>
              <p>Connectez-vous pour lancer une analyse et retrouver vos rapports dans votre espace praticien.</p>
            </div>
            <div className="cp-analysis-entry"><div className="cp-analysis-entry-icon"><LockKeyhole size={20} /></div><div><strong>Votre espace d'analyse</strong><span>Les consultations et rapports sont privés à votre compte.</span></div><StartAnalysisLink className="cp-button">{user ? "Ouvrir mon espace" : "Se connecter pour continuer"}<ArrowRight size={15} /></StartAnalysisLink></div>
          </div>
        </section>

        <section className="cp-section cp-overview" id="dashboard">
          <div className="cp-container">
            <div className="cp-overview-heading">
              <div><div className="cp-eyebrow"><span /> VUE D'ENSEMBLE</div><h2>Les repères utiles,<br /><em>réunis au même endroit.</em></h2><p>Après l'analyse, le rapport présente les scores, la répartition des prises de parole, la timeline et les pistes de coaching.</p></div>
              <StartAnalysisLink className="cp-outline-link">Lancer une analyse <ArrowRight size={14} /></StartAnalysisLink>
            </div>
            <div className="cp-dashboard-preview">
              <aside className="cp-preview-sidebar">
                <div className="cp-preview-brand"><span className="cp-brand-mark"><i /><i /><i /></span> CONSULT<span>PRO</span></div>
                <div className="cp-preview-nav"><span className="active"><BarChart3 size={15} /> Vue d'ensemble</span><span><AudioLines size={15} /> Consultation</span><span><Sparkles size={15} /> Coaching</span></div>
                <div className="cp-preview-private"><LockKeyhole size={13} /> Usage praticien</div>
              </aside>
              <div className="cp-preview-content">
                <div className="cp-preview-header"><div><span>RAPPORT DE CONSULTATION</span><h3>Votre analyse, en un coup d'œil</h3></div><span className="cp-preview-state"><i /> Rapport après traitement</span></div>
                <div className="cp-preview-metrics">
                  <article><span className="cp-preview-metric-icon"><Activity size={16} /></span><small>INDICATEURS SVS</small><strong>S1 · S2 · S3 · S4</strong><span>Scores de la consultation analysée</span></article>
                  <article><span className="cp-preview-metric-icon cp-icon-cyan"><MessageCircle size={16} /></span><small>COMMUNICATION</small><strong>Échange praticien–patient</strong><span>Questions, empathie, reformulations</span></article>
                  <article><span className="cp-preview-metric-icon cp-icon-ink"><Clock3 size={16} /></span><small>DÉROULÉ</small><strong>Segments & temps de parole</strong><span>Timeline et répartition par rôle</span></article>
                </div>
                <div className="cp-preview-lower"><div><span className="cp-preview-label">DÉROULÉ DE LA CONSULTATION</span><div className="cp-preview-timeline"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="cp-preview-legend"><span><i /> Praticien</span><span><i /> Patient</span></div></div><div className="cp-preview-empty"><Sparkles size={17} /><strong>Vos pistes de coaching</strong><span>Affichées avec les résultats réels après analyse</span></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="cp-section cp-vigilance">
          <div className="cp-container cp-vigilance-layout">
            <div className="cp-vigilance-copy"><div className="cp-eyebrow"><span /> VIGILANCE SYSTÉMIQUE</div><h2>Garder le contexte<br /><em>dans la réflexion.</em></h2><p>Le score systémique est indicatif. Un questionnaire médical ou une évaluation clinique reste nécessaire pour explorer cet axe.</p><div className="cp-disclaimer"><ShieldCheck size={17} /><span><strong>Indicateur non diagnostique.</strong><br />Il soutient le questionnement du praticien et ne remplace pas son évaluation.</span></div></div>
            <div className="cp-svs-visual" aria-label="Les quatre dimensions du score SVS">
              <div className="cp-svs-rings"><i /><i /><i /><i /></div><div className="cp-svs-center"><BrainCircuit size={25} /><span>REPÈRES<br />DE COACHING</span></div>
              <div className="cp-svs-label cp-svs-one"><b>S1</b><span>Émotionnel</span></div><div className="cp-svs-label cp-svs-two"><b>S2</b><span>Fonctionnel</span></div><div className="cp-svs-label cp-svs-three"><b>S3</b><span>Systémique</span></div><div className="cp-svs-label cp-svs-four"><b>S4</b><span>Relationnel</span></div>
            </div>
          </div>
        </section>

        <section className="cp-section cp-recommendations" id="coaching">
          <div className="cp-container">
            <div className="cp-section-heading cp-centered-heading"><div className="cp-eyebrow"><span /> RECOMMANDATIONS ACTIONNABLES</div><h2>Des observations<br /><em>qui ouvrent des pistes.</em></h2><p>Les suggestions du rapport sont calculées à partir de la consultation analysée. Voici les dimensions qu'elles peuvent couvrir.</p></div>
            <div className="cp-recommendation-grid">
              <article className="cp-recommendation-card"><div className="cp-rec-head"><span className="cp-card-icon"><MessageCircle size={18} /></span><span>EXEMPLE DE PISTE</span></div><h3>Questions ouvertes</h3><p>Explorer comment des questions ouvertes peuvent donner au patient davantage d'espace pour décrire sa demande.</p><div className="cp-rec-action"><span>DIMENSION</span><strong>Communication</strong><ArrowRight size={15} /></div></article>
              <article className="cp-recommendation-card"><div className="cp-rec-head"><span className="cp-card-icon cp-icon-cyan"><Waves size={18} /></span><span>EXEMPLE DE PISTE</span></div><h3>Rythme de parole</h3><p>Observer le débit et les pauses, notamment lors de l'explication des étapes de prise en charge.</p><div className="cp-rec-action"><span>DIMENSION</span><strong>Voix & diction</strong><ArrowRight size={15} /></div></article>
              <article className="cp-recommendation-card"><div className="cp-rec-head"><span className="cp-card-icon cp-icon-ink"><RotateCcw size={18} /></span><span>EXEMPLE DE PISTE</span></div><h3>Reformulation</h3><p>Confirmer la compréhension en reformulant les préoccupations exprimées pendant l'entretien.</p><div className="cp-rec-action"><span>DIMENSION</span><strong>Écoute active</strong><ArrowRight size={15} /></div></article>
            </div>
          </div>
        </section>

        <section className="cp-section cp-assistant">
          <div className="cp-container cp-assistant-layout">
            <div><div className="cp-eyebrow"><span /> EXPLORER VOTRE RAPPORT</div><h2>Repartez des résultats<br /><em>pour faire évoluer l'échange.</em></h2><p>Le rapport met en regard la transcription, les indicateurs de communication et les recommandations afin de guider votre propre analyse.</p><div className="cp-assistant-points"><span><Check size={14} /> Résultats issus de l'enregistrement analysé</span><span><Check size={14} /> Aucune conclusion médicale automatisée</span></div></div>
            <div className="cp-insight-card"><div className="cp-insight-card-head"><span className="cp-insight-spark"><Sparkles size={15} /></span><div><strong>Exemple de piste de réflexion</strong><span>Illustration, pas un résultat de consultation</span></div><span className="cp-insight-more">···</span></div><div className="cp-insight-question">Comment laisser plus de place au récit du patient ?</div><div className="cp-insight-answer"><span><Lightbulb size={15} /></span><p>Vous pourriez essayer une question ouverte au début de l'exploration, puis reformuler ce que vous avez entendu avant de proposer la suite.</p></div><div className="cp-insight-tags"><span><MessageCircle size={12} /> Questions ouvertes</span><span><UserRound size={12} /> Écoute active</span></div><StartAnalysisLink className="cp-inline-action">Analyser une consultation <ArrowRight size={14} /></StartAnalysisLink></div>
          </div>
        </section>

        <section className="cp-section cp-ethics" id="securite">
          <div className="cp-container">
            <div className="cp-section-heading cp-centered-heading"><div className="cp-eyebrow"><span /> CONFIANCE PAR CONCEPTION</div><h2>Une technologie<br /><em>aux limites claires.</em></h2><p>Un outil conçu pour assister la réflexion du praticien, sans se substituer à son jugement clinique.</p></div>
            <div className="cp-ethics-grid"><article><LockKeyhole size={21} /><span>CONFIDENTIALITÉ</span><p>Les enregistrements doivent être traités dans le cadre des autorisations et règles de confidentialité applicables.</p></article><article><ShieldCheck size={21} /><span>NON DIAGNOSTIQUE</span><p>ConsultPro analyse des signaux de communication et fournit du coaching, pas un diagnostic médical.</p></article><article><UserRound size={21} /><span>DÉCISION HUMAINE</span><p>Le praticien reste responsable de l'interprétation des résultats et de toute décision clinique.</p></article></div>
          </div>
        </section>

        <section className="cp-section cp-progression" id="progression">
          <div className="cp-container"><div className="cp-progression-top"><div><div className="cp-eyebrow"><span /> PROGRESSION PERSONNELLE</div><h2>Faire évoluer sa pratique,<br /><em>consultation après consultation.</em></h2></div><StartAnalysisLink className="cp-outline-link">Commencer une analyse <ArrowRight size={14} /></StartAnalysisLink></div>
            <div className="cp-progress-panel"><div className="cp-progress-copy"><span className="cp-preview-label">SUIVI DES CONSULTATIONS</span><h3>Un historique pour observer votre évolution</h3><p>Chaque rapport présente les indicateurs de sa propre consultation. Le suivi dans le temps nécessite une fonctionnalité d'historique qui n'est pas encore activée dans cette version.</p><a href="#analyse">Analyser une consultation <ArrowRight size={14} /></a></div><div className="cp-progress-visual"><div className="cp-progress-axis"><span>CONSULTATION</span><i /></div><div className="cp-progress-placeholder"><TrendingUp size={25} /><span>L'historique apparaîtra ici<br />lorsqu'il sera disponible.</span></div></div></div>
          </div>
        </section>

        <section className="cp-final-cta"><div className="cp-final-wave" aria-hidden="true">{[20,32,48,26,60,38,50,23,42,58,29,47,19,55,34,45,22,39,52,27,43,18,36].map((height, i) => <i key={i} style={{ height }} />)}</div><div className="cp-container"><div className="cp-eyebrow"><span /> PRÊT À ÉCOUTER AUTREMENT ?</div><h2>Transformez l'écoute<br /><em>en opportunité de progresser.</em></h2><p>Analysez votre consultation et explorez les résultats dans votre espace de coaching.</p><StartAnalysisLink className="cp-button">Lancer une analyse <ArrowRight size={15} /></StartAnalysisLink></div></section>
      </main>

      <footer className="cp-footer"><div className="cp-container"><a className="cp-brand" href="#accueil"><span className="cp-brand-mark"><i /><i /><i /></span><span>CONSULT<span>PRO</span></span></a><p>Coaching praticien augmenté par l'analyse vocale.</p><div className="cp-footer-links"><a href="#fonctionnement">Fonctionnement</a><a href="#coaching">Coaching</a><a href="#securite">Sécurité</a><Link to="/login">Se connecter</Link></div><span>Usage interne · Non diagnostique</span></div></footer>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<LoginPage register />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/new-analysis" element={<NewAnalysisPage />} />
      <Route path="/consultations" element={<ConsultationsPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/results/:id" element={<ResultsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<LandingPage />} />
  </Routes></AuthProvider></BrowserRouter>;
}
