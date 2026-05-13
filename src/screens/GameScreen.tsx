import { useRef, useEffect, useCallback, useState } from 'react';
import { useHeadTracker } from '../hooks/useHeadTracker';
import { buildRunnerTrack } from '../engine/TrackBuilder';
import { BabylonRenderer as GameRenderer } from '../engine/BabylonRenderer';
import { SoundManager } from '../engine/SoundManager';
import type { NeckInput } from '../science/NeckMovements';

export interface RaceResult {
  movementCoverage: Record<string, number>;
  stars: 1 | 2 | 3;
  score: number;
}

const MOVEMENT_LABELS: Record<string, string> = {
  rotationR:  '↪️ Follow Right',
  rotationL:  '↩️ Follow Left',
  extension:  '☝️ Reach High',
  flexion:    '👇 Reach Low',
  lateralL:   '⬅️ Tilt left',
  lateralR:   '➡️ Tilt right',
};

function fmtTime(s: number) {
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export default function GameScreen({ onRaceEnd, onQuit }: { onRaceEnd: (r: RaceResult) => void; onQuit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const { neckInput, isReady, cameraError, restWarning, autoCalibrate } = useHeadTracker(videoRef);

  const rendererRef    = useRef<GameRenderer | null>(null);
  const soundRef       = useRef<SoundManager | null>(null);
  const rafRef         = useRef<number>(0);
  const lastTimeRef    = useRef<number>(0);
  const neckRef        = useRef<NeckInput>(neckInput);
  const movementSecs   = useRef<Record<string, number>>({
    rotationL: 0, rotationR: 0, extension: 0, flexion: 0, lateralL: 0, lateralR: 0,
  });

  const [speed,          setSpeed]          = useState(0);
  const [score,          setScore]          = useState(0);
  const [timeLeft,       setTimeLeft]       = useState(120);
  const [progress,       setProgress]       = useState(0);
  const [cornerCue,     setCornerCue]       = useState<string | null>(null);
  const [activeMove,    setActiveMove]      = useState('');
  const [calibrating,   setCalibrating]     = useState(true);
  const [calibCountdown,setCalibCountdown]  = useState(3);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => { neckRef.current = neckInput; }, [neckInput]);

  useEffect(() => {
    if (!calibrating || calibCountdown <= 0) return;
    const t = setTimeout(() => setCalibCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [calibrating, calibCountdown]);

  const handleFinish = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    cancelAnimationFrame(rafRef.current);
    soundRef.current?.stop();
    const coverage = { ...movementSecs.current };
    const info = renderer.update(neckRef.current, 0);
    const usedAxes = Object.values(coverage).filter(v => v > 5).length;
    const stars: 1 | 2 | 3 = usedAxes >= 4 ? 3 : usedAxes >= 2 ? 2 : 1;
    onRaceEnd({ movementCoverage: coverage, stars, score: info.score });
  }, [onRaceEnd]);

  const loop = useCallback((now: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = now;
    const neck = neckRef.current;

    const info = renderer.update(neck, dt);

    setSpeed(info.speed);
    setScore(info.score);
    setTimeLeft(info.timeLeft);
    setProgress(info.progress);
    setCornerCue(info.cornerCue);

    // Audio update
    if (soundRef.current) {
      soundRef.current.update(info.speed);
      if (neck.extension > 0.7 && movementSecs.current.extension < 0.1) soundRef.current.playEffect('jump');
      if (neck.flexion > 0.7 && movementSecs.current.flexion < 0.1) soundRef.current.playEffect('slide');
    }

    // Track movement
    const axes: (keyof NeckInput)[] = ['rotationL','rotationR','extension','flexion','lateralL','lateralR'];
    for (const ax of axes) {
      if ((neck[ax] ?? 0) > 0.25) movementSecs.current[ax] = (movementSecs.current[ax] ?? 0) + dt;
    }
    setActiveMove(info.activeMovement);

    if (info.isGameOver) {
      handleFinish();
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [handleFinish]);

  useEffect(() => {
    if (!isReady || !canvasRef.current) return;
    const circuit = buildRunnerTrack();
    rendererRef.current = new GameRenderer(canvasRef.current, circuit);
    soundRef.current = new SoundManager();

    setCalibrating(true);
    setCalibCountdown(3);
    autoCalibrate().then(() => {
      setCalibrating(false);
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    });

    return () => { 
      cancelAnimationFrame(rafRef.current); 
      rendererRef.current?.destroy(); 
      soundRef.current?.stop();
    };
  }, [isReady, autoCalibrate, loop]);

  return (
    <div style={s.container}>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Loading */}
      {!isReady && !cameraError && (
        <div style={s.overlay}>
          <div style={s.overlayCard}>
            <p style={s.overlayTitle}>Setting up camera…</p>
            <p style={s.overlayHint}>Allow camera access when your browser asks.</p>
            <p style={s.overlayPrivacy}>All processing is local — no video is recorded or sent anywhere.</p>
          </div>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div style={s.overlay}>
          <div style={s.overlayCard}>
            <p style={s.overlayTitle}>⚠️ Camera needed</p>
            <p style={s.overlayHint}>{cameraError}</p>
          </div>
        </div>
      )}

      {/* Calibration */}
      {isReady && calibrating && (
        <div style={s.overlay}>
          <div style={s.overlayCard}>
            <p style={s.overlayTitle}>Hold your head straight</p>
            <p style={s.overlayTimer}>{calibCountdown}</p>
            <p style={s.overlayHint}>Setting your neutral head position…</p>
          </div>
        </div>
      )}

      {/* Instructions panel */}
      {isReady && !calibrating && showInstructions && (
        <div style={s.instructions}>
          <p style={s.instrTitle}>PRIZE RUN</p>
          <div style={s.instrGrid}>
            <span style={s.instrIcon}>↩️</span><span style={s.instrText}>Look LEFT  → follow left trail</span>
            <span style={s.instrIcon}>↪️</span><span style={s.instrText}>Look RIGHT → follow right trail</span>
            <span style={s.instrIcon}>☝️</span><span style={s.instrText}>Chin UP    → collect high prizes</span>
            <span style={s.instrIcon}>👇</span><span style={s.instrText}>Chin DOWN  → collect low prizes</span>
          </div>
          <p style={s.instrSub}>Navigate with your neck to collect cubes!</p>
          <button style={s.instrDismiss} onClick={() => setShowInstructions(false)}>START COLLECTING</button>
        </div>
      )}

      {/* Active HUD */}
      {isReady && !calibrating && (
        <>
          {/* Top bar */}
          <div style={s.hud}>
            {/* Timer */}
            <div style={s.hudBlock}>
              <span style={s.hudLabel}>TIME LEFT</span>
              <span style={s.hudBig}>{fmtTime(timeLeft)}</span>
            </div>

            {/* Score */}
            <div style={s.hudBlock}>
              <span style={s.hudLabel}>SCORE</span>
              <span style={{...s.hudBig, color: '#ffd700'}}>{score}</span>
            </div>

            {/* Progress Bar */}
            <div style={{ ...s.hudBlock, flex: 1, margin: '0 20px' }}>
              <span style={s.hudLabel}>SESSION PROGRESS</span>
              <div style={s.progressBar}>
                <div style={{ ...s.progressFill, width: `${progress * 100}%` }} />
              </div>
            </div>

            {/* Speed */}
            <div style={s.hudBlock}>
              <span style={s.hudLabel}>KM/H</span>
              <span style={s.hudBig}>{speed}</span>
            </div>
          </div>

          {/* Corner instruction */}
          {cornerCue && (
            <div style={s.cornerCue}>
              <span style={s.cornerCueText}>{cornerCue}</span>
            </div>
          )}

          {/* Active movement label */}
          {activeMove && (
            <div style={s.movePill}>
              <span style={s.moveText}>{MOVEMENT_LABELS[activeMove] ?? activeMove}</span>
            </div>
          )}

          {/* Rest warning */}
          {restWarning && (
            <div style={s.restBanner}>
              <span style={s.restText}>⏸ Relax &amp; recenter</span>
            </div>
          )}

          {/* Instructions toggle + Finish */}
          <div style={s.bottomBar}>
            <button style={s.ctaBtn} onClick={() => setShowInstructions(v => !v)}>Controls</button>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button style={{ ...s.ctaBtn, borderColor: '#444', color: '#888' }} onClick={onQuit}>Quit</button>
              <NeckCompass neck={neckInput} />
              <button style={s.ctaBtn} onClick={handleFinish}>Finish</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NeckCompass({ neck }: { neck: NeckInput }) {
  const arrows = [
    { key: 'extension',  label: '↑', active: neck.extension  > 0.25 },
    { key: 'flexion',    label: '↓', active: neck.flexion    > 0.25 },
    { key: 'lateralL',  label: '←', active: neck.lateralL   > 0.25 },
    { key: 'lateralR',  label: '→', active: neck.lateralR   > 0.25 },
    { key: 'rotationL', label: '↺', active: neck.rotationL  > 0.25 },
    { key: 'rotationR', label: '↻', active: neck.rotationR  > 0.25 },
  ];
  return (
    <div style={s.compass}>
      {arrows.map(a => (
        <span key={a.key} style={{ ...s.arrow, ...(a.active ? s.arrowOn : {}) }}>{a.label}</span>
      ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { position: 'relative', width: '100%', height: '100%', backgroundColor: '#050508', userSelect: 'none' },
  canvas:    { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' },

  // Overlays
  overlay:        { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,5,10,0.95)', zIndex: 20 },
  overlayCard:    { backgroundColor: '#0a0a0f', borderRadius: 24, padding: '48px 40px', border: '1px solid #ff3864', textAlign: 'center', maxWidth: 380, boxShadow: '0 0 20px rgba(255,56,100,0.3)' },
  overlayTitle:   { color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: 2, marginBottom: 16, textShadow: '0 0 10px #ff3864' },
  overlayTimer:   { color: '#00f5d4', fontSize: 72, fontWeight: 900, lineHeight: 1, margin: '8px 0 20px', textShadow: '0 0 20px #00f5d4' },
  overlayHint:    { color: '#888', fontSize: 13, lineHeight: 1.6, fontFamily: 'monospace' },
  overlayPrivacy: { color: '#444', fontSize: 11, lineHeight: 1.6, fontFamily: 'monospace', marginTop: 16 },

  // Instructions panel
  instructions: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', backgroundColor: 'rgba(5,5,10,0.95)', border: '2px solid #00f5d4', borderRadius: 20, padding: '32px 40px', zIndex: 15, minWidth: 320, textAlign: 'center', boxShadow: '0 0 30px rgba(0,245,212,0.2)' },
  instrTitle:   { color: '#00f5d4', fontSize: 14, fontWeight: 900, letterSpacing: 4, marginBottom: 20, textShadow: '0 0 8px #00f5d4' },
  instrGrid:    { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', marginBottom: 20, textAlign: 'left' },
  instrIcon:    { fontSize: 22, textAlign: 'center' },
  instrText:    { color: '#fff', fontSize: 14, fontFamily: 'monospace', alignSelf: 'center' },
  instrSub:     { color: '#777', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 20 },
  instrDismiss: { backgroundColor: '#ff3864', color: '#fff', fontSize: 14, fontWeight: 800, padding: '12px 32px', borderRadius: 40, cursor: 'pointer', letterSpacing: 1, border: 'none', boxShadow: '0 0 15px #ff3864' },

  // HUD
  hud:      { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: 'rgba(0,0,0,0.85)', borderBottom: '1px solid #333' },
  hudBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 },
  hudLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 3, fontFamily: 'monospace', fontWeight: 700 },
  hudBig:   { color: '#00f5d4', fontSize: 28, fontWeight: 900, letterSpacing: 2, fontFamily: 'monospace', textShadow: '0 0 10px #00f5d4' },
  hudSub:   { color: '#ff3864', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },

  progressBar: { width: '100%', height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, marginTop: 8, overflow: 'hidden', border: '1px solid #333' },
  progressFill: { height: '100%', backgroundColor: '#ff3864', borderRadius: 6, transition: 'width 0.3s ease-out', boxShadow: '0 0 10px #ff3864' },

  // Corner cue banner (Top Right)
  cornerCue:     { position: 'absolute', top: 88, right: 24, textAlign: 'right', backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: '12px 20px', border: '1px solid #ff3864', pointerEvents: 'none', boxShadow: '0 0 15px rgba(255,56,100,0.3)', zIndex: 10 },
  cornerCueText: { color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 1, textShadow: '0 0 8px #ff3864' },

  // Movement pill
  movePill: { position: 'absolute', top: 88, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,245,212,0.15)', borderRadius: 50, padding: '6px 20px', border: '1px solid #00f5d4', whiteSpace: 'nowrap', boxShadow: '0 0 10px rgba(0,245,212,0.3)' },
  moveText: { color: '#00f5d4', fontSize: 12, fontWeight: 800, letterSpacing: 1, textShadow: '0 0 5px #00f5d4' },

  // Off track
  offTrack: { position: 'absolute', inset: 0, backgroundColor: 'rgba(255,56,100,0.15)', border: '4px solid #ff3864', pointerEvents: 'none' },

  // Rest warning
  restBanner: { position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,200,0,0.15)', borderRadius: 12, padding: '12px 24px', border: '2px solid #ffd700', whiteSpace: 'nowrap', boxShadow: '0 0 15px rgba(255,215,0,0.3)' },
  restText:   { color: '#ffd700', fontSize: 14, fontWeight: 800, textShadow: '0 0 5px #ffd700' },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' },
  ctaBtn:    { backgroundColor: 'rgba(0,0,0,0.7)', color: '#00f5d4', fontSize: 12, fontFamily: 'monospace', letterSpacing: 1, padding: '10px 20px', borderRadius: 24, border: '1px solid #00f5d4', cursor: 'pointer', fontWeight: 700, boxShadow: '0 0 8px rgba(0,245,212,0.2)' },

  // Compass
  compass: { display: 'flex', gap: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 40, padding: '8px 20px', border: '1px solid #333' },
  arrow:   { color: 'rgba(255,255,255,0.15)', fontSize: 20, fontWeight: 900 },
  arrowOn: { color: '#ff3864', textShadow: '0 0 10px #ff3864' },
};
