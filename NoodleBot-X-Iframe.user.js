// ==UserScript==
// @name         Mrs Chengs Pimp Your Noodles - NoodleBot
// @namespace    local.codex.mrschengs
// @version      1.3.1
// @description  Reads the Unity canvas and steers the noodle cup with ArrowLeft/ArrowRight.
// @match        https://mrschengs.se/pimpyournoodles/*
// @match        https://mrschengs.se/spel/mrschengstokyonew/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  function currentWindow() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }

  function installReadableWebGLPatch(win) {
    if (!win || win.__noodlebotReadableWebGLPatch) return;
    const pagePatch = function noodlebotReadableWebGLPatch() {
      if (window.__noodlebotReadableWebGLPatchPage) return;
      const proto = window.HTMLCanvasElement && window.HTMLCanvasElement.prototype;
      if (!proto || !proto.getContext) return;

      const originalGetContext = proto.getContext;
      proto.getContext = function patchedGetContext(type, attributes) {
        const name = String(type || "").toLowerCase();
        if (name === "webgl" || name === "webgl2" || name === "experimental-webgl") {
          const readableAttributes = {
            ...(attributes || {}),
            preserveDrawingBuffer: true
          };
          try {
            return originalGetContext.call(this, type, readableAttributes);
          } catch (_error) {
            return originalGetContext.call(this, type, attributes);
          }
        }
        return originalGetContext.call(this, type, attributes);
      };

      window.__noodlebotReadableWebGLPatchPage = true;
    };

    try {
      win.eval(`(${pagePatch.toString()})();`);
    } catch (_error) {
      const run = () => {
        const script = win.document.createElement("script");
        script.textContent = `(${pagePatch.toString()})();`;
        (win.document.documentElement || win.document.head || win.document.body).appendChild(script);
        script.remove();
      };
      if (win.document.documentElement || win.document.head || win.document.body) run();
      else win.document.addEventListener("DOMContentLoaded", run, { once: true });
    }

    win.__noodlebotReadableWebGLPatch = true;
  }

  // This must run in both the top page and the Unity iframe at document-start.
  // It forces Unity's WebGL back buffer to remain readable for readPixels().
  installReadableWebGLPatch(currentWindow());

  // The public page and the iframe URL both match this userscript. Run only
  // one bot from the top page; iframe instances only install the WebGL patch.
  if (window.self !== window.top) return;

  const SETTINGS = {
    fps: 28,
    debug: true,
    // Keep this false in Edge/Tampermonkey. Repeated synthetic clicks can
    // interfere with Unity's menu screens before a round starts.
    autoStart: false,

    // Field/canvas fractions.
    scanTop: 0.12,
    scanBottom: 0.90,
    cupBandTop: 0.78,
    cupBandBottom: 0.97,
    cupY: 0.86,
    cupHitY: 0.78,
    dangerHorizon: 0.48,
    starTriggerY: 0.38,
    starSpawnGraceY: 0.22,
    lanePadding: 45,

    // Detection. Stars are usually small, low-saturation, gray/tan blobs.
    minBlobPixels: 12,
    maxBlobPixels: 1500,
    maxStarWidth: 95,
    maxStarHeight: 95,
    starGrayTolerance: 96,
    starMinBrightness: 30,
    starMaxBrightness: 220,
    coloredMinSaturation: 70,

    // Steering.
    dodgeRadius: 150,
    cupCollisionRadius: 82,
    dodgeLaneOffset: 0.15,
    edgeGuard: 0.16,
    returnHomeDeadZone: 1.0,
    dodgeBurstMs: 145,
    dodgeCooldownMs: 170,
    fastStarBurstMs: 205,
    collectBurstMs: 70,
    collectCooldownMs: 500,
    collectRadius: 85,
    collectMinY: 0.58,
    collectMaxY: 0.80,
    collectQuietStarCount: 2,
    trustVisualCup: true,
    visualCupMinSignal: 90,
    deadZonePx: 18,
    keyPulseMs: 75,
    estimatedCupSpeedPerSecond: 0.55,
    scoreInjectionValue: 150000
  };

  const KEY = {
    left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37, which: 37 },
    right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39 }
  };

  const state = {
    running: false,
    timer: 0,
    targetX: 0.5,
    estimatedCupX: 0.5,
    visualCupX: null,
    held: null,
    dodgeUntil: 0,
    cooldownUntil: 0,
    dodgeDirection: null,
    currentBurstMs: 145,
    currentPlanKind: null,
    lastCollectAt: 0,
    lastStarDodgeAt: 0,
    lastKeyPulse: 0,
    lastTick: performance.now(),
    starTracks: [],
    nextTrackId: 1,
    latestTrackedStars: [],
    trackedStars: 0,
    topThreat: "none",
    stars: 0,
    collectables: 0,
    cupSignal: 0,
    pixelSignal: 0,
    frameInfo: "",
    dodgeReason: "idle",
    mode: "booting",
    message: "waiting"
  };

  const hotkeyTargets = new WeakSet();

  function rootWindow() {
    return currentWindow();
  }

  function getGameWindow() {
    const root = rootWindow();
    const frames = [
      root.document.querySelector("#mrschengs-game"),
      ...root.document.querySelectorAll("iframe")
    ].filter(Boolean);

    for (const frame of frames) {
      try {
        const frameDocument = frame.contentDocument;
        if (frame.contentWindow && frameDocument && frameDocument.querySelector("#unity-canvas, canvas")) {
          return frame.contentWindow;
        }
      } catch (_error) {
        // Ignore inaccessible frames and continue looking.
      }
    }

    return root;
  }

  function getCanvas() {
    const game = getGameWindow();
    return game.document.querySelector("#unity-canvas, canvas");
  }

  function getGL(canvas) {
    return (
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  }

  function overlay() {
    if (!SETTINGS.debug) return null;
    let el = rootWindow().document.querySelector("#noodlebot-overlay");
    if (el) return el;
    el = rootWindow().document.createElement("div");
    el.id = "noodlebot-overlay";
    el.style.cssText = [
      "position:fixed",
      "left:12px",
      "bottom:12px",
      "z-index:2147483647",
      "padding:8px 10px",
      "border:1px solid rgba(255,255,255,.25)",
      "border-radius:8px",
      "background:rgba(0,0,0,.74)",
      "color:white",
      "font:12px/1.35 Consolas,Menlo,monospace",
      "white-space:pre",
      "pointer-events:none"
    ].join(";");
    rootWindow().document.documentElement.appendChild(el);
    return el;
  }

  function updateOverlay() {
    const el = overlay();
    if (!el) return;
    const cup = state.visualCupX == null ? state.estimatedCupX : state.visualCupX;
    el.textContent =
      `NoodleBot ${state.running ? "ON" : "OFF"}  v1.3.1\n` +
      `mode: ${state.mode}  key: ${state.held || "-"}\n` +
      `cup: ${(cup * 100).toFixed(1)}%  target: ${(state.targetX * 100).toFixed(1)}%  sig:${state.cupSignal.toFixed(0)}\n` +
      `stars: ${state.stars}  tracks:${state.trackedStars}  toppings: ${state.collectables}  px:${state.pixelSignal}\n` +
      `${state.frameInfo}\n` +
      `${state.dodgeReason}\n${state.topThreat}\n${state.message}`;
  }

  function eventTargets(canvas) {
    const game = getGameWindow();
    return [canvas, game.document, game, rootWindow().document, rootWindow()].filter(Boolean);
  }

  function keyboardEvent(type, info) {
    const game = getGameWindow();
    return new game.KeyboardEvent(type, {
      key: info.key,
      code: info.code,
      keyCode: info.keyCode,
      which: info.which,
      bubbles: true,
      cancelable: true,
      composed: true
    });
  }

  function dispatchKey(type, direction) {
    const canvas = getCanvas();
    if (!canvas) return;
    const info = direction === "left" ? KEY.left : KEY.right;
    for (const target of eventTargets(canvas)) {
      target.dispatchEvent(keyboardEvent(type, info));
    }
  }

  function releaseKeys() {
    if (state.held === "left") dispatchKey("keyup", "left");
    if (state.held === "right") dispatchKey("keyup", "right");
    state.held = null;
    state.lastKeyPulse = 0;
  }

  function holdKey(direction, forcePulse = false) {
    if (state.held === direction && !forcePulse) return;
    releaseKeys();
    if (direction === "left" || direction === "right") {
      dispatchKey("keydown", direction);
      state.held = direction;
      state.lastKeyPulse = performance.now();
    } else if (forcePulse) {
      releaseKeys();
    }
  }

  function pulseHeldKey() {
    if (state.held !== "left" && state.held !== "right") return;
    const now = performance.now();
    if (now - state.lastKeyPulse < SETTINGS.keyPulseMs) return;
    dispatchKey("keydown", state.held);
    state.lastKeyPulse = now;
  }

  function steerKey(direction) {
    if (direction === "left" || direction === "right") {
      if (state.held === direction) pulseHeldKey();
      else holdKey(direction);
    } else {
      holdKey(null, true);
    }
  }

  function clickCanvasFraction(xFrac, yFrac) {
    const canvas = getCanvas();
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + rect.width * xFrac;
    const y = rect.top + rect.height * yFrac;
    const game = getGameWindow();
    const common = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons: 1
    };
    canvas.focus && canvas.focus();
    canvas.dispatchEvent(new game.MouseEvent("mousedown", common));
    canvas.dispatchEvent(new game.MouseEvent("mouseup", { ...common, buttons: 0 }));
    canvas.dispatchEvent(new game.MouseEvent("click", { ...common, buttons: 0 }));
    return true;
  }

  function autoStartClick() {
    if (!SETTINGS.autoStart) return;
    // Harmless repeated clicks through the start/instructions/story screens.
    clickCanvasFraction(0.5, 0.42); // SPELA
    clickCanvasFraction(0.5, 0.72); // STARTA SPELET
    clickCanvasFraction(0.64, 0.65); // story carousel right/next area
  }

  function rgbaAt(data, width, x, y) {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }

  function visibleObjectPixel(r, g, b, a) {
    if (a < 80) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    return max > 55 && (sat > 20 || max > 145);
  }

  function starPixel(r, g, b, a) {
    if (a < 80) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    const brightness = (r + g + b) / 3;
    const tanOrGray = r >= g - 18 && g >= b - 12 && r >= b + 8 && sat >= 12 && sat <= 82;
    const notWhiteHud = !(max > 220 && sat < 35);
    const notRedLogo = !(r > 150 && g < 80 && b < 85);
    const notGoldenFood = !(r > 165 && g > 105 && b < 92);
    const notGreenFood = !(g > r + 18 && g > b + 18);
    return brightness > 58 && brightness < 190 && tanOrGray && notWhiteHud && notRedLogo && notGoldenFood && notGreenFood;
  }

  function isCupPixel(r, g, b, a) {
    if (a < 80) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    const orangeCup = r > 125 && g > 48 && g < 170 && b < 118 && sat > 42 && r > g * 1.05 && r > b * 1.35;
    const yellowNoodles = r > 145 && g > 82 && g < 178 && b < 100 && sat > 48 && r >= g * 0.88;
    return orangeCup || yellowNoodles;
  }

  function redPromoScreen(gl, width, height) {
    const band = readBand(gl, width, height, 0.64, 0.98);
    let red = 0;
    let sampled = 0;

    for (let y = 0; y < band.bandH; y += 5) {
      for (let x = 0; x < width; x += 5) {
        const i = (y * width + x) * 4;
        const r = band.pixels[i];
        const g = band.pixels[i + 1];
        const b = band.pixels[i + 2];
        sampled += 1;
        if (r > 140 && g < 55 && b < 70) red += 1;
      }
    }

    return sampled > 0 && red / sampled > 0.09;
  }

  function tutorialScreen(gl, width, height) {
    const band = readBand(gl, width, height, 0.52, 0.96);
    let greenButton = 0;
    let whiteText = 0;
    let sampled = 0;

    for (let y = 0; y < band.bandH; y += 4) {
      const canvasY = band.yTop + y;
      for (let x = Math.floor(width * 0.16); x < Math.floor(width * 0.84); x += 4) {
        const i = (y * width + x) * 4;
        const r = band.pixels[i];
        const g = band.pixels[i + 1];
        const b = band.pixels[i + 2];
        const a = band.pixels[i + 3];
        if (a < 80) continue;
        sampled += 1;

        const inButtonZone = canvasY > height * 0.72;
        if (inButtonZone && g > 130 && r < 90 && b < 110) greenButton += 1;
        if (r > 205 && g > 205 && b > 205) whiteText += 1;
      }
    }

    return sampled > 0 && greenButton > 60 && whiteText > 180;
  }

  function preGameplayScreen(gl, width, height) {
    return redPromoScreen(gl, width, height) || tutorialScreen(gl, width, height);
  }

  function classifyBlob(blob) {
    const width = blob.maxX - blob.minX + 1;
    const height = blob.maxY - blob.minY + 1;
    const avgR = blob.r / blob.count;
    const avgG = blob.g / blob.count;
    const avgB = blob.b / blob.count;
    const max = Math.max(avgR, avgG, avgB);
    const min = Math.min(avgR, avgG, avgB);
    const sat = max - min;
    const brightness = (avgR + avgG + avgB) / 3;

    const compact = width <= SETTINGS.maxStarWidth && height <= SETTINGS.maxStarHeight;
    const starish =
      compact &&
      sat <= SETTINGS.starGrayTolerance &&
      brightness >= SETTINGS.starMinBrightness &&
      brightness <= SETTINGS.starMaxBrightness;

    if (starish) return "unknown";
    if (sat >= SETTINGS.coloredMinSaturation || brightness > 160) return "collectable";
    return "unknown";
  }

  function blobFromMask(mask, pixels, width, band, startX, startY, step) {
    const qx = [startX];
    const qy = [startY];
    mask[startY * width + startX] = 0;
    let head = 0;
    const blob = {
      count: 0,
      minX: startX,
      maxX: startX,
      minY: startY,
      maxY: startY,
      r: 0,
      g: 0,
      b: 0
    };

    while (head < qx.length) {
      const cx = qx[head];
      const cy = qy[head];
      head += 1;

      const [r, g, b] = rgbaAt(pixels, width, cx, cy);
      blob.count += 1;
      blob.r += r;
      blob.g += g;
      blob.b += b;
      blob.minX = Math.min(blob.minX, cx);
      blob.maxX = Math.max(blob.maxX, cx);
      blob.minY = Math.min(blob.minY, cy);
      blob.maxY = Math.max(blob.maxY, cy);

      for (let oy = -step; oy <= step; oy += step) {
        for (let ox = -step; ox <= step; ox += step) {
          if (!ox && !oy) continue;
          const nx = cx + ox;
          const ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= band.bandH) continue;
          const ni = ny * width + nx;
          if (!mask[ni]) continue;
          mask[ni] = 0;
          qx.push(nx);
          qy.push(ny);
        }
      }
    }

    blob.cx = (blob.minX + blob.maxX) / 2;
    blob.cy = band.yBottom - (blob.minY + blob.maxY) / 2;
    return blob;
  }

  function readBand(gl, width, height, topFrac, bottomFrac) {
    const yTop = Math.max(0, Math.floor(height * topFrac));
    const yBottom = Math.min(height, Math.floor(height * bottomFrac));
    const bandH = Math.max(1, yBottom - yTop);
    const pixels = new Uint8Array(width * bandH * 4);
    gl.readPixels(0, height - yBottom, width, bandH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return { yTop, yBottom, bandH, pixels };
  }

  function scanObjects(gl, width, height) {
    const band = readBand(gl, width, height, SETTINGS.scanTop, SETTINGS.scanBottom);
    const mask = new Uint8Array(width * band.bandH);
    const starMask = new Uint8Array(width * band.bandH);
    let visibleHits = 0;

    for (let y = 0; y < band.bandH; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const r = band.pixels[i];
        const g = band.pixels[i + 1];
        const b = band.pixels[i + 2];
        const a = band.pixels[i + 3];
        if (visibleObjectPixel(r, g, b, a)) {
          mask[y * width + x] = 1;
          visibleHits += 1;
        }
        if (starPixel(r, g, b, a)) starMask[y * width + x] = 1;
      }
    }

    const blobs = [];
    const step = 3;

    for (let y = 0; y < band.bandH; y += step) {
      for (let x = 0; x < width; x += step) {
        if (!mask[y * width + x]) continue;
        const blob = blobFromMask(mask, band.pixels, width, band, x, y, step);
        if (blob.count >= SETTINGS.minBlobPixels && blob.count <= SETTINGS.maxBlobPixels) {
          blob.kind = classifyBlob(blob);
          blobs.push(blob);
        }
      }
    }

    for (let y = 0; y < band.bandH; y += step) {
      for (let x = 0; x < width; x += step) {
        if (!starMask[y * width + x]) continue;
        const blob = blobFromMask(starMask, band.pixels, width, band, x, y, step);
        const blobWidth = blob.maxX - blob.minX + 1;
        const blobHeight = blob.maxY - blob.minY + 1;
        if (
          blob.count >= 14 &&
          blob.count <= 700 &&
          blobWidth >= 18 &&
          blobHeight >= 18 &&
          blobWidth <= 90 &&
          blobHeight <= 90 &&
          blobWidth / blobHeight >= 0.55 &&
          blobWidth / blobHeight <= 1.75
        ) {
          blob.kind = "star";
          blobs.push(blob);
        }
      }
    }

    return { blobs, visibleHits };
  }

  function detectCupX(gl, width, height) {
    const band = readBand(gl, width, height, SETTINGS.cupBandTop, SETTINGS.cupBandBottom);
    const bins = new Float32Array(width);

    for (let y = 0; y < band.bandH; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (isCupPixel(band.pixels[i], band.pixels[i + 1], band.pixels[i + 2], band.pixels[i + 3])) {
          bins[x] += 1;
        }
      }
    }

    let bestWindow = 0;
    let bestWindowX = null;
    const windowHalfWidth = Math.max(24, Math.floor(width * 0.055));

    for (let center = SETTINGS.lanePadding; center < width - SETTINGS.lanePadding; center += 4) {
      let windowSum = 0;
      const left = Math.max(SETTINGS.lanePadding, center - windowHalfWidth);
      const right = Math.min(width - SETTINGS.lanePadding, center + windowHalfWidth);
      for (let x = left; x <= right; x += 1) windowSum += bins[x];
      if (windowSum > bestWindow) {
        bestWindow = windowSum;
        bestWindowX = center;
      }
    }

    let sum = 0;
    let weighted = 0;
    const focusLeft =
      bestWindowX == null ? SETTINGS.lanePadding : Math.max(SETTINGS.lanePadding, bestWindowX - windowHalfWidth);
    const focusRight =
      bestWindowX == null ? width - SETTINGS.lanePadding : Math.min(width - SETTINGS.lanePadding, bestWindowX + windowHalfWidth);
    for (let x = focusLeft; x < focusRight; x += 1) {
      const value = bins[x];
      sum += value;
      weighted += value * x;
    }

    state.cupSignal = bestWindow;
    if (sum < 8 || bestWindow < 12) return null;
    return weighted / sum / width;
  }

  function dedupeStars(stars) {
    const sorted = stars
      .slice()
      .sort((a, b) => b.cy - a.cy || a.cx - b.cx);
    const result = [];

    for (const star of sorted) {
      const duplicate = result.find((other) => {
        return Math.abs(other.cx - star.cx) < 34 && Math.abs(other.cy - star.cy) < 34;
      });
      if (!duplicate) {
        result.push({ ...star });
        continue;
      }

      duplicate.cx = (duplicate.cx + star.cx) / 2;
      duplicate.cy = (duplicate.cy + star.cy) / 2;
      duplicate.count += star.count || 0;
    }

    return result;
  }

  function updateStarTracks(stars, nowMs) {
    const tracks = state.starTracks.filter((track) => nowMs - track.lastSeen < 260);
    const unmatched = tracks.slice();
    const tracked = [];

    for (const star of stars) {
      let best = null;
      let bestDistance = Infinity;

      for (const track of unmatched) {
        const dx = star.cx - track.cx;
        const dy = star.cy - track.cy;
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance && distance < 92) {
          best = track;
          bestDistance = distance;
        }
      }

      if (best) {
        const dt = Math.max(16, nowMs - best.lastSeen);
        const vx = (star.cx - best.cx) / dt;
        const vy = (star.cy - best.cy) / dt;
        best.vx = best.vx == null ? vx : best.vx * 0.55 + vx * 0.45;
        best.vy = best.vy == null ? vy : best.vy * 0.55 + vy * 0.45;
        best.cx = star.cx;
        best.cy = star.cy;
        best.count = star.count;
        best.lastSeen = nowMs;
        best.age += 1;
        unmatched.splice(unmatched.indexOf(best), 1);
        tracked.push({ ...star, trackId: best.id, vx: best.vx, vy: best.vy, age: best.age });
      } else {
        const track = {
          id: state.nextTrackId++,
          cx: star.cx,
          cy: star.cy,
          count: star.count,
          vx: 0,
          vy: 0,
          age: 1,
          lastSeen: nowMs
        };
        tracks.push(track);
        tracked.push({ ...star, trackId: track.id, vx: 0, vy: 0, age: 1 });
      }
    }

    state.starTracks = tracks;
    state.latestTrackedStars = tracked;
    state.trackedStars = tracked.length;
    return tracked;
  }

  function predictedStarX(star, hitY) {
    const vy = star.vy || 0;
    if (vy <= 0.01 || star.cy >= hitY) return star.cx;
    const framesMs = Math.min(900, Math.max(0, (hitY - star.cy) / vy));
    return star.cx + (star.vx || 0) * framesMs;
  }

  function laneIsSafe(targetX, trackedStars, width, height) {
    const targetPx = targetX * width;
    const hitY = height * SETTINGS.cupHitY;
    const triggerY = height * SETTINGS.starTriggerY;

    return !trackedStars.some((star) => {
      if (star.cy < triggerY || star.cy > hitY + height * 0.10) return false;
      const projectedX = predictedStarX(star, hitY);
      return Math.abs(projectedX - targetPx) <= SETTINGS.cupCollisionRadius * 1.25;
    });
  }

  function chooseCollectPlan(blobs, width, height, cupX, trackedStars, nowMs) {
    if (nowMs - state.lastCollectAt < SETTINGS.collectCooldownMs) return null;
    if (nowMs - state.lastStarDodgeAt < SETTINGS.collectCooldownMs) return null;
    if (trackedStars.length > SETTINGS.collectQuietStarCount) return null;

    const cupPx = cupX * width;
    const hitY = height * SETTINGS.cupHitY;
    const anyNearFutureStar = trackedStars.some((star) => {
      if (star.cy < height * 0.28 || star.cy > hitY + height * 0.14) return false;
      return Math.abs(predictedStarX(star, hitY) - cupPx) <= SETTINGS.cupCollisionRadius * 2.2;
    });
    if (anyNearFutureStar) return null;

    const items = blobs
      .filter((b) => b.kind === "collectable")
      .filter((item) => {
        const inVerticalWindow = item.cy >= height * SETTINGS.collectMinY && item.cy <= height * SETTINGS.collectMaxY;
        const nearEnough = Math.abs(item.cx - cupPx) <= SETTINGS.collectRadius;
        const notHud = item.cy > height * 0.28;
        return inVerticalWindow && nearEnough && notHud;
      })
      .sort((a, b) => {
        const aScore = Math.abs(a.cx - cupPx) + Math.abs(height * SETTINGS.cupHitY - a.cy) * 0.25;
        const bScore = Math.abs(b.cx - cupPx) + Math.abs(height * SETTINGS.cupHitY - b.cy) * 0.25;
        return aScore - bScore;
      });

    for (const item of items) {
      const delta = item.cx - cupPx;
      if (Math.abs(delta) < SETTINGS.deadZonePx * 1.4) return null;
      const direction = delta < 0 ? "left" : "right";
      const targetX = clampTarget(cupX + (direction === "left" ? -SETTINGS.dodgeLaneOffset : SETTINGS.dodgeLaneOffset));
      if (!laneIsSafe(targetX, trackedStars, width, height)) continue;
      if (cupX <= SETTINGS.edgeGuard && direction === "left") continue;
      if (cupX >= 1 - SETTINGS.edgeGuard && direction === "right") continue;
      state.dodgeReason = `collect ${direction}: safe ingredient`;
      return { direction, burstMs: SETTINGS.collectBurstMs, kind: "collect" };
    }

    return null;
  }

  function clampTarget(x) {
    return Math.min(0.96, Math.max(0.04, x));
  }

  function chooseTarget(blobs, width, height, cupX) {
    const stars = dedupeStars(blobs.filter((b) => b.kind === "star"));
    const collectables = blobs.filter((b) => b.kind === "collectable");
    const cupPx = cupX * width;
    const triggerY = height * SETTINGS.starTriggerY;
    const cupY = height * SETTINGS.cupY;

    state.stars = stars.length;
    state.collectables = collectables.length;

    const threats = stars
      .filter((star) => {
        const insidePlayfield = star.cx >= SETTINGS.lanePadding && star.cx <= width - SETTINGS.lanePadding;
        const lowEnough = star.cy >= triggerY && star.cy <= cupY + height * 0.10;
        const inCupLane = Math.abs(star.cx - cupPx) <= SETTINGS.dodgeRadius;
        return insidePlayfield && lowEnough && inCupLane;
      })
      .sort((a, b) => b.cy - a.cy);

    if (threats.length === 0) {
      if (Math.abs(cupX - 0.5) > SETTINGS.returnHomeDeadZone) {
        state.dodgeReason = "recover: return toward center";
        return 0.5;
      }
      state.dodgeReason = `idle: no star past ${(SETTINGS.starTriggerY * 100).toFixed(0)}% in cup lane`;
      return cupX;
    }

    const threat = threats[0];
    const nextAbove = stars
      .filter((star) => {
        const aboveThreat = star.cy < threat.cy - 28;
        const notHud = star.cy > height * (SETTINGS.scanTop + 0.03);
        const insidePlayfield = star.cx >= SETTINGS.lanePadding && star.cx <= width - SETTINGS.lanePadding;
        return aboveThreat && notHud && insidePlayfield;
      })
      .sort((a, b) => b.cy - a.cy)[0];

    let direction;
    if (nextAbove) {
      direction = nextAbove.cx < width / 2 ? "right" : "left";
      state.dodgeReason =
        `dodge ${direction}: next star above is ${nextAbove.cx < width / 2 ? "left" : "right"}`;
    } else {
      direction = threat.cx < cupPx ? "right" : "left";
      state.dodgeReason =
        `dodge ${direction}: current star is ${threat.cx < cupPx ? "left" : "right"}`;
    }

    const offset = direction === "left" ? -SETTINGS.dodgeLaneOffset : SETTINGS.dodgeLaneOffset;
    return clampTarget(cupX + offset);
  }

  function chooseDodgePlan(blobs, width, height, cupX, nowMs) {
    const stars = updateStarTracks(dedupeStars(blobs.filter((b) => b.kind === "star")), nowMs);
    const collectables = blobs.filter((b) => b.kind === "collectable");
    const cupPx = cupX * width;
    const triggerY = height * SETTINGS.starTriggerY;
    const hitY = height * SETTINGS.cupHitY;

    state.stars = stars.length;
    state.collectables = collectables.length;

    const threats = stars
      .map((star) => {
        const projectedX = predictedStarX(star, hitY);
        const isNew = star.age <= 2;
        const isFast = (star.vy || 0) > 0.85;
        return { ...star, projectedX, isNew, isFast };
      })
      .filter((star) => {
        const insidePlayfield = star.cx >= SETTINGS.lanePadding && star.cx <= width - SETTINGS.lanePadding;
        const lowEnough = star.cy >= triggerY && star.cy <= hitY + height * 0.08;
        const matureEnough = star.age >= 2 || star.cy >= height * SETTINGS.starSpawnGraceY;
        const margin = SETTINGS.cupCollisionRadius * (star.isNew || star.isFast ? 1.35 : 1);
        const inCupLane =
          Math.abs(star.projectedX - cupPx) <= margin ||
          Math.abs(star.cx - cupPx) <= SETTINGS.dodgeRadius && star.cy >= height * 0.62;
        return insidePlayfield && lowEnough && matureEnough && inCupLane;
      })
      .sort((a, b) => {
        const aScore =
          Math.abs(a.projectedX - cupPx) -
          (a.vy || 0) * 42 -
          (a.isNew ? 55 : 0) -
          (a.isFast ? 35 : 0);
        const bScore =
          Math.abs(b.projectedX - cupPx) -
          (b.vy || 0) * 42 -
          (b.isNew ? 55 : 0) -
          (b.isFast ? 35 : 0);
        return aScore - bScore || b.cy - a.cy;
      });

    if (threats.length === 0) {
      if (cupX <= SETTINGS.edgeGuard) {
        state.dodgeReason = "recover right: left edge";
        state.topThreat = "top threat: none";
        return { direction: "right", burstMs: SETTINGS.collectBurstMs, kind: "edge" };
      }
      if (cupX >= 1 - SETTINGS.edgeGuard) {
        state.dodgeReason = "recover left: right edge";
        state.topThreat = "top threat: none";
        return { direction: "left", burstMs: SETTINGS.collectBurstMs, kind: "edge" };
      }
      state.dodgeReason = `idle: no star past ${(SETTINGS.starTriggerY * 100).toFixed(0)}% near cup`;
      state.topThreat = "top threat: none";
      return null;
    }

    const threat = threats[0];
    state.topThreat =
      `top threat: ${threat.isNew ? "NEW " : ""}${threat.isFast ? "FAST " : ""}` +
      `vy:${(threat.vy || 0).toFixed(2)} dx:${Math.round(threat.projectedX - cupPx)}`;

    const nextAbove = stars
      .filter((star) => {
        const aboveThreat = star.cy < threat.cy - 24;
        const notHud = star.cy > height * (SETTINGS.scanTop + 0.03);
        const insidePlayfield = star.cx >= SETTINGS.lanePadding && star.cx <= width - SETTINGS.lanePadding;
        return aboveThreat && notHud && insidePlayfield;
      })
      .sort((a, b) => b.cy - a.cy)[0];

    function edgeSafe(direction, reason) {
      const burstMs = threat.isNew || threat.isFast ? SETTINGS.fastStarBurstMs : SETTINGS.dodgeBurstMs;
      if (cupX <= SETTINGS.edgeGuard && direction === "left") {
        state.dodgeReason = `burst right: edge guard (${reason})`;
        return { direction: "right", burstMs, kind: "star" };
      }
      if (cupX >= 1 - SETTINGS.edgeGuard && direction === "right") {
        state.dodgeReason = `burst left: edge guard (${reason})`;
        return { direction: "left", burstMs, kind: "star" };
      }
      state.dodgeReason = `burst ${direction}: ${reason}`;
      return { direction, burstMs, kind: "star" };
    }

    function laneDanger(direction) {
      const targetX = clampTarget(cupX + (direction === "left" ? -SETTINGS.dodgeLaneOffset : SETTINGS.dodgeLaneOffset));
      const targetPx = targetX * width;
      let score = 0;

      for (const star of stars) {
        if (star.cy < triggerY || star.cy > hitY + height * 0.14) continue;
        const px = predictedStarX(star, hitY);
        const distance = Math.abs(px - targetPx);
        const margin = SETTINGS.cupCollisionRadius * (star.age <= 2 || (star.vy || 0) > 0.85 ? 1.55 : 1.25);
        const closeness = Math.max(0, margin - distance);
        const yWeight = 0.8 + Math.max(0, star.cy - triggerY) / Math.max(1, hitY - triggerY);
        score += closeness * closeness * yWeight;
      }

      return score;
    }

    const leftDanger = cupX <= SETTINGS.edgeGuard ? Infinity : laneDanger("left");
    const rightDanger = cupX >= 1 - SETTINGS.edgeGuard ? Infinity : laneDanger("right");

    if (Number.isFinite(leftDanger) || Number.isFinite(rightDanger)) {
      let direction;
      if (Math.abs(leftDanger - rightDanger) > 80) {
        direction = leftDanger < rightDanger ? "left" : "right";
      } else if (nextAbove) {
        const nextX = predictedStarX(nextAbove, hitY);
        direction = nextX < cupPx ? "right" : "left";
      } else {
        direction = threat.projectedX < cupPx ? "right" : "left";
      }
      return edgeSafe(direction, `lane risk L:${Math.round(leftDanger)} R:${Math.round(rightDanger)}`);
    }

    const direction = threat.projectedX < cupPx ? "right" : "left";
    return edgeSafe(direction, `predicted star is ${threat.projectedX < cupPx ? "left" : "right"}`);
  }

  function applyEstimatedMovement(direction, dt) {
    if (direction !== "left" && direction !== "right") return;
    const sign = direction === "left" ? -1 : 1;
    state.estimatedCupX = Math.min(
      0.96,
      Math.max(0.04, state.estimatedCupX + sign * SETTINGS.estimatedCupSpeedPerSecond * dt)
    );
  }

  function steer(cupX, targetX, width, dt) {
    const deltaPx = (targetX - cupX) * width;
    if (Math.abs(deltaPx) <= SETTINGS.deadZonePx) {
      steerKey(null);
      return;
    }

    const direction = deltaPx < 0 ? "left" : "right";
    steerKey(direction);

    const sign = direction === "left" ? -1 : 1;
    state.estimatedCupX = Math.min(
      0.96,
      Math.max(0.04, state.estimatedCupX + sign * SETTINGS.estimatedCupSpeedPerSecond * dt)
    );
  }

  function tick() {
    if (!state.running) return;
    const now = performance.now();
    const dt = Math.min(0.12, (now - state.lastTick) / 1000);
    state.lastTick = now;

    const canvas = getCanvas();
    if (!canvas) {
      state.mode = "waiting";
      state.message = "no Unity canvas yet";
      state.frameInfo = "frame: none";
      updateOverlay();
      return;
    }

    const gl = getGL(canvas);
    if (!gl) {
      state.mode = "blocked";
      state.message = "no readable WebGL context";
      state.frameInfo = "frame: no gl";
      updateOverlay();
      return;
    }

    try {
      const width = gl.drawingBufferWidth || canvas.width;
      const height = gl.drawingBufferHeight || canvas.height;
      const game = getGameWindow();
      state.frameInfo = `frame: ${game.location.pathname.split("/").pop() || "top"} ${width}x${height}`;
      if (preGameplayScreen(gl, width, height)) {
        state.mode = "menu";
        state.message = "waiting for live gameplay";
        state.stars = 0;
        state.collectables = 0;
        state.pixelSignal = 0;
        state.visualCupX = null;
        state.estimatedCupX = 0.5;
        state.targetX = 0.5;
        state.dodgeUntil = 0;
        state.cooldownUntil = 0;
        state.dodgeDirection = null;
        state.currentPlanKind = null;
        state.starTracks = [];
        state.latestTrackedStars = [];
        state.trackedStars = 0;
        state.topThreat = "top threat: none";
        state.lastCollectAt = 0;
        state.dodgeReason = "idle: menu";
        releaseKeys();
        updateOverlay();
        return;
      }

      const scan = scanObjects(gl, width, height);
      const blobs = scan.blobs;
      state.pixelSignal = scan.visibleHits;
      const visualCup = detectCupX(gl, width, height);

      if (
        SETTINGS.trustVisualCup &&
        Number.isFinite(visualCup) &&
        state.cupSignal >= SETTINGS.visualCupMinSignal
      ) {
        state.estimatedCupX = state.estimatedCupX * 0.35 + visualCup * 0.65;
        state.visualCupX = state.estimatedCupX;
      } else {
        state.visualCupX = null;
      }

      const objectCount = blobs.filter((b) => b.kind === "star" || b.kind === "collectable").length;
      const cupX = state.visualCupX == null ? state.estimatedCupX : state.visualCupX;
      const nowMs = performance.now();
      const starPlan = chooseDodgePlan(blobs, width, height, cupX, nowMs);
      const collectPlan = starPlan ? null : chooseCollectPlan(blobs, width, height, cupX, state.latestTrackedStars, nowMs);
      const plan = starPlan || collectPlan;

      if (state.visualCupX == null && objectCount === 0) {
        state.mode = "not-gameplay";
        state.message = "waiting for gameplay objects";
        state.dodgeReason = "idle: no objects";
        state.estimatedCupX = 0.5;
        state.targetX = 0.5;
        state.dodgeUntil = 0;
        state.cooldownUntil = 0;
        state.dodgeDirection = null;
        state.currentPlanKind = null;
        state.starTracks = [];
        state.latestTrackedStars = [];
        state.trackedStars = 0;
        releaseKeys();
        updateOverlay();
        return;
      }

      const activeBurst = state.dodgeUntil && nowMs < state.dodgeUntil;
      const starPreempts =
        starPlan &&
        (
          !activeBurst ||
          state.dodgeDirection !== starPlan.direction ||
          state.currentPlanKind === "collect" ||
          state.currentPlanKind === "edge"
        );

      if (starPreempts) {
        state.dodgeDirection = starPlan.direction;
        state.currentPlanKind = starPlan.kind || "star";
        state.currentBurstMs = starPlan.burstMs || SETTINGS.dodgeBurstMs;
        state.dodgeUntil = nowMs + state.currentBurstMs;
        state.cooldownUntil = 0;
        state.lastStarDodgeAt = nowMs;
        state.targetX = clampTarget(cupX + (starPlan.direction === "left" ? -SETTINGS.dodgeLaneOffset : SETTINGS.dodgeLaneOffset));
        steerKey(starPlan.direction);
        applyEstimatedMovement(starPlan.direction, dt);
      } else if (activeBurst) {
        state.targetX = clampTarget(cupX + (state.dodgeDirection === "left" ? -SETTINGS.dodgeLaneOffset : SETTINGS.dodgeLaneOffset));
        steerKey(state.dodgeDirection);
        applyEstimatedMovement(state.dodgeDirection, dt);
      } else {
        if (state.dodgeUntil) {
          state.cooldownUntil = nowMs + (state.dodgeDirection ? SETTINGS.dodgeCooldownMs : 0);
          state.dodgeUntil = 0;
          state.dodgeDirection = null;
          state.currentPlanKind = null;
        }

        if (starPlan) {
          state.dodgeDirection = starPlan.direction;
          state.currentPlanKind = starPlan.kind || "star";
          state.currentBurstMs = starPlan.burstMs || SETTINGS.dodgeBurstMs;
          state.dodgeUntil = nowMs + state.currentBurstMs;
          state.cooldownUntil = 0;
          state.lastStarDodgeAt = nowMs;
          state.targetX = clampTarget(cupX + (starPlan.direction === "left" ? -SETTINGS.dodgeLaneOffset : SETTINGS.dodgeLaneOffset));
          steerKey(starPlan.direction);
          applyEstimatedMovement(starPlan.direction, dt);
        } else if (plan && nowMs >= state.cooldownUntil) {
          state.dodgeDirection = plan.direction;
          state.currentPlanKind = plan.kind || "collect";
          state.currentBurstMs = plan.burstMs || SETTINGS.dodgeBurstMs;
          state.dodgeUntil = nowMs + state.currentBurstMs;
          state.targetX = clampTarget(cupX + (plan.direction === "left" ? -SETTINGS.dodgeLaneOffset : SETTINGS.dodgeLaneOffset));
          if (plan.kind === "collect") state.lastCollectAt = nowMs;
          steerKey(plan.direction);
          applyEstimatedMovement(plan.direction, dt);
        } else {
          state.targetX = cupX;
          steerKey(null);
        }
      }

      state.mode = state.visualCupX == null ? "estimated-keyboard" : "visual-keyboard";
      state.message =
        state.visualCupX == null
          ? "short bursts from estimated cup"
          : "reading canvas + steering arrows";
    } catch (error) {
      state.mode = "error";
      state.message = String(error && error.message ? error.message : error);
      releaseKeys();
    }

    updateOverlay();
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.lastTick = performance.now();
    state.timer = setInterval(tick, Math.round(1000 / SETTINGS.fps));
    updateOverlay();
  }

  function stop() {
    state.running = false;
    clearInterval(state.timer);
    state.timer = 0;
    state.dodgeUntil = 0;
    state.cooldownUntil = 0;
    state.dodgeDirection = null;
    state.currentPlanKind = null;
    releaseKeys();
    updateOverlay();
  }



  function handleHotkey(event) {
    const key = event.key && event.key.toLowerCase();
    if (key === "x") {
      event.preventDefault();
      if (state.running) stop();
      else start();
    } else if (key === "b") {
      event.preventDefault();
      injectScore();
    }
  }

  function addHotkeyTarget(target) {
    if (!target || hotkeyTargets.has(target) || typeof target.addEventListener !== "function") return;
    target.addEventListener("keydown", handleHotkey, true);
    hotkeyTargets.add(target);
  }

  function installHotkeys(root) {
    addHotkeyTarget(root);
    addHotkeyTarget(root.document);
    try {
      const game = getGameWindow();
      installReadableWebGLPatch(game);
      addHotkeyTarget(game);
      addHotkeyTarget(game.document);
    } catch (_error) {
      // The iframe may not be ready yet. boot() schedules a second install.
    }
  }

  function boot() {
    const root = rootWindow();
    root.NoodleBot = { start, stop, injectScore, settings: SETTINGS, state };
    installHotkeys(root);
    const frameRefresh = setInterval(() => {
      installHotkeys(root);
      installReadableWebGLPatch(root);
      installReadableWebGLPatch(getGameWindow());
    }, 1000);
    setTimeout(() => clearInterval(frameRefresh), 15000);

    start();
    if (SETTINGS.autoStart) {
      const clicks = setInterval(autoStartClick, 900);
      setTimeout(() => clearInterval(clicks), 12000);
    }
  }
