// Babylon.js viewer for the barber chair, loaded only on /experiencia-3d.
// Deep imports keep the bundle limited to what the scene uses.
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { ReflectionProbe } from '@babylonjs/core/Probes/reflectionProbe';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Behaviors/Cameras/autoRotationBehavior';

export type FocusName = 'geral' | 'couro' | 'base' | 'monograma';

const views: Record<FocusName, { alpha: number; beta: number; radius: number; target: Vector3 }> = {
  geral: { alpha: -Math.PI / 2 - 0.6, beta: 1.22, radius: 2.8, target: new Vector3(0, 0.52, 0) },
  couro: { alpha: -Math.PI / 2 - 0.25, beta: 1.05, radius: 1.55, target: new Vector3(0, 0.62, 0.08) },
  base: { alpha: -Math.PI / 2 + 0.55, beta: 1.38, radius: 1.35, target: new Vector3(0, 0.1, 0) },
  monograma: { alpha: Math.PI / 2 - 0.25, beta: 1.25, radius: 1.7, target: new Vector3(0, 0.7, 0.34) },
};

export type ChairViewer = {
  focus: (v: FocusName) => void;
  setAutoRotate: (on: boolean) => void;
  dispose: () => void;
};

export function createChairViewer(canvas: HTMLCanvasElement, opts: { reduced: boolean; onContextLost: () => void }): ChairViewer {
  const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }, true);
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
  engine.onContextLostObservable.add(opts.onContextLost);

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.043, 0.035, 0.027, 1);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.1;
  scene.imageProcessingConfiguration.contrast = 1.25;
  scene.imageProcessingConfiguration.vignetteEnabled = true;
  scene.imageProcessingConfiguration.vignetteWeight = 2.2;

  // Camera with limits: rotate and zoom only, no panning, never under the floor.
  const v0 = views.geral;
  const camera = new ArcRotateCamera('cam', v0.alpha, v0.beta, v0.radius, v0.target.clone(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1.2;
  camera.upperRadiusLimit = 4.2;
  camera.lowerBetaLimit = 0.45;
  camera.upperBetaLimit = 1.52;
  camera.panningSensibility = 0;
  camera.wheelDeltaPercentage = 0.01;
  camera.pinchDeltaPercentage = 0.004;
  camera.angularSensibilityX = camera.angularSensibilityY = 1600;
  camera.minZ = 0.05;
  camera.useAutoRotationBehavior = !opts.reduced;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.22;
    camera.autoRotationBehavior.idleRotationWaitTime = 2500;
    camera.autoRotationBehavior.idleRotationSpinupTime = 1500;
  }

  // Materials
  const chrome = new PBRMaterial('chrome', scene);
  chrome.albedoColor = new Color3(0.9, 0.9, 0.92);
  // Not fully metallic: the studio is dark, so direct lights must contribute highlights too.
  chrome.metallic = 0.82;
  chrome.roughness = 0.2;

  const brass = new PBRMaterial('brass', scene);
  brass.albedoColor = new Color3(0.82, 0.6, 0.34);
  brass.metallic = 0.75;
  brass.roughness = 0.28;

  const leather = new PBRMaterial('leather', scene);
  leather.albedoColor = new Color3(0.2, 0.105, 0.06);
  leather.metallic = 0;
  leather.roughness = 0.42;
  leather.clearCoat.isEnabled = true;
  leather.clearCoat.intensity = 0.35;
  leather.clearCoat.roughness = 0.3;

  const leatherDark = leather.clone('leatherDark');
  leatherDark.albedoColor = new Color3(0.12, 0.065, 0.04);

  const floorMat = new PBRMaterial('floor', scene);
  floorMat.albedoColor = new Color3(0.035, 0.03, 0.028);
  floorMat.metallic = 0;
  floorMat.roughness = 0.4;

  const parts: Mesh[] = [];
  const add = <T extends Mesh>(m: T, mat: PBRMaterial | StandardMaterial, parent?: TransformNode) => {
    m.material = mat;
    if (parent) m.parent = parent;
    parts.push(m);
    return m;
  };

  // Base and hydraulic column
  add(MeshBuilder.CreateCylinder('base', { diameter: 0.64, height: 0.035, tessellation: 64 }, scene), chrome).position.y = 0.0175;
  const ring = add(MeshBuilder.CreateTorus('baseRing', { diameter: 0.64, thickness: 0.014, tessellation: 64 }, scene), brass);
  ring.position.y = 0.035;
  add(MeshBuilder.CreateCylinder('collar', { diameter: 0.18, height: 0.06, tessellation: 48 }, scene), chrome).position.y = 0.065;
  add(MeshBuilder.CreateCylinder('column', { diameter: 0.1, height: 0.28, tessellation: 48 }, scene), chrome).position.y = 0.175;
  const pedal = add(MeshBuilder.CreateBox('pedal', { width: 0.06, height: 0.018, depth: 0.16 }, scene), chrome);
  pedal.position.set(0.17, 0.06, -0.12);
  pedal.rotation.set(0.2, 0.6, 0);

  // Seat: chrome frame + channel-tufted leather (capsules side by side).
  const frame = add(MeshBuilder.CreateBox('seatFrame', { width: 0.6, height: 0.04, depth: 0.56 }, scene), chrome);
  frame.position.y = 0.34;
  add(MeshBuilder.CreateBox('seatBase', { width: 0.56, height: 0.06, depth: 0.5 }, scene), leatherDark).position.y = 0.385;
  for (let i = 0; i < 5; i++) {
    const c = add(MeshBuilder.CreateCapsule(`seat${i}`, { height: 0.52, radius: 0.056, tessellation: 24, capSubdivisions: 8, orientation: Vector3.Forward() }, scene), leather);
    c.position.set(-0.22 + i * 0.11, 0.425, 0);
  }

  // Backrest, slightly reclined.
  const back = new TransformNode('back', scene);
  back.position.set(0, 0.42, 0.27);
  back.rotation.x = 0.16;
  add(MeshBuilder.CreateBox('backBoard', { width: 0.56, height: 0.64, depth: 0.05 }, scene), leatherDark, back).position.set(0, 0.34, 0.035);
  for (let i = 0; i < 5; i++) {
    const c = add(MeshBuilder.CreateCapsule(`back${i}`, { height: 0.62, radius: 0.056, tessellation: 24, capSubdivisions: 8 }, scene), leather, back);
    c.position.set(-0.22 + i * 0.11, 0.34, 0);
  }
  add(MeshBuilder.CreateBox('backShell', { width: 0.6, height: 0.68, depth: 0.02 }, scene), chrome, back).position.set(0, 0.34, 0.07);

  // Brass monogram plate on the back shell.
  const plateTex = new DynamicTexture('mono', { width: 512, height: 512 }, scene, true);
  const g = plateTex.getContext() as CanvasRenderingContext2D;
  g.fillStyle = '#c99a5e';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#6e4824';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(256, 256, 220, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#5a3a1c';
  g.font = 'italic 220px "Bodoni Moda Variable", Didot, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('RB', 250, 270);
  plateTex.update();
  const plateMat = new PBRMaterial('plate', scene);
  plateMat.albedoTexture = plateTex;
  plateMat.metallic = 0.45;
  plateMat.roughness = 0.35;
  const plate = add(MeshBuilder.CreateDisc('plate', { radius: 0.085, tessellation: 64 }, scene), plateMat, back);
  plate.position.set(0, 0.36, 0.081);
  plate.rotation.y = Math.PI;

  // Headrest on a chrome stem.
  add(MeshBuilder.CreateCylinder('stem', { diameter: 0.025, height: 0.12 }, scene), chrome, back).position.set(0, 0.7, 0.03);
  const head = add(MeshBuilder.CreateCapsule('head', { height: 0.34, radius: 0.068, tessellation: 24, capSubdivisions: 8, orientation: Vector3.Right() }, scene), leather, back);
  head.position.set(0, 0.79, 0.0);

  // Armrests with chrome side panels.
  for (const side of [-1, 1]) {
    const arm = add(MeshBuilder.CreateCapsule(`arm${side}`, { height: 0.5, radius: 0.045, tessellation: 20, capSubdivisions: 6, orientation: Vector3.Forward() }, scene), leather);
    arm.position.set(side * 0.35, 0.6, 0.0);
    const panel = add(MeshBuilder.CreateBox(`panel${side}`, { width: 0.02, height: 0.2, depth: 0.42 }, scene), chrome);
    panel.position.set(side * 0.315, 0.46, 0.02);
    const post = add(MeshBuilder.CreateCylinder(`post${side}`, { diameter: 0.03, height: 0.2 }, scene), chrome);
    post.position.set(side * 0.35, 0.47, -0.17);
  }

  // Leg cushion and footrest.
  const leg = add(MeshBuilder.CreateCapsule('leg', { height: 0.5, radius: 0.05, tessellation: 20, capSubdivisions: 6, orientation: Vector3.Right() }, scene), leather);
  leg.position.set(0, 0.32, -0.3);
  for (const side of [-1, 1]) {
    const rod = add(MeshBuilder.CreateCylinder(`rod${side}`, { diameter: 0.022, height: 0.225 }, scene), chrome);
    rod.position.set(side * 0.2, 0.205, -0.36);
    rod.rotation.x = Math.atan2(0.12, 0.19);
  }
  const foot = add(MeshBuilder.CreateBox('foot', { width: 0.48, height: 0.02, depth: 0.18 }, scene), chrome);
  foot.position.set(0, 0.1, -0.44);
  foot.rotation.x = 0.22;

  // Floor and studio softboxes (also feed the reflection probe that lights the metal).
  const floor = MeshBuilder.CreateDisc('floor', { radius: 9, tessellation: 96 }, scene);
  floor.rotation.x = Math.PI / 2;
  floor.material = floorMat;
  floor.receiveShadows = true;

  const panelMat = (name: string, c: Color3) => {
    const m = new StandardMaterial(name, scene);
    m.emissiveColor = c;
    m.disableLighting = true;
    return m;
  };
  const softboxes = [
    { pos: new Vector3(-2.4, 1.6, -1.2), size: [1.1, 2.4], color: new Color3(1, 0.72, 0.42) },
    { pos: new Vector3(2.6, 1.4, -0.6), size: [0.8, 2.0], color: new Color3(1, 0.86, 0.68) },
    { pos: new Vector3(0, 3.2, 0.4), size: [2.4, 0.6], color: new Color3(0.9, 0.6, 0.35) },
    { pos: new Vector3(0.6, 1.3, 2.8), size: [1.8, 1.6], color: new Color3(0.35, 0.45, 0.4) },
  ].map((b, i) => {
    const p = MeshBuilder.CreatePlane(`softbox${i}`, { width: b.size[0], height: b.size[1] }, scene);
    p.position = b.pos;
    p.lookAt(new Vector3(0, 0.5, 0));
    p.rotation.y += Math.PI;
    p.material = panelMat(`softboxMat${i}`, b.color);
    return p;
  });

  const probe = new ReflectionProbe('probe', 256, scene);
  probe.position = new Vector3(0, 0.6, 0);
  probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  probe.renderList!.push(...softboxes); // floor excluded: it samples this cube map (feedback loop)
  // Softboxes only exist to light the metal; hide them from the camera once the probe has captured them.
  probe.cubeTexture.onAfterRenderObservable.addOnce(() => softboxes.forEach((m) => (m.isVisible = false)));
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = 2.4;

  // Fog dissolves the floor edge into the backdrop.
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.22;
  scene.fogColor = new Color3(0.043, 0.035, 0.027);

  // Lights
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.35;
  hemi.diffuse = new Color3(1, 0.85, 0.7);
  hemi.groundColor = new Color3(0.08, 0.06, 0.05);

  const key = new DirectionalLight('key', new Vector3(0.5, -1, 0.6), scene);
  key.position = new Vector3(-2, 4, -2.5);
  key.intensity = 3.2;
  key.diffuse = new Color3(1, 0.82, 0.62);

  const rim = new SpotLight('rim', new Vector3(0.9, 1.9, 1.9), new Vector3(-0.9, -1.3, -1.7).normalize(), Math.PI / 4, 4, scene);
  rim.intensity = 12;

  const fill = new DirectionalLight('fill', new Vector3(0.6, -0.4, 1), scene);
  fill.intensity = 0.8;
  fill.diffuse = new Color3(0.75, 0.82, 0.8);
  rim.diffuse = new Color3(1, 0.65, 0.35);

  const shadows = new ShadowGenerator(1024, key);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 24;
  shadows.darkness = 0.25;
  parts.forEach((m) => shadows.addShadowCaster(m));

  // Smooth camera moves between presets.
  let goal: (typeof views)[FocusName] | null = null;
  scene.onBeforeRenderObservable.add(() => {
    if (!goal) return;
    const k = opts.reduced ? 1 : 0.08;
    camera.alpha += (goal.alpha - camera.alpha) * k;
    camera.beta += (goal.beta - camera.beta) * k;
    camera.radius += (goal.radius - camera.radius) * k;
    // Mutate in place: assigning camera.target would recompute alpha/beta/radius from the position.
    camera.target.copyFrom(Vector3.Lerp(camera.target, goal.target, k));
    if (Math.abs(goal.alpha - camera.alpha) < 0.002 && Math.abs(goal.radius - camera.radius) < 0.002) goal = null;
  });

  engine.runRenderLoop(() => scene.render());
  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);
  const onVisibility = () => (document.hidden ? engine.stopRenderLoop() : engine.runRenderLoop(() => scene.render()));
  document.addEventListener('visibilitychange', onVisibility);

  let autoRotate = !opts.reduced;
  return {
    focus(name) {
      const v = views[name];
      // Take the shortest way around to the preset angle.
      const twoPi = Math.PI * 2;
      const alpha = v.alpha + Math.round((camera.alpha - v.alpha) / twoPi) * twoPi;
      goal = { ...v, alpha };
      camera.useAutoRotationBehavior = false;
      if (autoRotate && name === 'geral') camera.useAutoRotationBehavior = true;
    },
    setAutoRotate(on) {
      autoRotate = on;
      camera.useAutoRotationBehavior = on;
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
