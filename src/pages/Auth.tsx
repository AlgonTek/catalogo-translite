import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  FirebaseError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Key, ShieldCheck } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    document.title = "Acesso Admin — Translite Solutions";
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/admin", { replace: true });
    }
  }, [loading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor preencha o email e a senha.");
      return;
    }

    setSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (err: unknown) {
        const fbErr = err as FirebaseError;
        const code = fbErr?.code || "";

        if (code === "auth/user-not-found") {
          try {
            userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            toast.success("Conta de administrador criada e autenticada com sucesso!");
          } catch (createErr: unknown) {
            const createFbErr = createErr as FirebaseError;
            if (createFbErr?.code === "auth/weak-password") {
              toast.error("A senha deve conter no mínimo 6 caracteres.");
            } else {
              toast.error("Erro ao registrar utilizador no Firebase Auth.");
            }
            return;
          }
        } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
          toast.error("Email ou senha incorretos. Por favor, tente novamente.");
          return;
        } else {
          throw fbErr;
        }
      }

      if (userCred?.user) {
        toast.success("Autenticado com sucesso via Firebase Auth!");
      }
    } catch (err: unknown) {
      const error = err as FirebaseError;
      if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential") {
        toast.error("Email ou senha incorretos.");
      } else if (error?.code === "auth/weak-password") {
        toast.error("A senha deve conter no mínimo 6 caracteres.");
      } else {
        toast.error(error.message || "Erro de autenticação no Firebase.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      toast.error("Por favor insira o email para enviar o link de redefinição.");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      toast.success(`Link de redefinição enviado para ${email}! Verifique a caixa de entrada/spam.`);
    } catch (err: unknown) {
      const fbErr = err as FirebaseError;
      toast.error(fbErr.message || "Erro ao solicitar redefinição de senha no Firebase.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container py-8 sm:py-12 max-w-md mx-auto px-4">
        <Card className="p-6 sm:p-8 shadow-elevated border border-border">
          <div className="w-12 h-12 rounded-xl gradient-primary grid place-items-center mb-4 mx-auto shadow-sm">
            <Lock className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl sm:text-2xl text-center font-extrabold tracking-tight">Painel Administrativo</h1>
          <p className="text-xs sm:text-sm text-center text-muted-foreground mb-6">
            Translite Solutions — Autenticação via Firebase Auth
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" /> Email de Acesso
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-primary" /> Senha
                </Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetting}
                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                >
                  {resetting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Esqueceu a senha?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-xs sm:text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 text-xs sm:text-sm gap-2 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {submitting ? "A autenticar..." : "Entrar no Painel Admin"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;