// ==================== SCORE INJECTION ====================
function findScoreVariables() {
  const win = getGameWindow();
  const candidates = [];

  Object.keys(win).forEach(key => {
    if (/score|point|star|total|high|result/i.test(key)) {
      const value = win[key];
      candidates.push({key, value, type: typeof value});
    }
  });

  // Search deeper in common Unity objects
  try {
    if (win.unityInstance) candidates.push({key: 'unityInstance', value: '[exists]'});
  } catch(e) {}

  console.table(candidates);
  return candidates;
}

function injectScore(baseScore = 0) {
  const game = getGameWindow();
  console.log(`%c=== SET BASE SCORE TO ${baseScore} ===`, "color:lime;font-size:16px");

  let currentScore = 0;

  // Try to read current score first
  const possibleKeys = ['score', '_score', 'playerScore', 'totalScore', 'points'];
  possibleKeys.forEach(key => {
    if (game[key] !== undefined) {
      currentScore = Number(game[key]) || 0;
    }
  });

  const newScore = Math.max(baseScore, currentScore + 2000); // ensure high base

  // Force set
  possibleKeys.forEach(key => {
    if (game[key] !== undefined) {
      game[key] = newScore;
      console.log(`Set ${key} = ${newScore}`);
    }
  });

  // Send to Unity (try both Set and Add)
  try {
    const unity = game.unityInstance;
    if (unity?.SendMessage) {
      const targets = ["GameManager", "ScoreManager", "UIManager", "PlayerController"];
      targets.forEach(t => {
        unity.SendMessage(t, "SetScore", newScore);
        unity.SendMessage(t, "AddScore", 2300);// <--- This helps it "add"
      });
      console.log("Sent SetScore + AddScore");
    }
  } catch (e) {}

  state.message = `Base score set to ~${newScore}`;
  updateOverlay();
}

// Bind score injection to key "B"
rootWindow().document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "b") {
    injectScore(2400); // Change this number
  }
  if (e.key.toLowerCase() === "f") {// F = Find
    findScoreVariables();
  }
});
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

