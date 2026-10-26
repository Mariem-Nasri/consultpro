import { createContext, useContext, useEffect, useState } from "react";
import { authService, SessionUser } from "@/services/api";

interface AuthContextValue { user: SessionUser | null; loading: boolean; login: (email: string, password: string) => Promise<SessionUser>; register: (name: string, email: string) => Promise<SessionUser>; logout: () => void; }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setUser(authService.getSession()); setLoading(false); }, []);
  const login = async (email: string, password: string) => { const next = await authService.login(email, password); setUser(next); return next; };
  const register = async (name: string, email: string) => { const next = await authService.register(name, email); setUser(next); return next; };
  const logout = () => { authService.logout(); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used inside AuthProvider"); return context; }
