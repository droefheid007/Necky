/**
 * TrackBuilder.ts — Refactored for Infinite Runner Style.
 * 
 * The track is now perfectly straight. 
 * "Curves" are replaced with distinct obstacle types that require specific neck movements:
 * - Extension (Chin Up)   → Jump over a hurdle
 * - Flexion (Chin Down)   → Slide under a low gate
 * - Rotation (Look L/R)   → Shift lanes to avoid barriers
 */

/**
 * TrackBuilder.ts — Refactored for Prize Collection.
 * 
 * Instead of avoiding obstacles, the user collects prizes (cubes).
 * Prizes are placed to encourage specific therapeutic neck movements.
 */

export type PrizeType = 'NONE' | 'HIGH' | 'LOW' | 'ROT_L' | 'ROT_R';

export interface Prize {
  t: number;          // 0..1 position on the 2-minute track
  x: number;          // Lateral position (-10 to 10)
  type: PrizeType;
  text: string;
}

export interface RunnerCircuit {
  name: string;
  length: number;     // Total world units for 2 minutes
  prizes: Prize[];
  baseSpeed: number;
}

export function buildRunnerTrack(): RunnerCircuit {
  const seed = Math.random() * 1000000;
  const rand = () => {
    const x = Math.sin(seed + currentPos) * 10000;
    return x - Math.floor(x);
  };

  const baseSpeed = 18;
  const duration = 120; // 2 minutes
  const totalLength = baseSpeed * duration;
  const prizes: Prize[] = [];
  
  let currentPos = 150; 

  const types: PrizeType[] = ['HIGH', 'LOW', 'ROT_L', 'ROT_R'];

  // Stop 5 seconds before the end
  const stopPos = totalLength - (baseSpeed * 5);

  while (currentPos < stopPos) {
    const r = rand();
    const type = types[Math.floor(r * types.length)];
    const trailGap = 15;

    if (type === 'HIGH') {
      for (let i = 0; i < 4; i++) {
        prizes.push({ t: (currentPos + i * trailGap) / totalLength, x: 0, type: 'HIGH', text: '☝️ REACH HIGH — Chin UP' });
      }
      currentPos += 80;
    } else if (type === 'LOW') {
      for (let i = 0; i < 4; i++) {
        prizes.push({ t: (currentPos + i * trailGap) / totalLength, x: 0, type: 'LOW', text: '👇 REACH LOW — Chin DOWN' });
      }
      currentPos += 80;
    } else if (type === 'ROT_L') {
      // Diagonal Cross: Start Right (8), Move Left (-8)
      for (let i = 0; i < 4; i++) {
        prizes.push({ 
          t: (currentPos + i * trailGap) / totalLength, 
          x: 8 - (i * 5.3), // 8, 2.7, -2.6, -8
          type: 'ROT_L', 
          text: '↩️ SWEEP LEFT — Rotate Head' 
        });
      }
      currentPos += 100;
    } else if (type === 'ROT_R') {
      // Diagonal Cross: Start Left (-8), Move Right (8)
      for (let i = 0; i < 4; i++) {
        prizes.push({ 
          t: (currentPos + i * trailGap) / totalLength, 
          x: -8 + (i * 5.3), 
          type: 'ROT_R', 
          text: '↪️ SWEEP RIGHT — Rotate Head' 
        });
      }
      currentPos += 100;
    }

    currentPos += 30 + (r * 30); 
  }

  return {
    name: 'Prize Run',
    length: totalLength,
    prizes,
    baseSpeed
  };
}
