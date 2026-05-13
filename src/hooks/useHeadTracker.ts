/**
 * useHeadTracker.ts
 * Replaces useNeckSensor (phone gyroscope) with webcam head pose via MediaPipe.
 * All processing is local — no video frames leave the browser.
 *
 * MediaPipe YXZ Euler convention used here:
 *   euler.x > 0  → chin down  (flexion)
 *   euler.x < 0  → chin up    (extension)
 *   euler.y > 0  → look right (rotationR)
 *   euler.y < 0  → look left  (rotationL)
 *   euler.z > 0  → left ear to shoulder  (lateralL)
 *   euler.z < 0  → right ear to shoulder (lateralR)
 *
 * If any axis feels inverted during play, flip the sign on that delta.
 */
import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { NeckInput, MOVEMENT_RANGES, FILTER_ALPHA } from '../science/NeckMovements';

// MediaPipe paths — resolved relative to the app's base URL for correct hosting under a subpath
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const LOCAL_WASM_PATH  = `${BASE}/wasm`;
const LOCAL_MODEL_PATH = `${BASE}/face_landmarker.task`;

type Baseline = { pitch: number; yaw: number; roll: number } | null;

export function useHeadTracker(videoRef: RefObject<HTMLVideoElement>) {
  const [neckInput, setNeckInput] = useState<NeckInput>({
    flexion: 0, extension: 0, lateralL: 0, lateralR: 0, rotationL: 0, rotationR: 0,
  });
  const [isReady, setIsReady]       = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [restWarning, setRestWarning] = useState<string | null>(null);

  const landmarkerRef   = useRef<FaceLandmarker | null>(null);
  const baseline        = useRef<Baseline>(null);
  const filtered        = useRef({ pitch: 0, yaw: 0, roll: 0 });
  const holdTimer       = useRef<Record<string, number>>({});
  const rafRef          = useRef<number>(0);
  const lastVideoTime   = useRef(-1);

  // Call this while the user holds their head straight.
  // Waits 3 s of readings then locks in the baseline.
  const autoCalibrate = useCallback(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 3000));
    baseline.current = { ...filtered.current };
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      // 1. Camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
      } catch {
        setCameraError('Camera access denied — click Allow when the browser asks.');
        return;
      }
      if (!active || !videoRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // 2. MediaPipe FaceLandmarker (Strict Offline/Local)
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);
        const faceLandmarker  = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: LOCAL_MODEL_PATH, delegate: 'GPU' },
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        
        if (!active) {
          faceLandmarker.close();
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        landmarkerRef.current = faceLandmarker;
        setIsReady(true);
      } catch (e) {
        console.error("Critical: Local MediaPipe models not found.", e);
        setCameraError('Failed to load tracking models. If running locally, run "npm run setup:offline" and restart. If using the hosted version, try refreshing or clearing your browser cache.');
        return;
      }

      // 3. Per-frame detection loop
      function detect() {
        if (!active || !landmarkerRef.current || !videoRef.current) return;
        const video = videoRef.current;
        if (video.readyState < 2 || video.currentTime === lastVideoTime.current) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }
        lastVideoTime.current = video.currentTime;

        const result = landmarkerRef.current.detectForVideo(video, performance.now());
        const mxs    = result.facialTransformationMatrixes;

        if (mxs && mxs.length > 0) {
          const m = mxs[0].data; // Float32Array, column-major 4×4

          // Decompose rotation via THREE.js — avoids manual trig
          const mat4 = new THREE.Matrix4();
          mat4.set(
            m[0], m[4], m[8],  m[12],
            m[1], m[5], m[9],  m[13],
            m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15],
          );
          const euler = new THREE.Euler();
          euler.setFromRotationMatrix(mat4, 'YXZ');

          // Low-pass filter per axis
          const f = filtered.current;
          f.pitch = f.pitch * (1 - FILTER_ALPHA) + euler.x * FILTER_ALPHA;
          f.yaw   = f.yaw   * (1 - FILTER_ALPHA) + euler.y * FILTER_ALPHA;
          f.roll  = f.roll  * (1 - FILTER_ALPHA) + euler.z * FILTER_ALPHA;

          // Seed baseline from first valid reading
          if (!baseline.current) {
            baseline.current = { pitch: f.pitch, yaw: f.yaw, roll: f.roll };
          }

          const b      = baseline.current;
          const dPitch = f.pitch - b.pitch;
          const dYaw   = -(f.yaw   - b.yaw);
          const dRoll  = f.roll  - b.roll;

          const clamp = (v: number) => Math.max(0, Math.min(1, v));
          const M     = MOVEMENT_RANGES;

          const input: NeckInput = {
            flexion:   clamp( dPitch / M.beta_flexion_rad),
            extension: clamp(-dPitch / M.beta_extension_rad),
            rotationR: clamp( dYaw   / M.alpha_rotation_rad),
            rotationL: clamp(-dYaw   / M.alpha_rotation_rad),
            lateralL:  clamp( dRoll  / M.gamma_lateral_rad),
            lateralR:  clamp(-dRoll  / M.gamma_lateral_rad),
          };

          // Hold warning: same axis > 0.7 for more than 4 s
          const now  = Date.now();
          const axes = Object.keys(input) as (keyof NeckInput)[];
          let warned: string | null = null;
          for (const axis of axes) {
            if (input[axis] > 0.7) {
              holdTimer.current[axis] ??= now;
              if (now - holdTimer.current[axis] > 4000) warned = axis;
            } else {
              holdTimer.current[axis] = 0;
            }
          }

          setRestWarning(warned);
          setNeckInput(input);
        }

        rafRef.current = requestAnimationFrame(detect);
      }
      detect();
    }

    init();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []); // videoRef is a stable ref object

  return { neckInput, isReady, cameraError, restWarning, autoCalibrate };
}
