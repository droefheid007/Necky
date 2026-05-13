import { useState, useCallback } from 'react';
import HomeScreen from './screens/HomeScreen';
import WarmupScreen from './screens/WarmupScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import type { RaceResult } from './screens/GameScreen';

type AppState = 'home' | 'warmup' | 'game' | 'result';

const root: React.CSSProperties = {
  width: '100vw', height: '100vh', backgroundColor: '#08080f', overflow: 'hidden',
};

export default function App() {
  const [screen, setScreen] = useState<AppState>('home');
  const [lastResult, setLastResult] = useState<RaceResult | null>(null);

  const handleStart = useCallback(() => {
    setScreen('warmup');
  }, []);

  const handleWarmupDone = useCallback(() => setScreen('game'), []);

  const handleRaceEnd = useCallback((result: RaceResult) => {
    const raw = localStorage.getItem('necky_scores');
    const scores: { date: string; score: number }[] = raw ? JSON.parse(raw) : [];
    
    scores.push({
      date: new Date().toISOString().slice(0, 10),
      score: result.score,
    });
    
    // Keep top 10 scores
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('necky_scores', JSON.stringify(scores.slice(0, 10)));
    
    setLastResult(result);
    setScreen('result');
  }, []);

  const handleHome = useCallback(() => setScreen('home'), []);
  const handleRerun = useCallback(() => setScreen('warmup'), []);

  switch (screen) {
    case 'home':
      return <div style={root}><HomeScreen onStart={handleStart} /></div>;
    case 'warmup':
      return <div style={root}><WarmupScreen onDone={handleWarmupDone} /></div>;
    case 'game':
      return <div style={root}><GameScreen onRaceEnd={handleRaceEnd} onQuit={handleHome} /></div>;
    case 'result':
      return <div style={root}>{lastResult && <ResultScreen result={lastResult} onHome={handleHome} onRerun={handleRerun} />}</div>;
  }
}
