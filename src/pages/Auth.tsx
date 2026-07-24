import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Acesso Admin — AtacadoPro"; }, []);
  useEffect(() => {
    if (!loading && session && isAdmin) navigate("/admin", { replace: true });
  }, [loading, session, isAdmin, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bem-vindo!");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message ?? "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container py-12 max-w-md">
        <Card className="p-6 sm:p-8 shadow-elevated">
          <div className="w-12 h-12 rounded-lg gradient-primary grid place-items-center mb-4 mx-auto">
            <Lock className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl text-center mb-1">Acesso Admin</h1>
          <p className="text-sm text-center text-muted-foreground mb-6">
            Entre para gerenciar o catálogo
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0 font-bold">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            Acesso restrito. Contas são criadas apenas por administradores.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
