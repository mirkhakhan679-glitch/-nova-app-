import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface ThreeOrbProps {
  isSpeaking: boolean;
  isListening: boolean;
  audioAmplitude?: number; // 0.0 to 1.0
  className?: string;
}

export function ThreeOrb({ isSpeaking, isListening, audioAmplitude = 0, className = '' }: ThreeOrbProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ isSpeaking, isListening, audioAmplitude });

  useEffect(() => {
    stateRef.current = { isSpeaking, isListening, audioAmplitude };
  }, [isSpeaking, isListening, audioAmplitude]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL safely
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    // 3. Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Studio PBR Lighting Rig (Key, Fill, Rim)
    const warmKeyLight = new THREE.DirectionalLight(0xffd54f, 2.8);
    warmKeyLight.position.set(4, 5, 5);
    scene.add(warmKeyLight);

    const coolFillLight = new THREE.HemisphereLight(0x6a2bd9, 0x1b1464, 2.0);
    scene.add(coolFillLight);

    const goldenRimLight = new THREE.PointLight(0xffe9a8, 3.5, 15);
    goldenRimLight.position.set(-3, -2, -2);
    scene.add(goldenRimLight);

    // 5. Procedural Noise Texture for Plasma Glow
    function createPlasmaTexture() {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#ffe9a8');
        grad.addColorStop(0.7, '#ffb300');
        grad.addColorStop(1, '#6a2bd9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Add subtle procedural noise
        const imgData = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 25;
          imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
          imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    }

    const plasmaTexture = createPlasmaTexture();

    // 6. Build Composite 3-12 Part Procedural Celestial Orb
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // Part 1: Core Golden Sphere (Hero Primary Silhouette)
    const coreGeo = new THREE.SphereGeometry(1.4, 48, 48);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xffb300,
      emissive: 0xffa000,
      emissiveIntensity: 0.8,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    orbGroup.add(coreMesh);

    // Part 2: Radiant Outer Atmosphere Shell
    const shellGeo = new THREE.SphereGeometry(1.65, 36, 36);
    const shellMat = new THREE.MeshStandardMaterial({
      map: plasmaTexture,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
      metalness: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    orbGroup.add(shellMesh);

    // Part 3: Primary Celestial Ring (matching Nova logo angle -28 deg)
    const ring1Curve = new THREE.EllipseCurve(0, 0, 2.7, 1.1, 0, Math.PI * 2, false, 0);
    const ring1Points = ring1Curve.getPoints(80);
    const ring1Shape = new THREE.CatmullRomCurve3(ring1Points.map(p => new THREE.Vector3(p.x, p.y, 0)));
    const ring1Geo = new THREE.TubeGeometry(ring1Shape, 80, 0.055, 12, true);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: 0xffe9a8,
      emissive: 0xffd54f,
      emissiveIntensity: 0.4,
      metalness: 0.95,
      roughness: 0.15,
      clearcoat: 1.0,
    });
    const ring1Mesh = new THREE.Mesh(ring1Geo, ringMat);
    ring1Mesh.rotation.x = THREE.MathUtils.degToRad(68);
    ring1Mesh.rotation.z = THREE.MathUtils.degToRad(-28);
    orbGroup.add(ring1Mesh);

    // Part 4: Secondary Celestial Gyroscope Ring (45 deg angle)
    const ring2Curve = new THREE.EllipseCurve(0, 0, 2.9, 1.3, 0, Math.PI * 2, false, 0);
    const ring2Points = ring2Curve.getPoints(80);
    const ring2Shape = new THREE.CatmullRomCurve3(ring2Points.map(p => new THREE.Vector3(p.x, p.y, 0)));
    const ring2Geo = new THREE.TubeGeometry(ring2Shape, 80, 0.04, 12, true);
    const ring2Mat = new THREE.MeshPhysicalMaterial({
      color: 0xc4b5fd,
      emissive: 0x9333ea,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.25,
      clearcoat: 0.8,
    });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2Mesh.rotation.x = THREE.MathUtils.degToRad(45);
    ring2Mesh.rotation.y = THREE.MathUtils.degToRad(55);
    orbGroup.add(ring2Mesh);

    // Part 5: Orbiting Satellite Beacon (Moon / Spark from logo)
    const satelliteGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const satelliteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    const satelliteMesh = new THREE.Mesh(satelliteGeo, satelliteMat);
    orbGroup.add(satelliteMesh);

    // Part 6: Radiating Compass Ray Beacons (8 rays from logo)
    const raysGroup = new THREE.Group();
    orbGroup.add(raysGroup);
    const rayGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8);
    const rayMat = new THREE.MeshStandardMaterial({
      color: 0xffe9a8,
      emissive: 0xffd54f,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.2,
    });
    const rayCount = 8;
    const rayMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const rayMesh = new THREE.Mesh(rayGeo, rayMat);
      rayMesh.position.set(Math.cos(angle) * 2.3, Math.sin(angle) * 2.3, 0);
      rayMesh.rotation.z = angle - Math.PI / 2;
      raysGroup.add(rayMesh);
      rayMeshes.push(rayMesh);
    }

    // Part 7: Grounding Soft Radial Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d');
    if (sctx) {
      const sgrad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      sgrad.addColorStop(0, 'rgba(15, 10, 45, 0.65)');
      sgrad.addColorStop(0.5, 'rgba(15, 10, 45, 0.25)');
      sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = sgrad;
      sctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = -2.8;
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);

    // Part 8: Celestial Floating Particle Dust
    const particleCount = 100;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 8;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffe9a8,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Animation Loop with Exponential Damping & Software-WebGL Guard
    let frameId = 0;
    let clock = new THREE.Clock();
    let currentScale = 1.0;
    let currentEmissive = 0.8;
    let satelliteAngle = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const { isSpeaking: speaking, isListening: listening, audioAmplitude: amp } = stateRef.current;

      // Smooth exponential damping for pulse & reactivity
      let targetScale = 1.0;
      let targetEmissive = 0.8;
      let rotSpeed = 0.6;

      if (speaking) {
        // Active speaking: dynamic pulse with audio amplitude
        const voicePulse = Math.sin(time * 9) * 0.12 + (amp || 0.3) * 0.25;
        targetScale = 1.08 + voicePulse;
        targetEmissive = 1.6 + Math.sin(time * 12) * 0.4;
        rotSpeed = 1.8;
      } else if (listening) {
        // Listening: gentle expectant rhythm
        targetScale = 1.02 + Math.sin(time * 3) * 0.04;
        targetEmissive = 1.1;
        rotSpeed = 0.9;
      }

      currentScale = THREE.MathUtils.damp(currentScale, targetScale, 8, delta);
      currentEmissive = THREE.MathUtils.damp(currentEmissive, targetEmissive, 8, delta);

      coreMesh.scale.set(currentScale, currentScale, currentScale);
      shellMesh.scale.set(currentScale * 1.04, currentScale * 1.04, currentScale * 1.04);
      coreMat.emissiveIntensity = currentEmissive;

      // Rotate group and rings
      orbGroup.rotation.y += delta * rotSpeed * 0.5;
      ring1Mesh.rotation.z += delta * rotSpeed * 0.7;
      ring2Mesh.rotation.y += delta * rotSpeed * 0.6;
      shellMesh.rotation.y -= delta * 0.4;
      particles.rotation.y += delta * 0.1;

      // Orbit satellite along elliptical path
      satelliteAngle += delta * rotSpeed * 1.5;
      const satR1 = 2.7 * currentScale;
      const satR2 = 1.1 * currentScale;
      const satX = Math.cos(satelliteAngle) * satR1;
      const satY = Math.sin(satelliteAngle) * satR2;
      satelliteMesh.position.set(satX, satY, 0);
      satelliteMesh.position.applyAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(-28));
      satelliteMesh.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(68));

      // Dynamic expansion of compass rays
      const rayExpand = speaking ? 1 + (amp || 0.2) * 0.4 : 1;
      rayMeshes.forEach((ray, i) => {
        const baseAngle = (i / rayCount) * Math.PI * 2;
        const dist = 2.3 * rayExpand * currentScale;
        ray.position.set(Math.cos(baseAngle) * dist, Math.sin(baseAngle) * dist, 0);
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 360;
      const newH = container.clientHeight || 360;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      ringMat.dispose();
      ring2Mat.dispose();
      satelliteGeo.dispose();
      satelliteMat.dispose();
      rayGeo.dispose();
      rayMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      plasmaTexture.dispose();
      shadowTex.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}
      data-testid="nova-three-orb"
    />
  );
}
