import { Router, RequestHandler } from "express";
import multer from "multer";
import { analysisRepository } from "../repositories/analysisRepository";
import { aiAnalysisService, generateAnalysisPdf, modelService, storageService } from "../services/platformServices";
import { Role, SessionUser } from "@shared/api";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, ["audio/wav", "audio/x-wav", "audio/flac", "audio/mpeg"].includes(file.mimetype) || /\.(wav|flac|mp3)$/i.test(file.originalname)) });
const sessions = new Map<string, SessionUser>();
const users = [{ id: "pr-024", name: "Dr. Martin", email: "dr.martin@cabinet.fr", role: "PRACTITIONER" as Role, verified: true }, { id: "adm-001", name: "Admin Consult Pro", email: "admin@consultpro.fr", role: "ADMIN" as Role, verified: true }];
function issueSession(user: SessionUser) { const token = crypto.randomUUID(); sessions.set(token, user); return token; }
const requireAuth: RequestHandler = (req, res, next) => { const token = req.header("authorization")?.replace(/^Bearer\s+/i, ""); const user = token ? sessions.get(token) : undefined; if (!user) return res.status(401).json({ message: "Authentification requise" }); res.locals.user = user; next(); };
function requireRole(role: Role): RequestHandler { return (req, res, next) => { if (res.locals.user?.role !== role) return res.status(403).json({ message: "Accès interdit" }); next(); }; }
function validAudio(file?: Express.Multer.File) { return Boolean(file && ["audio/wav", "audio/x-wav", "audio/flac", "audio/mpeg"].includes(file.mimetype)); }

router.post("/auth/login", (req, res) => { const { email, password } = req.body as { email?: string; password?: string }; if (!email || !password) return res.status(400).json({ message: "Email et mot de passe requis" }); const user = users.find((item) => item.email === email) ?? { id: `pr-${Date.now()}`, name: email.split("@")[0], email, role: email.includes("admin") ? "ADMIN" as Role : "PRACTITIONER" as Role, verified: true }; const token = issueSession(user); res.json({ user, token }); });
router.post("/auth/register", (req, res) => { const { name, email } = req.body as { name?: string; email?: string }; if (!name || !email) return res.status(400).json({ message: "Nom et email requis" }); const user: SessionUser = { id: `pr-${Date.now()}`, name, email, role: "PRACTITIONER", verified: false }; res.status(201).json({ user, token: issueSession(user) }); });
router.post("/auth/logout", requireAuth, (req, res) => { const token = req.header("authorization")?.replace(/^Bearer\s+/i, ""); if (token) sessions.delete(token); res.status(204).send(); });
router.get("/me", requireAuth, (_req, res) => res.json(res.locals.user));

router.post("/audio/upload", requireAuth, upload.single("audio"), async (req, res) => { if (!validAudio(req.file)) return res.status(400).json({ message: "Le fichier audio n'est pas supporté." }); const storageKey = await storageService.saveAudio(req.file!); const analysis = analysisRepository.create({ practitionerId: res.locals.user.id, storageKey, mimeType: req.file!.mimetype }); const job = await aiAnalysisService.uploadAudio({ storageKey, mimeType: req.file!.mimetype }); await aiAnalysisService.startAnalysis({ jobId: job.jobId, analysisId: analysis.id }); res.status(202).json({ analysisId: analysis.id, status: "processing" }); });
router.get("/analyses", requireAuth, (req, res) => res.json(analysisRepository.summaries()));
router.get("/analyses/:id/status", requireAuth, async (req, res) => res.json(await aiAnalysisService.getAnalysisStatus(String(req.params.id))));
router.get("/analyses/:id", requireAuth, async (req, res) => { try { res.json(await aiAnalysisService.getAnalysisResults(String(req.params.id))); } catch { res.status(404).json({ message: "Analyse introuvable" }); } });
router.post("/analyses/:id/report", requireAuth, async (req, res) => { try { const analysis = await aiAnalysisService.getAnalysisResults(String(req.params.id)); const pdf = await generateAnalysisPdf(analysis); res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename=consult-pro-${analysis.id}.pdf`); res.send(pdf); } catch { res.status(404).json({ message: "Le rapport PDF n'a pas pu être généré." }); } });
router.get("/admin/reports", requireAuth, requireRole("ADMIN"), (_req, res) => res.json(analysisRepository.listReports()));
router.get("/admin/models", requireAuth, requireRole("ADMIN"), (_req, res) => res.json([{ name: "ConsultPro-Voice-v1", type: "Analyse vocale", version: "1.0.0", status: "Déployé", updated: "22 sept. 2026" }, { name: "ConsultPro-Language-v2", type: "Analyse conversationnelle", version: "2.1.0", status: "Déployé", updated: "18 sept. 2026" }]));
router.post("/admin/models/:id/validate", requireAuth, requireRole("ADMIN"), async (req, res) => { await modelService.validateModel(String(req.params.id)); res.json({ status: "validated" }); });
router.post("/admin/models/:id/deploy", requireAuth, requireRole("ADMIN"), async (req, res) => { await modelService.deployModel(String(req.params.id), req.body.environment ?? "staging"); res.json({ status: "deployed" }); });
router.get("/admin/analyses", requireAuth, requireRole("ADMIN"), (_req, res) => res.json(analysisRepository.summaries()));
router.get("/admin/logs", requireAuth, requireRole("ADMIN"), (_req, res) => res.json([{ timestamp: new Date().toISOString(), action: "Analysis completed", resource: "AN-024", status: "success" }]));
export default router;
