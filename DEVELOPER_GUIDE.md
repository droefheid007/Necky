# Necky — Developer Guide
> React · Vite · BabylonJS · MediaPipe Face Landmarker

---

## Folder Structure

```
Necky/
├── index.html                       ← Web entry point
├── package.json
├── vite.config.ts                   ← Vite configuration (Port 5173 / Strict)
│
└── src/
    ├── science/
    │   └── NeckMovements.ts         ← MOVEMENT LOGIC
    │                                   Ranges, safety caps, sensor normalization
    │
    ├── hooks/
    │   └── useHeadTracker.ts        ← MediaPipe → NeckInput
    │                                   Strict offline model loading, filtering
    │
    ├── engine/
    │   ├── TrackBuilder.ts          ← Procedural Prize Placement
    │                                   Diagonal trails, valleys, random seeding
    │   ├── BabylonRenderer.ts       ← BabylonJS 3D Scene
    │                                   Terrain deformation, car physics, collection logic
    │   └── SoundManager.ts          ← Procedural Web Audio
    │                                   Engine hum, wind, effects
    │
    └── screens/
        ├── HomeScreen.tsx           ← High Scores, Legal Consent, Dev Note
        ├── GameScreen.tsx           ← Canvas wrapper + HUD + Prize cues
        ├── ResultScreen.tsx         ← Score breakdown & movement coverage
        └── WarmupScreen.tsx         ← Guided movement tutorials
```

---

## Neck Movements → Game Mechanics Map

| Movement | Face Pose | Game Effect | Prize Type |
|---|---|---|---|
| **Chin Up** (extension) | Pitch < 0 | Car jumps / climbs | `HIGH` |
| **Chin Down** (flexion) | Pitch > 0 | Car descends into Valleys | `LOW` |
| **Look Left** (rotation) | Yaw < 0 | Car steers & yaws left | `ROT_L` |
| **Look Right** (rotation) | Yaw > 0 | Car steers & yaws right | `ROT_R` |

*Note: All movement trails are generated using a **Diagonal Cross** pattern (e.g., Sweep Right starts at Left edge and moves to Right edge) to ensure a safe, full range of motion within the road boundaries.*

---

## Technical Stack

- **Framework**: React 18.3 (Pinned)
- **Build Tool**: Vite 8.0 (Rolldown engine + OXC plugin)
- **3D Engine**: BabylonJS 9.x (Pinned)
- **Tracking**: MediaPipe Face Landmarker (Strict Offline Loading)
- **Audio**: Web Audio API (Procedural engine/wind)

---

## Setup & Development

```bash
# 1. Install dependencies
npm install

# 2. Offline model setup (MANDATORY)
# Downloads MediaPipe models to the public/ folder
npm run setup:offline

# 3. Start development server
# Automatically kills any stuck ports on 5173 before starting
npm run dev

# 4. Force Stop
# Kills all active game processes manually
npm run stop
```

---

## Safety Disclaimer

> Necky is an arcade game intended for entertainment and as a simple attempt to relax stiff neck muscles. It does not provide medical advice. Consult a healthcare professional if you have persistent pain. Stop immediately if you experience dizziness or discomfort.
