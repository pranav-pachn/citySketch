import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  ArrowRight,
  Compass,
  LayoutPanelTop,
  MessageSquare,
  PanelLeft,
  Route,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { HeroScene } from "./hero-scene";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const metricCards = [
  { value: "1.8s", label: "Prompt to first city draft" },
  { value: "12x8", label: "Deterministic smart zoning grid" },
  { value: "3 views", label: "2D, 3D, and blueprint sync" },
  { value: "94%", label: "Road graph connectivity average" },
];

const flowCards = [
  {
    id: "01",
    title: "Intent Mapping",
    body: "Translate natural language into strict generation signals before any tile is placed.",
    className: "flow-a",
  },
  {
    id: "02",
    title: "Variant Engine",
    body: "Generate multiple city forms with deterministic seeds and fast side-by-side comparison.",
    className: "flow-b",
  },
  {
    id: "03",
    title: "Explainability",
    body: "Inspect walkability, zoning ratios, and environmental tradeoffs for each generated layout.",
    className: "flow-c",
  },
  {
    id: "04",
    title: "Export",
    body: "Ship production-ready artifacts to downstream teams without rebuilding the plan manually.",
    className: "flow-d",
  },
];

const pipeline = [
  {
    icon: WandSparkles,
    title: "Prompt parsing",
    body: "Extract river style, density, zoning intent, and road behavior from natural language.",
  },
  {
    icon: Route,
    title: "Road + zone generation",
    body: "Construct connected corridors, place functional zones, and enforce adjacency realism.",
  },
  {
    icon: LayoutPanelTop,
    title: "Interactive review",
    body: "Switch between 2D, 3D, and code views, then iterate with the same session history.",
  },
];

// Using react-router-dom Link instead of WORKSPACE_URL

type ServiceStatus = {
  url: string;
  connected: boolean;
  status: number | null;
  latencyMs: number | null;
};

type IntegrationStatus = {
  frontend: ServiceStatus;
  backend: ServiceStatus;
  backendTimestamp: number | null;
};

gsap.registerPlugin(ScrollTrigger);

