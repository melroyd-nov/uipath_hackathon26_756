import { useEffect, useRef, useCallback } from 'react';

const TIP_OFFSET_X = 4;
const TIP_OFFSET_Y = 3;

export default function CustomCursor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const mouse = useRef({ x: -200, y: -200 });
  const raf = useRef(0);

  const tick = useCallback(() => {
    if (svgRef.current) {
      svgRef.current.style.transform = `translate3d(${mouse.current.x - TIP_OFFSET_X}px, ${mouse.current.y - TIP_OFFSET_Y}px, 0)`;
    }
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(
        'a, button, input, select, textarea, label, [role="button"], [tabindex]'
      );
      if (el) svgRef.current?.classList.add('cur-hover');
    };

    const onOut = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(
        'a, button, input, select, textarea, label, [role="button"], [tabindex]'
      );
      if (el) svgRef.current?.classList.remove('cur-hover');
    };

    const onDown = () => svgRef.current?.classList.add('cur-click');
    const onUp = () => svgRef.current?.classList.remove('cur-click');

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    window.addEventListener('mouseup', onUp, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      cancelAnimationFrame(raf.current);
    };
  }, [tick]);

  return (
    <svg
      ref={svgRef}
      className="cursor-arrow"
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cur-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E2D45" />
          <stop offset="100%" stopColor="#0F1A2E" />
        </linearGradient>
        <linearGradient id="cur-sheen" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Soft shadow offset layer */}
      <path
        d="M4 3 L4 20 L8.5 15.5 L11.5 22 L13.8 21 L10.8 14.5 L17.5 14.5 Z"
        fill="rgba(0,0,0,0.22)"
        transform="translate(0.7,1.2)"
      />

      {/* Main dark body */}
      <path
        className="cur-body"
        d="M4 3 L4 20 L8.5 15.5 L11.5 22 L13.8 21 L10.8 14.5 L17.5 14.5 Z"
        fill="url(#cur-body-grad)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Left-edge sheen highlight */}
      <path
        d="M4 3 L4 13 L8.5 9.5 Z"
        fill="url(#cur-sheen)"
      />

      {/* Tip accent dot */}
      <circle cx="4" cy="3.2" r="1.5" fill="#3B82F6" opacity="0.9" />
    </svg>
  );
}
