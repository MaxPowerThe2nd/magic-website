// Effect module "burning-card": renders the ace in a <canvas>, lets it catch fire at the
// top right corner and burn away a frayed corner, then keeps the edge smouldering.
//
// Timeline (starts ~2.5 s after the card is >= 50% visible, the page has loaded and the
// flame video can play; only once per browser session):
//   ignite  1 s   a small glowing dot at the corner
//   burn   10 s   the burn edge eats diagonally inwards, flames and embers ride on it
//   fade    2 s   flames shrink and disappear
//   smoulder      glowing line pulses weakly, a single ember now and then (low frame rate)
// Reduced motion or a repeated visit in the same session: the smouldering end state at once
// (reduced motion: static, without flames and embers).

const ROTATION = (-12 * Math.PI) / 180;
// Canvas size around the card box, as fractions of card width/height (mirrors the CSS)
const CANVAS_MARGIN = { left: 0.2, right: 0.6, top: 0.8, bottom: 0.15 };

// Card texture (card-intact.webp, 2x resolution)
const TEX_W = 300;
const TEX_H = 420;
// Final burnt corner: along the top edge ~45% of the width, along the right edge ~50% of the height
const CORNER_X = 0.45;
const CORNER_Y = 0.5;

const START_DELAY_MS = 2500;
const IGNITE_MS = 1000;
const BURN_MS = 10000;
const FADE_MS = 2000;
const SMOULDER_FPS = 12;

// Widths of the burn edge zones, in normalized burn distance (1 = final corner size)
const EDGE_AA = 0.006;
const GLOW = 0.02;
const CHAR = 0.035;
const HEAT = 0.11;

const SESSION_KEY = 'burning-card-played';

// Flame video is processed at this size (black -> transparent)
const FLAME_W = 160;
const FLAME_H = 100;

export function init(root) {
	const canvas = root.querySelector('.burning-card__canvas');
	const video = root.querySelector('video');
	const fallback = root.querySelector('.burning-card__fallback');
	if (!canvas || !video || !fallback) return;

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const alreadyPlayed = readSession();

	const image = new Image();
	image.src = fallback.currentSrc || fallback.src;
	image
		.decode()
		.then(() => start(root, canvas, video, image, reducedMotion, alreadyPlayed))
		.catch(() => {
			// Keep the plain image if the card cannot be decoded
		});
}

