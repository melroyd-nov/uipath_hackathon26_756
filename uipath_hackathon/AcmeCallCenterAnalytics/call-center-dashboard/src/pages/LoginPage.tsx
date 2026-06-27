import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headset, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

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
    <div className="flex h-screen bg-[#F7F8FC]">
      {/* Left brand panel */}
      <div
        className="hidden w-[45%] shrink-0 flex-col justify-between p-10 lg:flex"
        style={{ background: 'linear-gradient(160deg, #241660 0%, #1C1248 45%, #160E3A 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20">
            <span className="text-base font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>A</span>
          </div>
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-white/90" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Acme Analytics
          </span>
        </div>

        {/* Hero copy */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-[#93C5FD]">
            <Headset size={11} />
            Call Center Intelligence
          </span>
          <h1
            className="mt-5 max-w-xs text-[32px] font-bold leading-tight text-white"
            style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.025em' }}
          >
            Your live queue, sentiment, and follow-ups in one view.
          </h1>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/50">
            Monitor calls, agents, and compliance signals as they happen across every line.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {['AI Sentiment Analysis', 'Live Compliance', 'Agent Insights', 'Follow-up Tracking'].map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-full bg-white/8 border border-white/12 px-2.5 py-1 text-[10px] font-medium text-white/60"
              >
                <span className="h-1 w-1 rounded-full bg-[#3B82F6]" />
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[10px] font-medium text-white/25">
          © {new Date().getFullYear()} Acme Call Center Analytics · Powered by UiPath
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          {/* Mobile brand */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241660]">
              <span className="text-sm font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>A</span>
            </div>
            <span className="text-[13px] font-semibold text-[#0A053A]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Acme Analytics
            </span>
          </div>

          {/* Card */}
          <div className="rounded-[16px] border border-[rgba(15,31,76,0.10)] bg-white p-8 shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
            <h2
              className="text-[22px] font-bold tracking-[-0.02em] text-[#0A053A]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Welcome back
            </h2>
            <p className="mt-1 text-[12px] text-[#565A7F]">Sign in to your analytics workspace</p>

            <div className="mt-6 space-y-3">
              {/* Email field (disabled) */}
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold tracking-[0.02em] text-[#0F1F4C]">
                  Email
                </label>
                <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(15,31,76,0.12)] bg-[rgba(15,31,76,0.025)] px-[14px] py-[11px] opacity-50">
                  <Mail size={14} className="shrink-0 text-[#9399C3]" />
                  <input
                    type="email"
                    disabled
                    placeholder="you@acme.com"
                    className="w-full bg-transparent text-[13px] text-[#0F1F4C] outline-none placeholder:text-[#9399C3] cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password field (disabled) */}
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold tracking-[0.02em] text-[#0F1F4C]">
                  Password
                </label>
                <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(15,31,76,0.12)] bg-[rgba(15,31,76,0.025)] px-[14px] py-[11px] opacity-50">
                  <Lock size={14} className="shrink-0 text-[#9399C3]" />
                  <input
                    type="password"
                    disabled
                    placeholder="••••••••"
                    className="w-full bg-transparent text-[13px] text-[#0F1F4C] outline-none placeholder:text-[#9399C3] cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-1 w-full cursor-not-allowed rounded-[10px] py-[11px] px-6 text-[13.5px] font-semibold text-white opacity-40"
                style={{ background: '#150958', boxShadow: '0 4px 18px rgba(21,9,88,0.28)' }}
              >
                Sign in
              </button>
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#E1E4F2]" />
              <span className="text-[10px] font-medium text-[#9399C3]">or continue with</span>
              <span className="h-px flex-1 bg-[#E1E4F2]" />
            </div>

            {uiPathError && (
              <div className="mb-3 rounded-[8px] bg-[#FEF2F2] border border-[#FCA5A5] px-3 py-2 text-[11px] font-medium text-[#D92D20]">
                {uiPathError}
              </div>
            )}

            {/* UiPath SSO */}
            <button
              type="button"
              onClick={() => login()}
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-[rgba(15,31,76,0.14)] bg-white px-4 py-[10px] text-[13px] font-semibold text-[#0F1F4C] transition-all hover:border-[#1E5EAC] hover:bg-[rgba(30,94,172,0.04)] disabled:opacity-50"
              style={{ boxShadow: '0 1px 3px rgba(15,31,76,0.08)' }}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(30,94,172,0.18)] border-t-[#1E5EAC]" />
                  Connecting…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden>
                    <circle cx="16" cy="16" r="16" fill="#FA4616" />
                    <path d="M10 22V10h5.5c2.5 0 4.5 2 4.5 4.5S18 19 15.5 19H13v3H10zm3-6h2.5c1 0 1.5-.7 1.5-1.5S16.5 13 15.5 13H13v3z" fill="white" />
                  </svg>
                  Continue with UiPath
                </>
              )}
            </button>

            {/* Trust line */}
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-[#9399C3]">
              <ShieldCheck size={11} />
              Secured by UiPath Identity
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-[#9399C3]">
            © {new Date().getFullYear()} Acme Insurance · Call Center Analytics
          </p>
        </div>
      </div>
    </div>
  );
}
