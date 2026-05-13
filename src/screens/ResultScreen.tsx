import type { RaceResult } from './GameScreen';

export default function ResultScreen({ result, onHome, onRerun }: { result: RaceResult; onHome: () => void; onRerun: () => void }) {
  const badges = ['🏅', '🥈', '🥇'];
  const titles = ['Keep Pushing!', 'Great Effort!', 'Elite Run!'];
  const totalSecs = Object.values(result.movementCoverage).reduce((a, b) => a + b, 0);

  const movementRows = [
    { key: 'rotationR', label: 'Follow Right',          icon: '↪️' },
    { key: 'rotationL', label: 'Follow Left',           icon: '↩️' },
    { key: 'extension', label: 'Reach High',            icon: '☝️' },
    { key: 'flexion',   label: 'Reach Low',             icon: '👇' },
    { key: 'lateralR',  label: 'Tilt right',            icon: '➡️' },
    { key: 'lateralL',  label: 'Tilt left',             icon: '⬅️' },
  ];

  return (
    <div style={s.container}>
      <span style={s.badge}>{badges[result.stars - 1]}</span>
      <span style={s.stars}>{'⭐'.repeat(result.stars)}</span>
      <h2 style={s.title}>{titles[result.stars - 1]}</h2>

      {/* Score summary */}
      <div style={s.scoreBox}>
        <div style={s.statRow}>
          <span style={s.statLabel}>Prizes Collected</span>
          <span style={s.statValue}>{result.score / 100}</span>
        </div>
        <div style={s.statRow}>
          <span style={s.statLabel}>Final Score</span>
          <span style={{ ...s.statValue, color: '#ffd700' }}>{result.score}</span>
        </div>
      </div>

      {/* Movement breakdown */}
      <div style={s.breakdown}>
        <p style={s.breakdownTitle}>NECK MOVEMENT COVERAGE</p>
        {movementRows.map(row => {
          const secs = Math.floor(result.movementCoverage[row.key] ?? 0);
          const pct  = totalSecs > 0 ? Math.round((secs / totalSecs) * 100) : 0;
          return (
            <div key={row.key} style={s.row}>
              <span style={s.rowIcon}>{row.icon}</span>
              <span style={s.rowLabel}>{row.label}</span>
              <div style={s.bar}><div style={{ ...s.barFill, width: `${pct}%` }} /></div>
              <span style={s.rowSecs}>{secs}s</span>
            </div>
          );
        })}
      </div>

      <p style={s.nextText}>
        Great job! Play again to improve your score and neck mobility.
      </p>

      <div style={{ display: 'flex', gap: 16 }}>
        <button style={{ ...s.btn, backgroundColor: '#1a1a24' }} onClick={onRerun}>Rerun Race</button>
        <button style={s.btn} onClick={onHome}>Back to garage</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 32px 32px', backgroundColor: '#08080f', overflowY: 'auto', gap: 16 },

  badge: { fontSize: 64, lineHeight: 1 },
  stars: { fontSize: 26, letterSpacing: 6 },
  title: { color: '#fff', fontSize: 26, fontWeight: 900, letterSpacing: 3 },

  scoreBox:    { width: '100%', maxWidth: 420, backgroundColor: '#0d0d18', border: '1px solid #00f5d4', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 },
  statRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  statLabel: { color: '#555', fontSize: 12, fontFamily: 'monospace', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 900, fontFamily: 'monospace' },

  breakdown:      { width: '100%', maxWidth: 420, backgroundColor: '#111118', borderRadius: 16, padding: '16px 20px' },
  breakdownTitle: { color: '#333', fontSize: 9, letterSpacing: 3, fontFamily: 'monospace', marginBottom: 14 },
  row:            { display: 'flex', alignItems: 'center', marginBottom: 10, gap: 8 },
  rowIcon:        { fontSize: 15, width: 24, textAlign: 'center' },
  rowLabel:       { color: '#888', fontSize: 11, flex: 1, fontFamily: 'monospace' },
  bar:            { width: 70, height: 5, backgroundColor: '#1e1e2e', borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: 5, backgroundColor: '#00f5d4', borderRadius: 3 },
  rowSecs:        { color: '#555', fontSize: 10, fontFamily: 'monospace', width: 28, textAlign: 'right' },

  nextText: { color: '#444', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center' },
  btn:      { backgroundColor: '#ff3864', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: 1, padding: '16px 44px', borderRadius: 50, cursor: 'pointer', marginTop: 8 },
};