export function LandingPage() {
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    document.body.classList.add("landing-route");

    return () => {
      document.body.classList.remove("landing-route");
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const loadIntegrationStatus = async () => {
      const startedAt = performance.now();

      const baseStatus: IntegrationStatus = {
        frontend: {
          url: window.location.origin,
          connected: true,
          status: 200,
          latencyMs: 0,
        },
        backend: {
          url: "/api/health",
          connected: false,
          status: null,
          latencyMs: null,
        },
        backendTimestamp: null,
      };

      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!alive) {
          return;
        }

        if (!response.ok) {
          setIntegration({
            ...baseStatus,
            backend: {
              ...baseStatus.backend,
              status: response.status,
            },
          });
          return;
        }

        const payload = (await response.json()) as { status?: string; timestamp?: number };
        const latencyMs = Math.round(performance.now() - startedAt);

        setIntegration({
          ...baseStatus,
          backend: {
            ...baseStatus.backend,
            connected: payload.status === "ok",
            status: response.status,
            latencyMs,
          },
          backendTimestamp: typeof payload.timestamp === "number" ? payload.timestamp : null,
        });
      } catch {
        // Keep UI stable if local services are offline.
        if (alive) {
          setIntegration(baseStatus);
        }
      }
    };

    void loadIntegrationStatus();
    const intervalId = window.setInterval(() => {
      void loadIntegrationStatus();
    }, 15000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.1,
    });

    let rafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      ScrollTrigger.update();
      rafId = window.requestAnimationFrame(raf);
    };

    rafId = window.requestAnimationFrame(raf);

    const ctx = gsap.context(() => {
      const blocks = gsap.utils.toArray<HTMLElement>(".gs-reveal");

      blocks.forEach((el, idx) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 45 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            delay: idx * 0.04,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 86%",
              once: true,
            },
          }
        );
      });

      gsap.to(".parallax-card", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: "#engine",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => {
      ctx.revert();
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const heroMotion = useMemo(
    () => ({
      hidden: { opacity: 0, y: 28 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.75 },
      },
    }),
    []
  );

  return (
    <TooltipProvider delayDuration={90}>
      <div className="landing-root">
        <div className="atmo atmo-left" />
        <div className="atmo atmo-right" />
        <div className="mesh-grid" />
        <div className="noise" />

        <header className="top-nav gs-reveal">
          <div className="top-nav-inner">
            <a href="#top" className="brand-wrap">
              <span className="brand-dot">
                <Sparkles size={14} />
              </span>
              <span className="font-display text-sm tracking-[0.12em]">CITYSKETCH</span>
            </a>

            <nav className="nav-cluster hidden md:flex">
              <a href="#product" className="nav-item">
                Product
              </a>
              <a href="#workflow" className="nav-item">
                Workflow
              </a>
              <a href="#engine" className="nav-item">
                Engine
              </a>
              <a href="#get-started" className="nav-item">
                Start
              </a>
            </nav>

            <div className="connection-pill hidden lg:flex">
              <span className={cn("status-dot", integration?.frontend.connected && "online")} />
              <span>App</span>
              <span className={cn("status-dot", integration?.backend.connected && "online")} />
              <span>API</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="request-btn" asChild>
                  <Link to="/login">
                    Generate layouts
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open CitySketch workspace</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main id="top" className="main-shell">
          <section className="hero-layout">
            <div className="hero-copy">
              <motion.p
                variants={heroMotion}
                initial="hidden"
                animate="show"
                className="hero-pill"
              >
                Spatial intelligence for urban futures
              </motion.p>

              <motion.h1
                variants={heroMotion}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.08 }}
                className="hero-title font-display"
              >
                One prompt to a city that actually makes sense.
              </motion.h1>

              <motion.p
                variants={heroMotion}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.16 }}
                className="hero-sub"
              >
                CitySketch transforms language into coherent urban structure with road logic, zoning realism,
                water constraints, and export-ready artifacts in minutes.
              </motion.p>

              <motion.div
                variants={heroMotion}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.24 }}
                className="hero-actions"
              >
                <Button size="lg" asChild>
                  <Link to="/login">
                    Launch studio
                    <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#engine">See engine logic</a>
                </Button>
              </motion.div>

              <div className="metric-grid gs-reveal">
                {metricCards.map((metric) => (
                  <Card key={metric.label} className="metric-card">
                    <CardContent className="!p-0">
                      <p className="metric-value font-display">{metric.value}</p>
                      <p className="metric-label">{metric.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="hero-visual gs-reveal">
              <Card className="scene-card parallax-card">
                <HeroScene />
                <div className="scene-tag">
                  <Compass size={14} />
                  3D zoning preview
                </div>
              </Card>

              <Card className="floating-data data-a">
                <CardContent className="!p-0">
                  <p className="floating-kicker">Prompt</p>
                  <p className="floating-copy">River city with high-density mixed-use spine and forested edges.</p>
                </CardContent>
              </Card>

              <Card className="floating-data data-b">
                <CardContent className="!p-0">
                  <p className="floating-kicker">Resolver</p>
                  <p className="floating-copy">Crossings placed. Industrial buffers enforced. Roads connected.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="product-map gs-reveal" id="product">
            <Card className="map-copy">
              <CardHeader>
                <CardDescription className="tracking-[0.16em] uppercase text-[11px]">
                  Product-first layout
                </CardDescription>
                <CardTitle className="font-display text-3xl leading-[1.05]">
                  Designed around CitySketch workflow, not decorative screenshots.
                </CardTitle>
                <CardDescription>
                  The interface is centered on the real usage loop: prompt input, generation, 2D/3D/Code
                  review, and iteration with session history.
                </CardDescription>
              </CardHeader>
              <CardContent className="map-points">
                <div className="map-point">
                  <PanelLeft size={14} />
                  Persistent sidebar with prompt history and project context.
                </div>
                <div className="map-point">
                  <LayoutPanelTop size={14} />
                  Workspace header with view toggles for 2D, 3D, and code outputs.
                </div>
                <div className="map-point">
                  <MessageSquare size={14} />
                  Fixed chat input at bottom for continuous design iterations.
                </div>
              </CardContent>
            </Card>

            <Card className="map-visual parallax-card">
              <CardContent className="h-full !p-0">
                <div className="shell-wire">
                  <aside className="wire-sidebar">
                    <p className="wire-logo font-display">CitySketch</p>
                    <div className="wire-history">
                      <span className="wire-muted">Recent prompts</span>
                      <div className="wire-row">Forest edge mixed-use city</div>
                      <div className="wire-row">Coastal low-density district</div>
                      <div className="wire-row">Transit-oriented downtown</div>
                    </div>
                  </aside>

                  <div className="wire-main">
                    <header className="wire-header">
                      <p className="wire-project">Project: River tech district</p>
                      <div className="wire-toggle">
                        <span className="active">2D</span>
                        <span>3D</span>
                        <span>Code</span>
                      </div>
                    </header>

                    <div className="wire-canvas">
                      <div className="wire-grid" />
                      <div className="wire-chip">12 x 8 deterministic grid</div>
                    </div>

                    <div className="wire-chat">
                      <span className="wire-plus">+</span>
                      <span className="wire-input">Design a dense mixed-use core with river crossings...</span>
                      <span className="wire-send">Generate</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="signal-grid gs-reveal" id="engine">
            <Card className="signal-panel">
              <CardHeader>
                <CardDescription className="tracking-[0.16em] uppercase text-[11px]">
                  Generation logic
                </CardDescription>
                <CardTitle className="font-display text-2xl">Extraction logic before generation.</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="water">
                  <TabsList>
                    <TabsTrigger value="water">Water</TabsTrigger>
                    <TabsTrigger value="roads">Roads</TabsTrigger>
                    <TabsTrigger value="density">Density</TabsTrigger>
                  </TabsList>
                  <TabsContent value="water">
                    River scale, orientation, and crossing strategy are derived first to prevent impossible
                    urban forms downstream.
                  </TabsContent>
                  <TabsContent value="roads">
                    Organic and grid routes are merged with graph checks that guarantee connected circulation.
                  </TabsContent>
                  <TabsContent value="density">
                    Core intensity and edge transitions are constrained by zoning buffers and livability rules.
                  </TabsContent>
                </Tabs>

                {/* Decorative zone visualization */}
                <div className="engine-zone-map">
                  {[
                    { color: "#3b82f6", label: "Residential" },
                    { color: "#f59e0b", label: "Commercial" },
                    { color: "#22c55e", label: "Park" },
                    { color: "#52525b", label: "Road" },
                    { color: "#06b6d4", label: "Water" },
                    { color: "#a855f7", label: "Industrial" },
                  ].map((zone) => (
                    <div key={zone.label} className="engine-zone-pill">
                      <span className="engine-zone-dot" style={{ background: zone.color }} />
                      <span className="engine-zone-label">{zone.label}</span>
                    </div>
                  ))}
                </div>

                <div className="engine-signal-bar">
                  <div className="engine-signal-track" />
                  <div className="engine-signal-track" style={{ opacity: 0.6, width: "72%" }} />
                  <div className="engine-signal-track" style={{ opacity: 0.4, width: "45%" }} />
                </div>
              </CardContent>
            </Card>

            <Card className="signal-panel">
              <CardHeader>
                <div>
                  <CardDescription className="tracking-[0.16em] uppercase text-[11px]">
                    Real generation pipeline
                  </CardDescription>
                  <CardTitle className="font-display text-2xl">From prompt to navigable city output.</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="pipeline-list">
                  {pipeline.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="pipeline-step">
                        <div className="pipeline-icon">
                          <Icon size={14} />
                        </div>
                        <div>
                          <p className="pipeline-title">{item.title}</p>
                          <p className="pipeline-copy">{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="workflow" className="flow-grid gs-reveal">
            {flowCards.map((item) => (
              <motion.div
                key={item.id}
                className={item.className}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <Card className="flow-card">
                  <CardHeader>
                    <CardDescription className="flow-step font-display">{item.id}</CardDescription>
                    <CardTitle className="font-display text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-[color:var(--text-soft)]">{item.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </section>

          <section id="get-started" className="access-wrap gs-reveal">
            <Card className="access-card">
              <CardHeader>
                <CardDescription className="tracking-[0.18em] uppercase text-[11px] text-[color:var(--accent-cyan)]">
                  Early access
                </CardDescription>
                <CardTitle className="font-display text-[clamp(1.8rem,4.4vw,4rem)] leading-[0.98] max-w-[15ch]">
                  Bring your planning team into a radically faster design loop.
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/login">
                    Start building
                    <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#product">View product map</a>
                </Button>

                <div className="access-trust">
                  <ShieldCheck size={14} />
                  System {integration?.frontend.connected && integration?.backend.connected ? "online" : "checking status..."}
                </div>
              </CardContent>
            </Card>
          </section>
        </main>

        <footer className="footer-shell gs-reveal">
          <div className="footer-brand">
            <span className="footer-brand-name">CITYSKETCH</span>
            <span className="footer-brand-tagline">Spatial intelligence for urban futures</span>
          </div>

          <nav className="footer-nav">
            <div className="footer-nav-group">
              <span className="footer-nav-heading">Product</span>
              <a href="#product" className="footer-nav-link">Overview</a>
              <a href="#engine" className="footer-nav-link">Engine</a>
              <a href="#workflow" className="footer-nav-link">Workflow</a>
            </div>
            <div className="footer-nav-group">
              <span className="footer-nav-heading">Access</span>
              <a href="#get-started" className="footer-nav-link">Early access</a>
              <a href="/login" className="footer-nav-link">Sign in</a>
            </div>
          </nav>

          <span className="footer-copy">© 2025 CitySketch. All rights reserved.</span>
        </footer>
      </div>
    </TooltipProvider>
  );
}
