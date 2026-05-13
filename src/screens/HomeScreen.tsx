import { useEffect, useState } from 'react';

interface ScoreRecord { date: string; score: number; }

export default function HomeScreen({ onStart }: { onStart: () => void }) {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('necky_scores');
    if (raw) setScores(JSON.parse(raw));
  }, []);

  const handleStartAttempt = () => {
    setShowDisclaimer(true);
  };

  const acceptDisclaimer = () => {
    setShowDisclaimer(false);
    onStart();
  };

  return (
    <div style={s.container}>
      <div style={s.logoWrap}>
        <div style={s.logoMain}>NECKY</div>
        <div style={s.logoSub}>2 MIN · PRIZE RUN</div>
        <div style={s.logoHint}>A simple attempt to relax stiff neck muscles</div>
      </div>

      {scores.length > 0 && (
        <div style={s.scoreBoard}>
          <p style={s.scoreTitle}>TOP SCORES</p>
          {scores.map((sr, i) => (
            <div key={i} style={s.scoreRow}>
              <span style={s.scoreDate}>{sr.date}</span>
              <span style={s.scoreVal}>{sr.score}</span>
            </div>
          ))}
        </div>
      )}

      <button style={s.btn} onClick={handleStartAttempt}>
        Start New Race
      </button>

      {import.meta.env.DEV && (
        <button style={{ ...s.btn, backgroundColor: '#1a1a24', marginTop: 16, fontSize: 14, padding: '12px 32px' }} onClick={() => window.close()}>
          Quit Game
        </button>
      )}

      <p style={s.subHint}>Tilt your head · Collect prizes · 2 minutes</p>

      <div style={s.devNote}>
        <span style={s.devNoteIcon}>✍️</span>
        <p style={s.devNoteText}>
          As a dev, I always had a stiff neck. I wondered: with AI, can't we just gamify neck exercises? 
          It's not perfect—just a fun start to help us relax.
        </p>
      </div>

      <p style={s.privacy}>
        Uses your webcam for local tracking — no video is ever recorded or sent anywhere.
      </p>

      {showDisclaimer && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>⚠️ Safety & Liability</h3>
            <div style={s.modalBody}>
              <p>Consult a doctor if you have any pre-existing conditions.</p>
              <p>Necky is an arcade game intended for entertainment purposes only.</p>
              <p><strong>By continuing, you agree that:</strong></p>
              <ul>
                <li>You use this app at your <strong>own risk</strong>.</li>
                <li>The developers are <strong>not liable</strong> for any injuries or damages.</li>
                <li>This game is <strong>not a medical product</strong>. There is no proven science behind it relieving neck issues, and the developers make <strong>no guarantees</strong> of any health benefit.</li>
                <li>The developers are not responsible for unauthorized third-party deployments of this app.</li>
                <li>You will stop immediately if you feel pain or dizziness.</li>
                <li>This app is intended for <strong>adults</strong>. Parental supervision is advised for younger users.</li>
              </ul>
            </div>
            <button style={s.modalBtn} onClick={acceptDisclaimer}>I Agree & Start</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '32px',
    backgroundColor: '#050508', overflowY: 'auto'
  },
  logoWrap:  { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 },
  logoMain:  { fontSize: 64, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 0.9, letterSpacing: 8, textShadow: '0 0 20px #ff3864' },
  logoSub:   { color: '#00f5d4', fontSize: 13, letterSpacing: 5, marginTop: 20, fontFamily: 'monospace', textShadow: '0 0 10px #00f5d4', fontWeight: 700 },
  logoHint:  { color: '#555', fontSize: 11, letterSpacing: 3, marginTop: 10, fontFamily: 'monospace' },

  scoreBoard: { width: '100%', maxWidth: 300, backgroundColor: '#111118', borderRadius: 20, padding: '20px', marginBottom: 40, border: '1px solid #222' },
  scoreTitle: { color: '#555', fontSize: 10, letterSpacing: 3, fontFamily: 'monospace', marginBottom: 12, textAlign: 'center' },
  scoreRow:   { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  scoreDate:  { color: '#444', fontSize: 11, fontFamily: 'monospace' },
  scoreVal:   { color: '#00f5d4', fontSize: 14, fontWeight: 800, fontFamily: 'monospace' },

  btn:        { backgroundColor: '#ff3864', color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: 2, padding: '20px 52px', borderRadius: 60, border: 'none', boxShadow: '0 0 20px #ff3864', cursor: 'pointer' },
  subHint:    { color: '#666', fontSize: 13, marginTop: 20, fontFamily: 'monospace', letterSpacing: 1 },
  
  devNote:     { display: 'flex', gap: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: 12, marginTop: 40, maxWidth: 400, border: '1px border-style: dashed', borderColor: '#333' },
  devNoteIcon: { fontSize: 18 },
  devNoteText: { color: '#666', fontSize: 11, lineHeight: 1.5, margin: 0, fontStyle: 'italic' },
  
  privacy:    { color: '#333', fontSize: 11, marginTop: 20, fontFamily: 'monospace', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 },

  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:        { backgroundColor: '#111', border: '2px solid #ff3864', borderRadius: 24, padding: 32, maxWidth: 340, textAlign: 'center', boxShadow: '0 0 40px rgba(255,56,100,0.3)' },
  modalTitle:   { color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 16 },
  modalBody:    { color: '#aaa', fontSize: 14, lineHeight: 1.6, marginBottom: 24, textAlign: 'left' },
  modalBtn:     { backgroundColor: '#00f5d4', color: '#000', fontSize: 16, fontWeight: 900, padding: '16px 32px', borderRadius: 40, border: 'none', cursor: 'pointer', boxShadow: '0 0 15px #00f5d4' },
};
