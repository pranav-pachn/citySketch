import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleLogin } from "@react-oauth/google";
import { useStore } from "@/store/useStore";
import { apiUrl } from "@/lib/api";

type Tab = "signin" | "signup";

export function LoginPage() {
  const [tab, setTab] = useState<Tab>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const setUser = useStore((s) => s.setUser);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await fetch(apiUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!res.ok) throw new Error("Backend verification failed");

      const userData = await res.json();
      setUser(userData);
      navigate("/app");
    } catch (error) {
      console.error("Google Auth Error:", error);
      alert("Failed to sign in with Google. Please try again.");
    }
  };

  // For demo: form submit navigates to /app
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <div className="login-root">
      {/* Ambient overlays */}
      <div className="atmo atmo-left" />
      <div className="atmo atmo-right" />
      <div className="mesh-grid" />
      <div className="noise" />

      {/* Minimal top nav */}
      <header className="login-nav">
        <Link to="/" className="brand-wrap">
          <span className="brand-dot">
            <Sparkles size={14} />
          </span>
          <span className="font-display text-sm tracking-[0.12em]">CITYSKETCH</span>
        </Link>
      </header>

      {/* Centered card */}
      <main className="login-main">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="login-card"
        >
          {/* Header */}
          <div className="login-card-header">
            <p className="login-eyebrow">Spatial intelligence for urban futures</p>
            <h1 className="login-title font-display">
              {tab === "signin" ? "Welcome back." : "Start building."}
            </h1>
            <p className="login-sub">
              {tab === "signin"
                ? "Sign in to continue to your CitySketch workspace."
                : "Create an account to start generating city layouts."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="login-tabs">
            <button
              className={`login-tab-btn ${tab === "signin" ? "active" : ""}`}
              onClick={() => setTab("signin")}
            >
              Sign In
            </button>
            <button
              className={`login-tab-btn ${tab === "signup" ? "active" : ""}`}
              onClick={() => setTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Google button */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                console.log("Login Failed");
              }}
              theme="filled_black"
              shape="pill"
              text="continue_with"
              width="355"
            />
          </div>

          {/* Divider */}
          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">or</span>
            <span className="login-divider-line" />
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="login-form"
              onSubmit={handleSubmit}
            >
              {tab === "signup" && (
                <div className="login-field">
                  <label className="login-label">Full name</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
              )}

              <div className="login-field">
                <label className="login-label">Email address</label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="login-field">
                <label className="login-label">Password</label>
                <div className="login-input-wrap">
                  <input
                    className="login-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {tab === "signup" && (
                <div className="login-field">
                  <label className="login-label">Confirm password</label>
                  <div className="login-input-wrap">
                    <input
                      className="login-input"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {tab === "signin" && (
                <div className="login-forgot-row">
                  <a href="#" className="login-forgot">
                    Forgot password?
                  </a>
                </div>
              )}

              <Button type="submit" size="lg" className="login-submit-btn">
                {tab === "signin" ? "Sign in" : "Create account"}
                <ArrowRight size={16} />
              </Button>
            </motion.form>
          </AnimatePresence>

          {/* Footer link */}
          <p className="login-footer-text">
            {tab === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button className="login-switch-link" onClick={() => setTab("signup")}>
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button className="login-switch-link" onClick={() => setTab("signin")}>
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Terms */}
          <p className="login-terms">
            By continuing, you agree to our{" "}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
