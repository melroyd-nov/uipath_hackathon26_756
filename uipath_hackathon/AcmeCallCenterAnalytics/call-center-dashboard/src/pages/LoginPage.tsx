import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Headset, BarChart3, Users, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import acmeIcon from '../public/Acme-Transparent-Icon.png';
import acmeLogo from '../public/Acme-Transparent-Logo.png';
import uiPathLogo from '../public/UiPath-Icon.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, error: uiPathError } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('cc_auth', '1');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex w-[52%] shrink-0 flex-col justify-start gap-4 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #1a3a5c 0%, #0f2744 40%, #0a1e38 100%)' }}
      >
        {/* Subtle grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow orb */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #2a8fc7 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4ab5d4 0%, transparent 70%)' }}
        />

        {/* Acme Logo (full — icon + "ACME INSURANCE" text) */}
        <div className="relative z-10">
          <img
            src={acmeLogo}
            alt="Acme Insurance"
            className="h-20 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>

        {/* UiPath logo — powered-by mark, left-aligned below Acme logo */}
        <div className="relative z-10 flex gap-2" style={{ alignItems: 'center', marginTop: '-12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>Powered by</span>
          <img
            src={uiPathLogo}
            alt="UiPath"
            style={{ height: '14px', width: 'auto', display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.45, transform: 'translateY(-2px)' }}
          />
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#7dd3f0]">
            <Headset size={11} />
            Call Center Intelligence
          </span>

          <h1
            className="mt-3 max-w-sm text-[28px] font-bold leading-[1.2] text-white"
            style={{ letterSpacing: '-0.025em' }}
          >
            Live insights for every call, agent, and compliance signal.
          </h1>
          <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-white/50">
            Powered by UiPath Maestro — your AI-driven contact centre analytics platform.
          </p>

          {/* Feature tiles */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              { icon: BarChart3, label: 'AI Sentiment Analysis', desc: 'Real-time emotion scoring' },
              { icon: ClipboardCheck, label: 'Live Compliance', desc: 'Flag issues as they happen' },
              { icon: Users, label: 'Agent Insights', desc: 'Per-agent KPI breakdowns' },
              { icon: ShieldCheck, label: 'Follow-up Tracking', desc: 'Human-in-the-loop approvals' },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.05] p-2.5 backdrop-blur-sm"
              >
                <Icon size={13} className="text-[#7dd3f0] mb-1" />
                <p className="text-[11px] font-semibold text-white/90">{label}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Right auth panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-[#F4F6FB]">
        <div className="w-full max-w-[380px]">

          {/* Mobile brand — only visible on small screens */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img src={acmeLogo} alt="Acme Insurance" className="h-10 w-auto" />
          </div>

          {/* Auth card */}
          <div className="rounded-2xl border border-white/80 bg-white p-8 shadow-[0_16px_48px_rgba(10,30,60,0.10)]">

            {/* Acme icon centred at top */}
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #e8f4f8 0%, #d0eaf4 100%)' }}>
                <img src={acmeIcon} alt="Acme" className="h-10 w-10 object-contain" />
              </div>
            </div>

            <h2 className="text-center text-[22px] font-bold tracking-tight text-[#0a1e38]">
              Welcome back
            </h2>
            <p className="mt-1.5 text-center text-[12.5px] text-[#5a7a96]">
              Sign in to Acme Call Center Analytics
            </p>

            {/* Error banner */}
            {uiPathError && (
              <div className="mt-5 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-4 py-3 text-[11.5px] font-medium text-[#d92d20]">
                {uiPathError}
              </div>
            )}

            {/* UiPath SSO — primary action */}
            <button
              type="button"
              onClick={() => login()}
              disabled={isLoading}
              className="mt-6 group relative flex w-full items-center justify-center gap-3 rounded-[14px] px-5 py-4 font-semibold text-white transition-all duration-200 hover:scale-[1.015] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: isLoading
                  ? '#888'
                  : 'linear-gradient(135deg, #e8420a 0%, #fa4616 60%, #ff6b3d 100%)',
                boxShadow: isLoading ? 'none' : '0 8px 24px rgba(250,70,22,0.35)',
              }}
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="text-[14px]">Connecting to UiPath…</span>
                </>
              ) : (
                <>
                  <span className="text-[14.5px] tracking-[-0.01em]">Continue with</span>
                  <img
                    src={uiPathLogo}
                    alt="UiPath"
                    className="h-[22px] w-auto shrink-0"
                    style={{ filter: 'brightness(0) invert(1)', transform: 'translateY(-4px)' }}
                  />
                </>
              )}
            </button>

            {/* Trust line */}
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8aacbf]">
              <ShieldCheck size={12} className="text-[#4ab5d4]" />
              Secured by UiPath Identity — single sign-on
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-[#8aacbf]">
            © {new Date().getFullYear()} Acme Insurance · Call Center Analytics · Powered by UiPath
          </p>
        </div>
      </div>
    </div>
  );
}