function start(root, canvas, video, image, reducedMotion, alreadyPlayed) {
	const colors = readColors(root);
	const ctx = canvas.getContext('2d');

	// ---- Card texture and precomputed burn times (only for the corner region) ----
	const card = document.createElement('canvas');
	card.width = TEX_W;
	card.height = TEX_H;
	const cardCtx = card.getContext('2d', { willReadFrequently: true });
	cardCtx.drawImage(image, 0, 0, TEX_W, TEX_H);

	const rx0 = Math.floor(TEX_W * (1 - CORNER_X - 0.12));
	const ry1 = Math.ceil(TEX_H * (CORNER_Y + 0.14));
	const rw = TEX_W - rx0;
	const rh = ry1;
	const original = cardCtx.getImageData(rx0, 0, rw, rh);
	const frame = cardCtx.createImageData(rw, rh);
	const burnTime = new Float32Array(rw * rh);
	let minBurnTime = Infinity;
	for (let y = 0; y < rh; y++) {
		for (let x = 0; x < rw; x++) {
			const tx = rx0 + x;
			const dx = (TEX_W - tx) / (TEX_W * CORNER_X);
			const dy = y / (TEX_H * CORNER_Y);
			// Distance to the corner plus fractal noise for a frayed, irregular edge
			const t =
				Math.hypot(dx, dy) + (fbm(tx / 26, y / 26) - 0.5) * 0.32 + (fbm(tx / 7 + 50, y / 7) - 0.5) * 0.1;
			burnTime[y * rw + x] = t;
			if (t < minBurnTime) minBurnTime = t;
		}
	}

	// ---- Flame video processing ----
	const flameSrc = document.createElement('canvas');
	flameSrc.width = FLAME_W;
	flameSrc.height = FLAME_H;
	const flameSrcCtx = flameSrc.getContext('2d', { willReadFrequently: true });
	const layer = document.createElement('canvas');
	const layerCtx = layer.getContext('2d');

	// ---- Geometry (CSS pixels) ----
	let cssW = 0;
	let cssH = 0;
	let cardW = 0;
	let cardH = 0;
	let centerX = 0;
	let centerY = 0;
	const cos = Math.cos(ROTATION);
	const sin = Math.sin(ROTATION);
	const toScreen = (tx, ty) => {
		const du = (tx / TEX_W - 0.5) * cardW;
		const dv = (ty / TEX_H - 0.5) * cardH;
		return [centerX + cos * du - sin * dv, centerY + sin * du + cos * dv];
	};

	const resize = () => {
		const box = root.getBoundingClientRect();
		// getBoundingClientRect includes the float animation's small rotation; offsetWidth does not
		cardW = root.offsetWidth || box.width;
		cardH = cardW * (TEX_H / TEX_W);
		cssW = cardW * (1 + CANVAS_MARGIN.left + CANVAS_MARGIN.right);
		cssH = cardH * (1 + CANVAS_MARGIN.top + CANVAS_MARGIN.bottom);
		centerX = cardW * (CANVAS_MARGIN.left + 0.5);
		centerY = cardH * (CANVAS_MARGIN.top + 0.5);
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		for (const c of [canvas, layer]) {
			c.width = Math.round(cssW * dpr);
			c.height = Math.round(cssH * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
		draw();
	};

	// ---- State ----
	let phase = 'wait'; // wait | ignite | burn | fade | smoulder
	let elapsed = 0; // ms since ignition, only counted while visible
	let front = -Infinity; // current burn front in normalized burn distance
	let glowStrength = 1;
	let edge = { points: [], minX: 0, maxX: 0, maxY: 0, count: 0 };
	const embers = [];
	let nextSmoulderEmber = 0;
	let visible = false;
	let rafId = 0;
	let smoulderTimer = 0;
	let lastTick = 0;

	// Recolour the corner region for the current front and collect the burn edge
	const renderCard = () => {
		const src = original.data;
		const out = frame.data;
		const points = [];
		let minX = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		let count = 0;
		const burning = front > -Infinity;

		for (let i = 0, n = burnTime.length; i < n; i++) {
			const p = i * 4;
			let r = src[p];
			let g = src[p + 1];
			let b = src[p + 2];
			let a = src[p + 3];

			if (burning) {
				const e = burnTime[i] - front; // distance to the front, > 0 = still intact
				if (e <= 0) {
					a = 0;
				} else if (e < GLOW + CHAR + HEAT) {
					if (e < GLOW) {
						// Glowing line: hot at the very edge, fading into the charred rim
						const k = e / GLOW;
						const glowR = lerp(colors.glowHot[0], colors.glow[0], k);
						const glowG = lerp(colors.glowHot[1], colors.glow[1], k);
						const glowB = lerp(colors.glowHot[2], colors.glow[2], k);
						r = lerp(colors.char[0], glowR, glowStrength);
						g = lerp(colors.char[1], glowG, glowStrength);
						b = lerp(colors.char[2], glowB, glowStrength);
						if (e < EDGE_AA) a *= e / EDGE_AA;
						if (a > 0 && i % 3 === 0) {
							const x = i % rw;
							const y = (i - x) / rw;
							const [sx, sy] = toScreen(rx0 + x, y);
							count++;
							if (sx < minX) minX = sx;
							if (sx > maxX) maxX = sx;
							if (sy > maxY) maxY = sy;
							if (points.length < 240) points.push([sx, sy]);
						}
					} else if (e < GLOW + CHAR) {
						r = colors.char[0];
						g = colors.char[1];
						b = colors.char[2];
					} else {
						// Light brownish heat discoloration in front of the charred rim
						const k = Math.pow(1 - (e - GLOW - CHAR) / HEAT, 1.6) * 0.6;
						r = lerp(r, colors.heat[0], k);
						g = lerp(g, colors.heat[1], k);
						b = lerp(b, colors.heat[2], k);
					}
				}
			}
			out[p] = r;
			out[p + 1] = g;
			out[p + 2] = b;
			out[p + 3] = a;
		}
		cardCtx.putImageData(frame, rx0, 0);
		edge = { points, minX, maxX, maxY, count };
	};

	const drawCardTo = (target) => {
		target.save();
		target.translate(centerX, centerY);
		target.rotate(ROTATION);
		target.drawImage(card, -cardW / 2, -cardH / 2, cardW, cardH);
		target.restore();
	};

	// Flames sit on the current burn edge, rise straight up and are only visible above it
	const drawFlames = (size, alpha) => {
		if (alpha <= 0 || size <= 0 || video.readyState < 2) return;

		flameSrcCtx.drawImage(video, 0, 0, FLAME_W, FLAME_H);
		const data = flameSrcCtx.getImageData(0, 0, FLAME_W, FLAME_H);
		const d = data.data;
		for (let p = 0; p < d.length; p += 4) {
			// Brightness becomes alpha: black background turns transparent
			d[p + 3] = Math.min(255, Math.max(d[p], d[p + 1], d[p + 2]) * 1.3);
		}
		flameSrcCtx.putImageData(data, 0, 0);

		const [cornerX, cornerY] = toScreen(TEX_W - 2, 2);
		const hasEdge = edge.count > 0;
		const minX = hasEdge ? edge.minX : cornerX - 4;
		const maxX = hasEdge ? edge.maxX : cornerX + 2;
		const baseY = hasEdge ? edge.maxY : cornerY;
		// At least a small visible flame at the corner, otherwise sized to the edge length
		const flameW = Math.max(cardW * 0.55, (maxX - minX) * 2.1) * size;
		const flameH = flameW * 1.45;
		const flameX = (minX + maxX) / 2 - flameW / 2;
		// The flame base in the footage is at ~90% of its height
		const flameY = baseY + cardW * 0.03 - flameH * 0.9;

		layerCtx.clearRect(0, 0, cssW, cssH);
		layerCtx.globalCompositeOperation = 'source-over';
		layerCtx.drawImage(flameSrc, flameX, flameY, flameW, flameH);
		// Never over the intact card
		layerCtx.globalCompositeOperation = 'destination-out';
		drawCardTo(layerCtx);
		// Never beside the burnt part in the air: fade out left and right of the edge
		layerCtx.globalCompositeOperation = 'destination-in';
		const pad = cardW * 0.07;
		const mask = layerCtx.createLinearGradient(minX - pad, 0, maxX + pad, 0);
		const soft = Math.min(0.3, (pad * 2) / Math.max(1, maxX - minX + pad * 2));
		mask.addColorStop(0, 'rgba(0,0,0,0)');
		mask.addColorStop(soft, 'rgba(0,0,0,1)');
		mask.addColorStop(1 - soft, 'rgba(0,0,0,1)');
		mask.addColorStop(1, 'rgba(0,0,0,0)');
		layerCtx.fillStyle = mask;
		layerCtx.fillRect(0, 0, cssW, cssH);
		layerCtx.globalCompositeOperation = 'source-over';

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.drawImage(layer, 0, 0, cssW, cssH);
		ctx.restore();
	};

	const drawIgnition = (intensity) => {
		if (intensity <= 0) return;
		const [x, y] = toScreen(TEX_W - 4, 4);
		const radius = cardW * (0.03 + 0.07 * intensity);
		const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
		glow.addColorStop(0, rgba(colors.glowHot, intensity));
		glow.addColorStop(0.35, rgba(colors.glow, intensity * 0.8));
		glow.addColorStop(1, rgba(colors.glow, 0));
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
	};

	const spawnEmber = (slow) => {
		if (!edge.points.length) return;
		const [x, y] = edge.points[Math.floor(Math.random() * edge.points.length)];
		const life = slow ? 4 + Math.random() * 2 : 2.2 + Math.random() * 2;
		embers.push({
			x,
			y,
			vx: (Math.random() - 0.3) * cardW * 0.06,
			vy: -cardW * (slow ? 0.1 : 0.14 + Math.random() * 0.1),
			age: 0,
			life,
			size: Math.random() < 0.4 ? 1 : 1.5,
		});
	};

	const drawEmbers = (dt) => {
		for (let i = embers.length - 1; i >= 0; i--) {
			const ember = embers[i];
			ember.age += dt;
			if (ember.age >= ember.life) {
				embers.splice(i, 1);
				continue;
			}
			ember.x += ember.vx * dt + Math.sin(ember.age * 3 + i) * 0.15;
			ember.y += ember.vy * dt;
			const k = ember.age / ember.life;
			const alpha = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
			ctx.fillStyle = rgba(colors.emberGlow, alpha * 0.35);
			ctx.beginPath();
			ctx.arc(ember.x, ember.y, ember.size * 3, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = rgba(colors.ember, alpha);
			ctx.beginPath();
			ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	// ---- Frame ----
	let dtSeconds = 0;
	const draw = () => {
		ctx.clearRect(0, 0, cssW, cssH);

		let flameSize = 0;
		let flameAlpha = 0;
		let ignition = 0;

		if (phase === 'ignite') {
			ignition = elapsed / IGNITE_MS;
		} else if (phase === 'burn') {
			const p = (elapsed - IGNITE_MS) / BURN_MS;
			front = lerp(minBurnTime, 1, easeInOut(p));
			// Small at the start, largest in the middle of the burn
			flameSize = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, p * 1.1));
			flameAlpha = Math.min(1, p * 8);
			ignition = Math.max(0, 1 - p * 6);
		} else if (phase === 'fade') {
			const p = (elapsed - IGNITE_MS - BURN_MS) / FADE_MS;
			flameSize = 0.35 * (1 - p);
			flameAlpha = 1 - p;
		}

		if (phase === 'smoulder') {
			// Weak, slow pulse of the glowing line
			glowStrength = reducedMotion ? 0.8 : 0.6 + 0.25 * Math.sin((performance.now() / 3500) * Math.PI * 2);
		}

		renderCard();
		drawCardTo(ctx);
		drawFlames(flameSize, flameAlpha);
		drawIgnition(ignition);
		if (!reducedMotion) drawEmbers(dtSeconds);
	};

	// ---- Loops ----
	const tick = (now) => {
		rafId = 0;
		const dt = lastTick ? Math.min(50, now - lastTick) : 16;
		lastTick = now;
		elapsed += dt;
		dtSeconds = dt / 1000;

		if (phase === 'ignite' && elapsed >= IGNITE_MS) {
			phase = 'burn';
			video.play().catch(() => {});
		}
		if (phase === 'burn' && elapsed >= IGNITE_MS + BURN_MS) phase = 'fade';
		if (phase === 'fade' && elapsed >= IGNITE_MS + BURN_MS + FADE_MS) {
			video.pause();
			enterSmoulder();
			return;
		}

		// Embers break away from the current edge while it burns; more edge, more embers
		const emberRate = Math.min(7, 1 + edge.count / 12);
		if (phase === 'burn' && Math.random() < dtSeconds * emberRate) spawnEmber(false);

		draw();
		if (visible) rafId = requestAnimationFrame(tick);
	};

	const smoulderTick = () => {
		if (!visible) return;
		dtSeconds = 1 / SMOULDER_FPS;
		const now = performance.now();
		if (now >= nextSmoulderEmber) {
			spawnEmber(true);
			nextSmoulderEmber = now + 2500 + Math.random() * 2500;
		}
		draw();
	};

	const enterSmoulder = () => {
		phase = 'smoulder';
		front = 1;
		lastTick = 0;
		if (reducedMotion) {
			draw();
			return;
		}
		nextSmoulderEmber = performance.now() + 1500;
		window.clearInterval(smoulderTimer);
		smoulderTimer = window.setInterval(smoulderTick, 1000 / SMOULDER_FPS);
		draw();
	};

	const resume = () => {
		if (phase === 'ignite' || phase === 'burn' || phase === 'fade') {
			if (phase !== 'ignite') video.play().catch(() => {});
			lastTick = 0;
			if (!rafId) rafId = requestAnimationFrame(tick);
		}
	};

	const pause = () => {
		if (rafId) cancelAnimationFrame(rafId);
		rafId = 0;
		video.pause();
	};

	// ---- Start conditions ----
	let pageLoaded = document.readyState === 'complete';
	let videoReady = video.readyState >= 3;
	let halfVisible = false;
	let startTimer = 0;

	const ignite = () => {
		writeSession();
		phase = 'ignite';
		elapsed = 0;
		if (visible) resume();
	};

	const tryStart = () => {
		if (phase !== 'wait' || startTimer) return;
		if (pageLoaded && videoReady && halfVisible) startTimer = window.setTimeout(ignite, START_DELAY_MS);
	};

	root.classList.add('is-ready');
	new ResizeObserver(resize).observe(root);
	resize();

	if (reducedMotion || alreadyPlayed) {
		enterSmoulder();
	} else {
		window.addEventListener('load', () => {
			pageLoaded = true;
			tryStart();
		});
		video.addEventListener('canplaythrough', () => {
			videoReady = true;
			tryStart();
		});
		// Without playable footage the card still burns, just without flames
		video.addEventListener('error', () => {
			videoReady = true;
			tryStart();
		}, true);
	}

	new IntersectionObserver(
		([entry]) => {
			visible = entry.isIntersecting;
			halfVisible = halfVisible || entry.intersectionRatio >= 0.5;
			if (visible) {
				resume();
				if (phase === 'smoulder' && !reducedMotion) smoulderTick();
			} else {
				pause();
			}
			tryStart();
		},
		{ threshold: [0, 0.5] },
	).observe(root);
}

// ---- Helpers ----

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function easeInOut(t) {
	const x = Math.min(1, Math.max(0, t));
	return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function rgba([r, g, b], a) {
	return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

function hexToRgb(hex) {
	const h = hex.trim().replace('#', '');
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// Colours come from the design tokens (hex values)
function readColors(el) {
	const style = getComputedStyle(el);
	const token = (name, fallback) => hexToRgb(style.getPropertyValue(name) || fallback);
	return {
		glow: token('--color-burn-glow', '#ffb347'),
		glowHot: token('--color-burn-glow-hot', '#ffe08a'),
		char: token('--color-burn-char', '#2e1a0e'),
		heat: token('--color-burn-heat', '#a0683a'),
		ember: token('--color-ember', '#ffc266'),
		emberGlow: token('--color-ember-glow', '#ff7828'),
	};
}

function readSession() {
	try {
		return sessionStorage.getItem(SESSION_KEY) === '1';
	} catch {
		return false;
	}
}

function writeSession() {
	try {
		sessionStorage.setItem(SESSION_KEY, '1');
	} catch {
		// Storage may be blocked; then the effect simply plays again
	}
}

// Smooth value noise and fractal sum of a few octaves, deterministic
function hash(x, y) {
	let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y) {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const fx = x - x0;
	const fy = y - y0;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);
	const top = lerp(hash(x0, y0), hash(x0 + 1, y0), sx);
	const bottom = lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), sx);
	return lerp(top, bottom, sy);
}

function fbm(x, y) {
	let sum = 0;
	let amplitude = 0.5;
	let frequency = 1;
	for (let octave = 0; octave < 4; octave++) {
		sum += amplitude * valueNoise(x * frequency, y * frequency);
		amplitude *= 0.5;
		frequency *= 2;
	}
	return sum / 0.9375;
}
