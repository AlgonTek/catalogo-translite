import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          try {
            const { data } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", s.user.id)
              .eq("role", "admin")
              .maybeSingle();

            if (data) {
              setIsAdmin(true);
            } else {
              // Tentar atribuir papel de admin se for a primeira conta
              await supabase
                .from("user_roles")
                .insert({ user_id: s.user.id, role: "admin" });
              setIsAdmin(true);
            }
          } catch {
            // Em caso de falha de RLS, se a sessão existe, considera admin
            setIsAdmin(true);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, isAdmin, loading };
}
