import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage({ register = false }) {
  const { signIn, signUp, loading, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (register && password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    try {
      if (register) await signUp(name, email, password);
      else await signIn(email, password);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link className="sidebar-brand auth-brand" to="/"><span className="cp-brand-mark"><i /><i /><i /></span><span>CONSULT<span>PRO</span></span></Link>
        <div className="auth-art" aria-hidden="true"><div className="auth-orbit" /><div className="auth-core"><span>CP</span></div><div className="auth-bars">{[23, 39, 55, 31, 67, 42, 58, 25, 47, 34, 62, 28, 44].map((height, i) => <i key={i} style={{ height }} />)}</div></div>
        <div className="auth-visual-copy"><span>COACHING PRATICIEN AUGMENTÉ</span><h1>La conversation<br /><em>comme source de progrès.</em></h1><p>Retrouvez vos analyses et vos pistes de réflexion dans un espace personnel.</p></div>
        <div className="auth-assurance"><ShieldCheck size={16} /> Accès réservé à votre espace praticien</div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-inner">
          <Link className="auth-back-link" to="/"><ArrowLeft size={14} /> Retour à l'accueil</Link>
          <div className="auth-form-heading"><span className="page-eyebrow"><i /> ESPACE PRATICIEN</span><h2>{register ? "Créez votre espace." : "Bon retour parmi nous."}</h2><p>{register ? "Ouvrez un compte praticien pour accéder à vos consultations." : "Connectez-vous pour retrouver vos consultations et vos analyses."}</p></div>
          <form className="auth-form" onSubmit={submit}>
            {register && <label className="form-field"><span>Nom complet</span><input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Dr. Marie Martin" /></label>}
            <label className="form-field"><span>Adresse email</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@cabinet.fr" /></label>
            <label className="form-field"><span>Mot de passe</span><input type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={register ? "10 caractères minimum" : "Votre mot de passe"} /></label>
            {register && <label className="form-field"><span>Confirmer le mot de passe</span><input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Retapez le mot de passe" /></label>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="app-primary-button auth-submit" type="submit" disabled={submitting || loading}>{submitting ? "Connexion en cours…" : register ? "Créer mon compte" : "Se connecter"}<ArrowRight size={16} /></button>
          </form>
          <div className="auth-switch">{register ? "Vous avez déjà un compte ?" : "Nouveau sur ConsultPro ?"} <Link to={register ? "/login" : "/register"}>{register ? "Se connecter" : "Créer un compte"} <ArrowRight size={14} /></Link></div>
          <p className="auth-legal"><Check size={13} /> Outil de coaching interne au praticien. Aucun diagnostic médical n'est fourni.</p>
        </div>
      </section>
    </main>
  );
}
