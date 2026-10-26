import { useEffect, useState } from "react";
import { Activity, ArrowRight, AudioLines, BarChart3, Clock3, FileAudio, Plus, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import UploadConsultation from "../components/coaching/UploadConsultation";
import ResultsDashboard from "../components/coaching/ResultsDashboard";

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="workspace-heading"><div><span className="page-eyebrow"><i />{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function useAnalyses() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest("/analysis/history")
      .then(setAnalyses)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);
  return { analyses, loading, error };
}

function formatDate(value) {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes} min ${String(remainder).padStart(2, "0")} s`;
}

function Status({ status }) {
  const labels = { done: "Terminée", processing: "En cours", pending: "En attente", error: "Échec" };
  return <span className={`status-pill ${status === "done" ? "success" : status === "error" ? "error" : "warning"}`}><i />{labels[status] || status}</span>;
}

function EmptyState({ loading, error, message }) {
  if (loading) return <div className="workspace-message">Chargement de vos consultations…</div>;
  if (error) return <div className="workspace-message error-message">{error}</div>;
  return <div className="workspace-empty"><span><FileAudio size={20} /></span><strong>{message}</strong><Link to="/new-analysis">Lancer une première analyse <ArrowRight size={14} /></Link></div>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { analyses, loading, error } = useAnalyses();
  const completed = analyses.filter((item) => item.status === "done");
  const scores = completed.map((item) => item.score).filter(Number.isFinite);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const latest = analyses[0];

  return <AppShell><PageHeading eyebrow="VOTRE ESPACE" title={`Bonjour, ${user?.name || "praticien"}.`} description="Retrouvez vos analyses et les pistes de coaching associées." action={<Link className="app-primary-button compact" to="/new-analysis"><Plus size={16} /> Nouvelle analyse</Link>} />
    <div className="workspace-stat-grid"><article><span className="workspace-stat-icon"><BarChart3 size={17} /></span><small>CONSULTATIONS</small><strong>{loading ? "…" : analyses.length}</strong><span>Dans votre espace</span></article><article><span className="workspace-stat-icon cyan"><Clock3 size={17} /></span><small>DERNIÈRE ANALYSE</small><strong className="stat-text">{latest ? formatDate(latest.created_at) : "Aucune"}</strong><span>{latest ? <Status status={latest.status} /> : "Aucun rapport enregistré"}</span></article><article><span className="workspace-stat-icon ink"><Sparkles size={17} /></span><small>SCORE MOYEN</small><strong>{average === null ? "—" : `${average} / 100`}</strong><span>{scores.length ? "Sur vos consultations terminées" : "Disponible après une analyse"}</span></article><article><span className="workspace-stat-icon green"><Activity size={17} /></span><small>RAPPORTS TERMINÉS</small><strong>{loading ? "…" : completed.length}</strong><span>Consultations analysées</span></article></div>
    <div className="workspace-section-heading"><div><span className="card-kicker">ACTIVITÉ RÉCENTE</span><h2>Vos consultations</h2></div><Link to="/consultations">Tout afficher <ArrowRight size={14} /></Link></div>
    {analyses.length ? <ConsultationTable rows={analyses.slice(0, 5)} /> : <EmptyState loading={loading} error={error} message="Vos rapports apparaîtront ici après analyse." />}
  </AppShell>;
}

function ConsultationTable({ rows }) {
  return <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Date</th><th>Analyse</th><th>Durée</th><th>Score</th><th>Statut</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{formatDate(row.created_at)}</td><td><strong>Consultation #{row.id.slice(0, 8)}</strong></td><td>{formatDuration(row.duration_s)}</td><td>{row.score == null ? "—" : `${row.score} / 100`}</td><td><Status status={row.status} /></td><td>{row.status === "done" && <Link className="table-action" to={`/results/${row.id}`}>Voir <ArrowRight size={13} /></Link>}</td></tr>)}</tbody></table></div>;
}

export function NewAnalysisPage() {
  return <AppShell><PageHeading eyebrow="NOUVELLE CONSULTATION" title="Lancer une analyse" description="Importez un enregistrement autorisé pour générer un rapport de coaching." /><div className="analysis-consent-note"><ShieldCheck size={16} /><span>Usage interne au praticien. Vérifiez que vous êtes autorisé à traiter cet enregistrement avant de l'importer.</span></div><UploadConsultation /></AppShell>;
}

export function ConsultationsPage() {
  const { analyses, loading, error } = useAnalyses();
  return <AppShell><PageHeading eyebrow="HISTORIQUE" title="Mes consultations" description="Seuls les rapports associés à votre compte sont affichés." action={<Link className="app-primary-button compact" to="/new-analysis"><Plus size={16} /> Nouvelle analyse</Link>} />{analyses.length ? <ConsultationTable rows={analyses} /> : <EmptyState loading={loading} error={error} message="Aucune consultation enregistrée." />}</AppShell>;
}

export function ProgressPage() {
  const { analyses, loading, error } = useAnalyses();
  const completed = analyses.filter((item) => item.status === "done" && Number.isFinite(item.score));
  const average = completed.length ? Math.round(completed.reduce((sum, item) => sum + item.score, 0) / completed.length) : null;
  return <AppShell><PageHeading eyebrow="VOTRE ÉVOLUTION" title="Ma progression" description="Les indicateurs ci-dessous sont calculés uniquement à partir de vos consultations enregistrées." />
    {loading || error ? <EmptyState loading={loading} error={error} message="Aucune donnée de progression." /> : completed.length ? <><div className="progress-summary"><div><TrendingUp size={19} /><span>Score moyen</span><strong>{average} / 100</strong><small>{completed.length} consultation{completed.length > 1 ? "s" : ""} terminée{completed.length > 1 ? "s" : ""}</small></div><div className="progress-history"><span className="card-kicker">SCORES PAR CONSULTATION</span>{[...completed].reverse().map((item) => <div className="progress-history-row" key={item.id}><span>{formatDate(item.created_at)}</span><div><i><b style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} /></i></div><strong>{item.score}</strong></div>)}</div></div></> : <EmptyState loading={false} message="Terminez une analyse pour commencer votre suivi." />}
  </AppShell>;
}

export function ResultsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest(`/analysis/${encodeURIComponent(id)}`)
      .then((result) => {
        if (result.status !== "done" || !result.result) throw new Error("Le rapport n'est pas encore disponible.");
        setData(result.result);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);
  return <AppShell>{loading ? <div className="workspace-message">Chargement du rapport…</div> : error ? <><PageHeading eyebrow="RAPPORT" title="Rapport indisponible" description={error} /><Link className="app-primary-button compact" to="/consultations">Retour aux consultations <ArrowRight size={15} /></Link></> : <><Link className="results-back-link" to="/consultations">← Mes consultations</Link><ResultsDashboard data={data} /></>}</AppShell>;
}

export function ProfilePage() {
  const { user } = useAuth();
  return <AppShell><PageHeading eyebrow="VOTRE COMPTE" title="Mon profil" description="Informations de votre espace praticien." /><section className="profile-panel"><span className="profile-avatar">{user?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><span className="card-kicker">PRATICIEN</span><h2>{user?.name}</h2><p>{user?.email}</p><span className="profile-note">Le profil est associé à votre compte sécurisé.</span></div></section></AppShell>;
}

export function SettingsPage() {
  return <AppShell><PageHeading eyebrow="CONFIDENTIALITÉ" title="Cadre d'utilisation" description="Informations sur le traitement des enregistrements et des résultats." /><section className="settings-info"><ShieldCheck size={20} /><div><h2>Vos analyses sont privées</h2><p>Les consultations enregistrées dans l'application ne sont accessibles qu'au compte qui les a créées. Les fichiers audio temporaires sont supprimés après traitement ; les rapports sont conservés dans la base locale du serveur.</p></div></section><p className="settings-disclaimer">N'importez que des fichiers que vous êtes autorisé à traiter. ConsultPro est un outil de coaching non diagnostique et ne remplace pas l'évaluation clinique.</p></AppShell>;
}
