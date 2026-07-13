import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import ResultsDashboard from "./ResultsDashboard";

const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api/analysis`; 

const POLL_INTERVAL_MS = 4000;

export default function UploadConsultation() {
  const [status, setStatus] = useState("idle"); // idle | uploading | pending | processing | done | error
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);
  const pollTimer = useRef(null);

  const pollJob = useCallback((jobId) => {
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/${jobId}`);
        const data = await res.json();

        if (data.status === "processing" || data.status === "pending") {
          setStatus(data.status);
          setProgressMsg(data.progress || "");
        } else if (data.status === "done") {
          clearInterval(pollTimer.current);
          setStatus("done");
          setResult(data.result);
        } else if (data.status === "error") {
          clearInterval(pollTimer.current);
          setStatus("error");
          setErrorMsg(data.error || "Erreur inconnue pendant l'analyse.");
        }
      } catch (e) {
        clearInterval(pollTimer.current);
        setStatus("error");
        setErrorMsg("Impossible de contacter le serveur.");
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Échec de l'envoi du fichier.");
      }
      const data = await res.json();
      setStatus("pending");
      pollJob(data.job_id);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  if (status === "done" && result) {
    return <ResultsDashboard data={result} />;
  }

  return (
    <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Analyse de consultation
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Déposez l'enregistrement audio de votre consultation pour obtenir votre
        rapport de coaching (usage interne, non diagnostique).
      </p>

      {status === "idle" && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-10 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
        >
          <Upload size={28} />
          <span className="text-sm font-medium">Choisir un fichier audio</span>
          <span className="text-xs text-slate-400">.wav, .mp3, .mp4, .m4a</span>
        </button>
      )}

      {(status === "uploading" || status === "pending" || status === "processing") && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-600">
          <Loader2 className="animate-spin" size={28} />
          <span className="text-sm font-medium">
            {status === "uploading" && "Envoi du fichier..."}
            {status === "pending" && "Analyse en file d'attente..."}
            {status === "processing" && (progressMsg || "Analyse en cours...")}
          </span>
          <span className="text-xs text-slate-400">
            Cela peut prendre plusieurs minutes selon la durée de l'enregistrement.
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-2 py-8 text-rose-600">
          <AlertCircle size={26} />
          <span className="text-sm font-medium text-center">{errorMsg}</span>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 text-xs underline text-slate-500"
          >
            Réessayer
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.mp4,.m4a,.ogg"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
