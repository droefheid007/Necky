/**
 * NECK EXERCISE LOGIC — Necky
 * ──────────────────────────
 * This is a simple attempt to relax stiff neck muscles through gentle,
 * controlled movement. Based on general mobility guidelines.
 *
 * FIVE MOVEMENTS IN USE
 * ──────────────────────
 *
 * 1. CERVICAL FLEXION  — Chin tuck / chin down
 *    Sensor:  deviceMotion.rotation.beta drops (phone tilts forward as head nods)
 *    Range:   0°–45° therapeutic; game uses 0°–30° for comfort
 *    Muscles: Longus colli, longus capitis (deep neck flexors)
 *    Game:    Car descends into valley / tunnel. Encourages slow, controlled nod.
 *    Cue:     "Make a double chin" — the safest cervical flexion cue
 *
 * 2. CERVICAL EXTENSION — Chin lift / chin up
 *    Sensor:  deviceMotion.rotation.beta rises (phone tilts back as head extends)
 *    Range:   0°–45° therapeutic; game uses 0°–25° (less than flexion, safer)
 *    Muscles: Semispinalis capitis, splenius capitis
 *    Game:    Car crests a ramp / bridge. Encourages controlled extension.
 *    Cue:     "Lift your chin toward the ceiling slowly"
 *    Safety:  Extension is contraindicated in: vertebrobasilar insufficiency,
 *             acute disc herniation C5-C7. Shown as gentle prompt first.
 *
 * 3. LATERAL FLEXION LEFT — Left ear toward left shoulder
 *    Sensor:  deviceMotion.rotation.gamma < 0 (phone tilts left)
 *    Range:   0°–45° therapeutic; game uses 0°–30°
 *    Muscles: Left SCM, left scalenes, left upper trapezius
 *    Game:    Car avoids obstacle on right / weaves left between barriers
 *
 * 4. LATERAL FLEXION RIGHT — Right ear toward right shoulder
 *    Sensor:  deviceMotion.rotation.gamma > 0 (phone tilts right)
 *    Range:   0°–45° therapeutic; game uses 0°–30°
 *    Muscles: Right SCM, right scalenes, right upper trapezius
 *    Game:    Car avoids obstacle on left / weaves right
 *
 * 5. AXIAL ROTATION LEFT — Turn head left (look over left shoulder)
 *    Sensor:  deviceMotion.rotation.alpha decreases (yaw)
 *    Range:   0°–80° therapeutic; game uses 0°–45°
 *    Muscles: Left SCM, right splenius capitis (contralateral)
 *    Game:    Car turns left on a curve
 *
 * 6. AXIAL ROTATION RIGHT — Turn head right
 *    Sensor:  deviceMotion.rotation.alpha increases (yaw)
 *    Range:   0°–80° therapeutic; game uses 0°–45°
 *    Muscles: Right SCM, left splenius capitis
 *    Game:    Car turns right on a curve
 *
 * CALIBRATION PROTOCOL
 * ─────────────────────
 * On game start: 3-second still capture of all three axes.
 * All subsequent values are DELTA from baseline.
 * This accounts for: phone held at any angle, user posture, seated vs standing.
 *
 * SAFETY GUARD RAILS
 * ───────────────────
 * - Max movement per axis is capped at 35° in-game (never pushes to anatomical limit)
 * - Each movement is SMOOTH — raw sensor is low-pass filtered (α=0.15)
 * - Rest reminder shown if same movement held >4 seconds ("Relax & recenter")
 * - Day 1 = only flexion/extension (gentlest, teaching movement)
 * - Day 2 = adds lateral flexion
 * - Day 3–7 = full rotation added progressively
 * - Warmup screen (5 gentle reps shown as animation) before every race
 *
 * SENSOR FUSION MATH
 * ───────────────────
 * DeviceMotion gives us:
 *   rotation.alpha → yaw   (Z-axis) = HEAD ROTATION  (0–2π)
 *   rotation.beta  → pitch (X-axis) = FLEXION/EXTENSION (−π to π)
 *   rotation.gamma → roll  (Y-axis) = LATERAL FLEXION (−π/2 to π/2)
 *
 * Low-pass filter per axis:
 *   filtered = filtered * (1 - α) + raw * α   where α = 0.15
 *
 * Normalised output per movement (−1 to 1):
 *   flexion    = clamp(Δbeta  / 0.52, -1, 1)   // 0.52 rad ≈ 30°
 *   extension  = clamp(-Δbeta / 0.44, -1, 1)   // 0.44 rad ≈ 25°
 *   lateralL   = clamp(-Δgamma/ 0.52, -1, 1)
 *   lateralR   = clamp(Δgamma / 0.52, -1, 1)
 *   rotationL  = clamp(-Δalpha/ 0.79, -1, 1)   // 0.79 rad ≈ 45°
 *   rotationR  = clamp(Δalpha / 0.79, -1, 1)
 */

export type NeckInput = {
  flexion: number;     // 0..1  chin toward chest
  extension: number;  // 0..1  chin toward ceiling
  lateralL: number;   // 0..1  left ear to left shoulder
  lateralR: number;   // 0..1  right ear to right shoulder
  rotationL: number;  // 0..1  look left
  rotationR: number;  // 0..1  look right
};

export const MOVEMENT_RANGES = {
  beta_flexion_rad:   0.52,   // 30°
  beta_extension_rad: 0.44,   // 25°
  gamma_lateral_rad:  0.52,   // 30°
  alpha_rotation_rad: 0.79,   // 45°
};

export const FILTER_ALPHA = 0.15; // low-pass smoothing
