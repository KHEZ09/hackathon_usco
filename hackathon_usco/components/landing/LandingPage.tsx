"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
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
import { CoffeeBranch } from "./Botanica";
import { LoginModal } from "@/components/auth/LoginModal";
import {
  ROLES,
  getSessionSnapshot,
  subscribeSession,
  writeSession,
  type Role,
  type Session,
} from "@/components/auth/roles";
import { Toaster, useToast } from "@/components/ui/Toaster";

export function LandingPage() {
  return (
    <div data-tema="claro" className="bg-surface text-ink">
      <Toaster>
        <Landing />
      </Toaster>
    </div>
  );
}

function Landing() {
  const { notify } = useToast();
  const mainRef = useRef<HTMLElement>(null);
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => null);
  const [login, setLogin] = useState<{ open: boolean; role: Role }>({ open: false, role: "operador" });

  const openLogin = useCallback(
    (role?: Role) => {
      if (session) {
        notify("info", `Sesión activa como ${ROLES[session.role].label}`, "Cierra sesión para cambiar de rol.");
        return;
      }
      setLogin({ open: true, role: role ?? "operador" });
    },
    [session, notify],
  );

  const closeLogin = useCallback(() => setLogin((l) => ({ ...l, open: false })), []);

  const onSuccess = (s: Session) => {
    writeSession(s);
    closeLogin();
    notify("exito", `Bienvenido, ${ROLES[s.role].label}`, `Sesión iniciada como ${s.email}. ${ROLES[s.role].tema}.`);
  };

  const logout = () => {
    writeSession(null);
    notify("info", "Sesión cerrada", "Puedes ingresar con otro rol cuando quieras.");
  };

  // Rama que cruza el borde entre el hero y la página, como en el video.
  const { scrollYProgress } = useScroll({ target: mainRef, offset: ["start end", "start start"] });
  const branchY = useTransform(scrollYProgress, [0, 1], [80, -40]);
  const branchRotate = useTransform(scrollYProgress, [0, 1], [-6, 2]);

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
          className="pointer-events-none absolute -top-20 -left-8 z-20 w-[min(78vw,500px)] blur-[0.6px] drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)] sm:-top-24 sm:-left-12"
        >
          <CoffeeBranch className="w-full" />
        </motion.div>

        <OriginSection />
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
