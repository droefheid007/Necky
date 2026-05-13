import { useState, useEffect } from 'react';

const WARMUP_STEPS = [
  { label: 'Chin down — reach low', icon: '👇', duration: 5 },
  { label: 'Chin up — reach high', icon: '☝️', duration: 5 },
  { label: 'Look left slowly', icon: '↩️', duration: 5 },
  { label: 'Look right slowly', icon: '↪️', duration: 5 },
  { label: 'Repeat gently', icon: '🔁', duration: 5 },
];

export default function WarmupScreen({ onDone }: { onDone: () => void }) {
  const steps = WARMUP_STEPS;
  const [stepIdx, setStepIdx] = useState(0);
  const [countdown, setCountdown] = useState(steps[0].duration);


  useEffect(() => {
    if (countdown === 0) {
      if (stepIdx < steps.length - 1) {
        setStepIdx(i => i + 1);
        setCountdown(steps[stepIdx + 1]?.duration ?? 5);
      } else {
        onDone();
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, stepIdx]);

  const step = steps[stepIdx];

  return (
    <div style={s.container}>
      <h2 style={s.title}>WARM UP</h2>
      <p style={s.subTitle}>Before every race — protect your neck</p>

      <div style={s.card}>
        <span style={s.icon}>{step.icon}</span>
        <p style={s.label}>{step.label}</p>
        <span style={s.timer}>{countdown}s</span>
      </div>

      <div style={s.dots}>
        {steps.map((_, i) => (
          <div key={i} style={{ ...s.dot, ...(i === stepIdx ? s.dotActive : {}), ...(i < stepIdx ? s.dotDone : {}) }} />
        ))}
      </div>

      <button onClick={onDone} style={s.skip}>Skip warmup</button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#08080f' },
  title:     { color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: 6, marginBottom: 8 },
  subTitle:  { color: '#555', fontSize: 12, letterSpacing: 1, fontFamily: 'monospace', marginBottom: 48 },
  card:      { width: '100%', maxWidth: 400, backgroundColor: '#111118', borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #1e1e2e' },
  icon:      { fontSize: 56, marginBottom: 20 },
  label:     { color: '#fff', fontSize: 18, fontWeight: 600, textAlign: 'center', marginBottom: 24 },
  timer:     { color: '#00f5d4', fontSize: 40, fontWeight: 900 },
  dots:      { display: 'flex', flexDirection: 'row', gap: 8, marginTop: 32 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2a3a' },
  dotActive: { backgroundColor: '#ff3864', width: 24 },
  dotDone:   { backgroundColor: '#00f5d4' },
  skip:      { marginTop: 32, color: '#333', fontSize: 13, fontFamily: 'monospace', background: 'none', cursor: 'pointer' },
};
