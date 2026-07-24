import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Lock, UserPlus, LogIn, Key, ShieldCheck } from "lucide-react";

const DEFAULT_ADMIN_EMAIL = "admin@translite.co.mz";
const DEFAULT_ADMIN_PASS = "admin123456";

const Auth = () => {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Acesso Admin — Translite";
  }, []);

  useEffect(() => {
    if (!loading && session && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, session, isAdmin, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Se a conta não existir ao tentar o login, sugere criar
          if (error.message.includes("Invalid login credentials")) {
            toast.info("Conta não encontrada. Criando nova conta administrador...");
            return await handleSignUp();
          }
          throw error;
        }
        toast.success("Login efetuado com sucesso!");
      } else {
        await handleSignUp();
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Erro de autenticação");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Atribuir perfil de admin
      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "admin",
      });

      if (data.session) {
        toast.success("Conta de Administrador criada e iniciada com sucesso!");
        navigate("/admin", { replace: true });
      } else {
        toast.success("Conta criada! Efetuando login...");
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) throw loginErr;
      }
    }
  }

  const fillDefaultCredentials = () => {
    setEmail(DEFAULT_ADMIN_EMAIL);
    setPassword(DEFAULT_ADMIN_PASS);
    toast.info("Credenciais padrão preenchidas");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container py-8 sm:py-12 max-w-md mx-auto px-4">
        <Card className="p-6 sm:p-8 shadow-elevated border-border/80">
          <div className="w-12 h-12 rounded-xl gradient-primary grid place-items-center mb-4 mx-auto shadow-md">
            <Lock className="w-6 h-6 text-primary-foreground" />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-center mb-1 text-foreground">
            {mode === "login" ? "Acesso ao Painel Admin" : "Criar Nova Conta Admin"}
          </h1>
          <p className="text-xs sm:text-sm text-center text-muted-foreground mb-6">
            Gerencie produtos e o catálogo da Translite Solutions
          </p>

          {/* Comutador Entrar / Criar */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold">
                E-mail de Administrador
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@translite.co.mz"
                className="mt-1 text-xs sm:text-sm"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-xs font-semibold">
                Palavra-passe
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 text-xs sm:text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-primary text-primary-foreground border-0 font-bold h-11 text-xs sm:text-sm shadow-md"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "login" ? "Entrar no Painel" : "Criar e Entrar"}
            </Button>
          </form>

          {/* Card com as Credenciais Padrão Prontas */}
          <div className="mt-6 p-3 bg-muted/50 border border-border/80 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span className="flex items-center gap-1 text-primary">
                <ShieldCheck className="w-4 h-4" /> Credenciais do Administrador:
              </span>
              <button
                type="button"
                onClick={fillDefaultCredentials}
                className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <Key className="w-3 h-3" /> Preencher
              </button>
            </div>

            <div className="space-y-1 font-mono text-[11px] text-muted-foreground bg-background/80 p-2 rounded border border-border/40">
              <p>
                <strong className="text-foreground font-sans">E-mail:</strong> {DEFAULT_ADMIN_EMAIL}
              </p>
              <p>
                <strong className="text-foreground font-sans">Senha:</strong> {DEFAULT_ADMIN_PASS}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
