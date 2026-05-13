import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { GridMaterial } from '@babylonjs/materials';
import { RunnerCircuit, PrizeType, Prize } from './TrackBuilder';
import { NeckInput } from '../science/NeckMovements';

export interface FrameInfo {
  progress: number;
  timeLeft: number;
  speed: number;
  score: number;
  cornerCue: string | null;
  activeMovement: string;
  isGameOver: boolean;
}

export class BabylonRenderer {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera!: BABYLON.TargetCamera;
  private car!: BABYLON.Mesh;
  private circuit: RunnerCircuit;
  private totalLen: number;

  private carProgress = 0;
  private carLateral = 0;
  private carHeight = 0;
  private carSpeed = 0;
  private score = 0;
  private sessionStart = performance.now();
  private duration = 120; // 2 minutes

  private prizeMeshes: { mesh: BABYLON.Mesh, prize: Prize, collected: boolean }[] = [];

  constructor(canvas: HTMLCanvasElement, circuit: RunnerCircuit) {
    this.circuit = circuit;
    this.totalLen = circuit.length;
    this.carSpeed = circuit.baseSpeed;
    
    this.engine = new BABYLON.Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.05, 1); // Dark grey background

    this.setupLighting();
    this.setupRoad();
    this.setupCar();
    this.setupCamera();
    this.setupEnvironment();
    this.setupPrizes();
    this.setupPostProcessing();

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupLighting() {
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
    light.intensity = 0.2; // Significantly darker ambient light
    light.groundColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    const dirLight = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(-1, -2, 1), this.scene);
    dirLight.position = new BABYLON.Vector3(20, 40, -20);
    dirLight.intensity = 0.4; // Reduced directional intensity
  }

  private setupRoad() {
    const roadWidth = 20; 
    const roadDepth = this.totalLen + 1000;
    // Subdivided ground for terrain deformation
    const subdivisions = Math.floor(roadDepth / 10);
    const road = BABYLON.MeshBuilder.CreateGround("road", { 
      width: roadWidth * 2, 
      height: roadDepth, 
      subdivisions: subdivisions,
      updatable: true 
    }, this.scene);
    road.position.z = this.totalLen / 2;
    
    // Deform for valleys
    const positions = road.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const z = positions[i + 2] + (this.totalLen / 2); // World Z
        const height = this.getRoadHeight(z);
        positions[i + 1] = height;
      }
      road.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    }

    const gridMat = new GridMaterial("gridMat", this.scene);
    gridMat.mainColor = new BABYLON.Color3(0.01, 0.01, 0.02);
    gridMat.lineColor = new BABYLON.Color3(1, 0, 1); // Neon Magenta grid
    gridMat.gridRatio = 5;
    gridMat.majorUnitFrequency = 1;
    gridMat.opacity = 0.9;
    road.material = gridMat;

    // Lane markers following terrain
    this.createLaneMarkers(roadWidth);
  }

  private createLaneMarkers(laneWidth: number) {
    const pointsL: BABYLON.Vector3[] = [];
    const pointsR: BABYLON.Vector3[] = [];
    const step = 10;
    for (let z = 0; z <= this.totalLen + 500; z += step) {
      pointsL.push(new BABYLON.Vector3(-laneWidth / 2, this.getRoadHeight(z) + 0.1, z));
      pointsR.push(new BABYLON.Vector3(laneWidth / 2, this.getRoadHeight(z) + 0.1, z));
    }
    
    const leftEdge = BABYLON.MeshBuilder.CreateLines("leftEdge", { points: pointsL }, this.scene);
    const rightEdge = BABYLON.MeshBuilder.CreateLines("rightEdge", { points: pointsR }, this.scene);
    
    const edgeColor = new BABYLON.Color3(0, 1, 1);
    leftEdge.color = edgeColor;
    rightEdge.color = edgeColor;
  }

  private getRoadHeight(z: number): number {
    let height = 0;
    const valleyDepth = -4;
    const valleyWidth = 60;

    for (const pr of this.circuit.prizes) {
      if (pr.type === 'LOW') {
        const centerZ = pr.t * this.totalLen;
        const dist = Math.abs(z - centerZ);
        if (dist < valleyWidth / 2) {
          // Smooth cosine valley
          const normDist = dist / (valleyWidth / 2);
          const factor = (Math.cos(normDist * Math.PI) + 1) / 2;
          height += valleyDepth * factor;
        }
      }
    }
    return height;
  }

  private setupCar() {
    // Body
    this.car = BABYLON.MeshBuilder.CreateBox("carBody", { width: 1.6, height: 0.4, depth: 4 }, this.scene);
    this.car.position.y = 0.2;

    const carMat = new BABYLON.StandardMaterial("carMat", this.scene);
    carMat.diffuseColor = new BABYLON.Color3(0, 0, 0); 
    carMat.emissiveColor = new BABYLON.Color3(0.1, 0, 0.2); 
    this.car.material = carMat;

    // Neon Stripes
    const stripeL = BABYLON.MeshBuilder.CreateBox("stripeL", { width: 0.1, height: 0.05, depth: 4 }, this.scene);
    stripeL.position.set(-0.6, 0.21, 0);
    stripeL.parent = this.car;
    const stripeMat = new BABYLON.StandardMaterial("stripeMat", this.scene);
    stripeMat.emissiveColor = new BABYLON.Color3(0, 1, 1); // Neon Cyan
    stripeL.material = stripeMat;

    const stripeR = stripeL.clone("stripeR");
    stripeR.position.x = 0.6;

    // Cockpit / Accent
    const accent = BABYLON.MeshBuilder.CreateBox("carAccent", { width: 1.0, height: 0.2, depth: 1.5 }, this.scene);
    accent.position.set(0, 0.3, 0.5);
    accent.parent = this.car;

    const accentMat = new BABYLON.StandardMaterial("accentMat", this.scene);
    accentMat.emissiveColor = new BABYLON.Color3(1, 0, 1); // Bright Magenta
    accent.material = accentMat;
  }

  private setupCamera() {
    this.camera = new BABYLON.TargetCamera("cam", new BABYLON.Vector3(0, 6, -14), this.scene);
    this.camera.setTarget(new BABYLON.Vector3(0, 0, 10));
  }

  private setupEnvironment() {
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogColor = new BABYLON.Color3(0.02, 0.01, 0.04); // Deep midnight purple
    this.scene.fogDensity = 0.004;

    this.scene.clearColor = new BABYLON.Color4(0.02, 0.01, 0.04, 1);

    // Retro Sun
    const sun = BABYLON.MeshBuilder.CreateDisc("sun", { radius: 200, tessellation: 64 }, this.scene);
    sun.position = new BABYLON.Vector3(0, 40, 5000); 
    
    const sunMat = new BABYLON.StandardMaterial("sunMat", this.scene);
    sunMat.emissiveColor = new BABYLON.Color3(1, 0.2, 0.5); // Synthwave Pink/Orange
    sunMat.disableLighting = true;
    sun.material = sunMat;

    // Add a second layer for a "glow" effect on the sun
    const sunGlow = sun.clone("sunGlow");
    sunGlow.scaling.scaleInPlace(1.1);
    const sunGlowMat = new BABYLON.StandardMaterial("sunGlowMat", this.scene);
    sunGlowMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0.5);
    sunGlowMat.alpha = 0.4;
    sunGlow.material = sunGlowMat;
  }

  private setupPrizes() {
    const goldMat = new BABYLON.StandardMaterial("goldMat", this.scene);
    goldMat.emissiveColor = new BABYLON.Color3(1, 1, 0); // Neon Gold/Yellow

    for (const pr of this.circuit.prizes) {
      const z = pr.t * this.totalLen;
      const roadY = this.getRoadHeight(z);
      
      const cube = BABYLON.MeshBuilder.CreateBox("prize", { size: 1.2 }, this.scene);
      
      let y = roadY + 2.2; // Default "Mid" height

      if (pr.type === 'HIGH') {
        y = roadY + 5.0; 
      } else if (pr.type === 'LOW') {
        y = roadY + 0.5;
      } else if (pr.type === 'SIDE_L' || pr.type === 'SIDE_R') {
        y = roadY + 1.2; // Slightly lower for lateral steering
      }

      cube.position.set(pr.x, y, z);
      cube.material = goldMat;
      
      this.prizeMeshes.push({ mesh: cube, prize: pr, collected: false });
    }
  }

  private setupPostProcessing() {
    const gl = new BABYLON.GlowLayer("glow", this.scene);
    gl.intensity = 1.4;
  }

  update(neck: NeckInput, dt: number): FrameInfo {
    const elapsed = (performance.now() - this.sessionStart) / 1000;
    const timeLeft = Math.max(0, this.duration - elapsed);
    
    this.carProgress += (this.carSpeed * dt) / this.totalLen;
    this.carProgress = Math.min(1, this.carProgress);

    // Lateral (Rotation)
    const targetLat = (neck.rotationR - neck.rotationL) * 10;
    this.carLateral += (targetLat - this.carLateral) * Math.min(1, dt * 5);

    // Height (Extension/Flexion) sampling from road
    const zPos = this.carProgress * this.totalLen;
    const roadY = this.getRoadHeight(zPos);

    const jumpHeight = neck.extension * 2.8;
    const slideDrop = neck.flexion * 1.7; 
    this.carHeight = jumpHeight - slideDrop;

    this.car.position.set(this.carLateral, roadY + 2.2 + this.carHeight, zPos);
    
    // Add visual rotation feedback to the car
    const rotationFactor = neck.rotationR - neck.rotationL;
    this.car.rotation.y = rotationFactor * 0.4; // Yaw
    this.car.rotation.z = -rotationFactor * 0.2; // Roll tilt
    
    // Animation: Rotate prizes
    for (const pm of this.prizeMeshes) {
      if (!pm.collected) {
        pm.mesh.rotation.y += dt * 2;
        pm.mesh.rotation.x += dt * 0.5;

        // Collision detection
        const dist = BABYLON.Vector3.Distance(this.car.position, pm.mesh.position);
        if (dist < 2.5) {
          pm.collected = true;
          pm.mesh.isVisible = false;
          this.score += 100;
        }
      }
    }

    // Camera follows car and terrain
    const camY = Math.max(2, roadY + 5);
    this.camera.position.set(this.carLateral * 0.4, camY, zPos - 16);
    this.camera.setTarget(new BABYLON.Vector3(0, roadY + 1, zPos + 30));

    // Get active cue
    let cornerCue: string | null = null;
    for (const pr of this.circuit.prizes) {
      const dz = Math.abs(pr.t * this.totalLen - zPos);
      if (dz < 40 && !this.prizeMeshes.find(m => m.prize === pr)?.collected) { 
        cornerCue = pr.text; 
        break; 
      }
    }

    const axes: (keyof NeckInput)[] = ['rotationL','rotationR','extension','flexion','lateralL','lateralR'];
    let dominant = '', domV = 0.2;
    for (const ax of axes) { if ((neck[ax] ?? 0) > domV) { domV = neck[ax]; dominant = ax; } }

    return {
      progress: this.carProgress,
      timeLeft,
      score: this.score,
      speed: Math.round(this.carSpeed * 3.6),
      cornerCue,
      activeMovement: dominant,
      isGameOver: timeLeft <= 0 || this.carProgress >= 1
    };
  }

  destroy() {
    this.engine.dispose();
  }
}
