import { useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone, MessageCircle, Clock } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

const PHONE_DISPLAY = "+258 87 675 1885";
const EMAIL_PRIMARY = "comercial@translitelda.com";
const EMAIL_SECONDARY = "translitelda@hotmail.com";
const LOCATION = "Maputo Cidade, Moçambique";

const Contactos = () => {
  useEffect(() => {
    document.title = "Contactos — Translite Solutions, Maputo";
    const desc = "Contacte a Translite Solutions em Maputo. WhatsApp, email e localização para encomendas a preço de atacado em Moçambique.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
    meta.setAttribute("content", desc);
  }, []);

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Vim do site da Translite e gostaria de mais informação.")}`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container py-4 sm:py-8">
          <h1 className="text-xl sm:text-4xl font-extrabold leading-tight">Fale connosco</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-xl">
            Estamos em Maputo e prontos para o atender. Escolha o canal que preferir.
          </p>
        </div>
      </section>

      <main className="container py-4 sm:py-10">
        <div className="grid gap-2.5 sm:gap-4 grid-cols-2">
          {/* WhatsApp */}
          <Card className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-whatsapp/15 text-whatsapp flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="font-bold text-sm sm:text-lg">WhatsApp</h2>
            </div>
            <p className="text-[11px] sm:text-sm text-muted-foreground hidden sm:block">Resposta rápida para encomendas e dúvidas.</p>
            <p className="font-semibold text-xs sm:text-base">{PHONE_DISPLAY}</p>
            <Button asChild size="sm" className="bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground mt-auto h-8 sm:h-10 text-xs sm:text-sm">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
            </Button>
          </Card>

          {/* Telefone */}
          <Card className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="font-bold text-sm sm:text-lg">Telefone</h2>
            </div>
            <p className="text-[11px] sm:text-sm text-muted-foreground hidden sm:block">Mesmo número do WhatsApp para chamadas directas.</p>
            <p className="font-semibold text-xs sm:text-base">{PHONE_DISPLAY}</p>
            <Button asChild size="sm" variant="outline" className="mt-auto h-8 sm:h-10 text-xs sm:text-sm">
              <a href={`tel:+${WHATSAPP_NUMBER}`}>Ligar agora</a>
            </Button>
          </Card>

          {/* Email */}
          <Card className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="font-bold text-sm sm:text-lg">Emails Oficiais</h2>
            </div>
            <p className="text-[11px] sm:text-sm text-muted-foreground hidden sm:block">Para cotações, parcerias e propostas formais.</p>
            <div className="space-y-1 my-auto">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Comercial:</span>
                <a href={`mailto:${EMAIL_PRIMARY}`} className="font-semibold text-xs sm:text-sm text-primary hover:underline break-all">
                  {EMAIL_PRIMARY}
                </a>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Geral:</span>
                <a href={`mailto:${EMAIL_SECONDARY}`} className="font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:underline break-all">
                  {EMAIL_SECONDARY}
                </a>
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
              <Button asChild size="sm" variant="outline" className="flex-1 h-8 sm:h-10 text-xs">
                <a href={`mailto:${EMAIL_PRIMARY}`}>Enviar Email</a>
              </Button>
            </div>
          </Card>

          {/* Localização */}
          <Card className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="font-bold text-sm sm:text-lg">Local</h2>
            </div>
            <p className="font-semibold text-xs sm:text-base">{LOCATION}</p>
            <div className="flex items-start gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-auto">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0" />
              <span>Seg–Sex: 8h–17h<br className="sm:hidden"/><span className="hidden sm:inline"> · </span>Sáb: 8h–13h</span>
            </div>
          </Card>
        </div>

        {/* Mapa */}
        <Card className="mt-4 sm:mt-6 overflow-hidden">
          <iframe
            title="Mapa de Maputo"
            src="https://www.google.com/maps?q=Maputo,Mozambique&output=embed"
            width="100%"
            height="220"
            className="sm:!h-[320px]"
            loading="lazy"
            style={{ border: 0 }}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Card>
      </main>

      <footer className="border-t border-border/60 py-8 mt-4 bg-muted/30">
        <div className="container text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Translite Solutions, Lda</p>
          <p className="text-xs">© {new Date().getFullYear()} — Maputo, Moçambique</p>
        </div>
      </footer>
    </div>
  );
};

export default Contactos;
