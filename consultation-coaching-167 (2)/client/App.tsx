import "./global.css";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ConsultationsPage, DashboardPage, LoginPage, NewAnalysisPage, ProcessingPage, ProfilePage, ProgressPage, ResultsPage, SettingsPage } from "./pages/AppPages";
import { AdminAnalysesPage, AdminLogsPage, AdminModelsPage, AdminOverviewPage, AdminReportsPage, AdminSettingsPage, AdminUsersPage, DeployModelPage } from "./pages/AdminPages";

const queryClient = new QueryClient();
function Protected({ children, role }: { children: React.ReactNode; role?: "PRACTITIONER" | "ADMIN" }) { const { user, loading } = useAuth(); if (loading) return <div className="route-loading"><div className="ai-pulse" /></div>; if (!user) return <Navigate to="/login" replace />; if (role && user.role !== role) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/dashboard"} replace />; return <>{children}</>; }
function Logout() { const { logout } = useAuth(); logout(); return <Navigate to="/login" replace />; }
function AppRoutes() { return <Routes><Route path="/" element={<Index />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<LoginPage mode="register" />} /><Route path="/forgot-password" element={<LoginPage mode="forgot" />} /><Route path="/reset-password" element={<LoginPage mode="reset" />} /><Route path="/verify-email" element={<LoginPage mode="verify" />} /><Route path="/logout" element={<Logout />} /><Route path="/dashboard" element={<Protected role="PRACTITIONER"><DashboardPage /></Protected>} /><Route path="/new-analysis" element={<Protected role="PRACTITIONER"><NewAnalysisPage /></Protected>} /><Route path="/analysis/processing" element={<Protected role="PRACTITIONER"><ProcessingPage /></Protected>} /><Route path="/results/:id" element={<Protected role="PRACTITIONER"><ResultsPage /></Protected>} /><Route path="/consultations" element={<Protected role="PRACTITIONER"><ConsultationsPage /></Protected>} /><Route path="/progress" element={<Protected role="PRACTITIONER"><ProgressPage /></Protected>} /><Route path="/profile" element={<Protected role="PRACTITIONER"><ProfilePage /></Protected>} /><Route path="/settings" element={<Protected role="PRACTITIONER"><SettingsPage /></Protected>} /><Route path="/admin" element={<Protected role="ADMIN"><AdminOverviewPage /></Protected>} /><Route path="/admin/users" element={<Protected role="ADMIN"><AdminUsersPage /></Protected>} /><Route path="/admin/models" element={<Protected role="ADMIN"><AdminModelsPage /></Protected>} /><Route path="/admin/models/deploy" element={<Protected role="ADMIN"><DeployModelPage /></Protected>} /><Route path="/admin/analyses" element={<Protected role="ADMIN"><AdminAnalysesPage /></Protected>} /><Route path="/admin/reports" element={<Protected role="ADMIN"><AdminReportsPage /></Protected>} /><Route path="/admin/logs" element={<Protected role="ADMIN"><AdminLogsPage /></Protected>} /><Route path="/admin/settings" element={<Protected role="ADMIN"><AdminSettingsPage /></Protected>} /><Route path="*" element={<NotFound />} /></Routes>; }
const App = () => <QueryClientProvider client={queryClient}><TooltipProvider><Toaster /><Sonner /><BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter></TooltipProvider></QueryClientProvider>;
createRoot(document.getElementById("root")!).render(<App />);
