import { Info, Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';

interface GlassPanelProps {
  title?: string;
  subtitle?: string;
  tooltip?: string;
  lottieIcon?: object;
  onExport?: () => void;
  children: ReactNode;
  className?: string;
  accent?: string;
  overflowVisible?: boolean;
}

export default function GlassPanel({
  title,
  subtitle,
  tooltip,
  lottieIcon,
  onExport,
  children,
  className = '',
  accent,
  overflowVisible = false,
}: GlassPanelProps) {
  const accentColor = accent ?? '#1E5EAC';
  const gradientBorder = `rgba(255,255,255,0.80) padding-box, linear-gradient(135deg, ${accentColor}70, ${accentColor}28, rgba(180,200,255,0.35)) border-box`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{
        y: -3,
        boxShadow: `0 16px 48px ${accentColor}28, 0 4px 16px rgba(15,31,76,0.10), inset 0 1px 0 rgba(255,255,255,0.95)`,
        transition: { duration: 0.22, ease: 'easeOut' },
      }}
      className={`${overflowVisible ? 'overflow-visible' : 'overflow-hidden'} rounded-2xl ${className}`}
      style={{
        background: gradientBorder,
        border: '1.5px solid transparent',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `0 4px 24px rgba(15,31,76,0.08), 0 1px 4px rgba(15,31,76,0.05), inset 0 1px 0 rgba(255,255,255,0.90)`,
      }}
    >
      {title && (
        <header className="flex items-center justify-between gap-2 px-5 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            {lottieIcon && (
              <Lottie animationData={lottieIcon} loop autoplay style={{ width: 28, height: 28, flexShrink: 0 }} />
            )}
            <div>
              <h2
                className="text-[13px] font-semibold tracking-[-0.01em] text-[#0F1F4C]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                title="Export as CSV"
                className="flex items-center gap-1 rounded-lg border border-[rgba(15,31,76,0.10)] bg-white px-2.5 py-1 text-[11px] font-medium text-[rgba(15,31,76,0.45)] transition-colors hover:bg-[rgba(15,31,76,0.04)]"
              >
                <Download size={11} />
                Export
              </button>
            )}
            {tooltip && (
              <span title={tooltip} className="text-[#C4C9D4] transition-colors hover:text-[#9CA3AF]">
                <Info size={13} />
              </span>
            )}
          </div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </motion.section>
  );
}
