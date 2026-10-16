"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { HeroScrollWorld } from "./HeroScrollWorld";
import { Navbar } from "./Navbar";
import { OriginSection } from "./OriginSection";
import { TraceSection } from "./TraceSection";
import { AnalyticsSection } from "./AnalyticsSection";
import { StoryBanner } from "./StoryBanner";
import { BlockchainSection } from "./BlockchainSection";
import { SiteFooter } from "./SiteFooter";
import { ScrollCompanion } from "./ScrollCompanion";
import { CacaoBranch, useWind } from "./Botanica";
import { PodSection } from "./PodSection";
import { LoginModal } from "@/components/auth/LoginModal";
import { ROLES, ROLE_HOME, useSession, writeSession, type Role, type Session } from "@/components/auth/roles";
import { Toaster, useToast } from "@/components/ui/Toaster";

export function LandingPage() {
  return (
    <div data-tema="claro" className="overflow-x-clip bg-surface text-ink">
      <Toaster>
        <Landing />
      </Toaster>
    </div>
  );
}

function Landing() {
  const { notify } = useToast();
  const mainRef = useRef<HTMLElement>(null);
  const session = useSession();
  const router = useRouter();
  const [login, setLogin] = useState<{ open: boolean; role: Role }>({ open: false, role: "operador" });

  const openLogin = useCallback(
    (role?: Role) => {
      if (session) {
        router.push(ROLE_HOME[session.role]);
        return;
      }
      setLogin({ open: true, role: role ?? "operador" });
    },
    [session, router],
  );

  const closeLogin = useCallback(() => setLogin((l) => ({ ...l, open: false })), []);

  const onSuccess = (s: Session) => {
    writeSession(s);
    closeLogin();
    notify("exito", `Bienvenido, ${ROLES[s.role].label}`, `Abriendo ${ROLES[s.role].tema.toLowerCase()}…`);
    router.push(ROLE_HOME[s.role]);
  };

  const logout = () => {
    writeSession(null);
    notify("info", "Sesión cerrada", "Puedes ingresar con otro rol cuando quieras.");
  };

  // Rama que cruza el borde entre el hero y la página, como en el video.
  const { scrollYProgress } = useScroll({ target: mainRef, offset: ["start end", "start start"] });
  const branchY = useTransform(scrollYProgress, [0, 1], [80, -40]);
  const branchRotate = useTransform(scrollYProgress, [0, 1], [-6, 2]);
  const wind = useWind(1.3);

  return (
    <>
      <Navbar session={session} onLogin={openLogin} onLogout={logout} />
      <HeroScrollWorld />

      <main
        ref={mainRef}
        className="relative -mt-[100svh] rounded-t-[2.5rem] bg-surface shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.45)] sm:rounded-t-[3.5rem]"
      >
        <motion.div
          aria-hidden="true"
          style={{ y: branchY, rotate: branchRotate }}
          className="pointer-events-none absolute -top-20 -left-8 z-20 w-[min(86vw,560px)] drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)] sm:-top-24 sm:-left-12"
        >
          <CacaoBranch className="w-full" wind={wind} />
        </motion.div>

        <OriginSection />
        <PodSection />
        <TraceSection onLogin={openLogin} />
        <AnalyticsSection />
        <StoryBanner />
        <BlockchainSection />
        <SiteFooter onLogin={openLogin} />
      </main>

      <ScrollCompanion targetRef={mainRef} />

      <LoginModal open={login.open} initialRole={login.role} onClose={closeLogin} onSuccess={onSuccess} />
    </>
  );
}
