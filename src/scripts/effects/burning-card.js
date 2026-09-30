// Effect module "burning-card": renders the ace in a <canvas>, lets it catch fire at the
// top right corner and burn away a frayed corner, then keeps the burnt edge burning lightly.
//
// Timeline (starts shortly after the page has loaded, as soon as the card is >= 50% visible;
// restarts on every page load):
//   ignite  1 s   a small glowing dot at the corner
//   burn   11 s   the burn edge eats diagonally inwards, slowly at first and ever faster,
//                 like real paper; the flames grow with it
//   fade    2 s   the flames calm down to a small afterburn
//   afterburn     low flames keep flickering on the burnt edge, now and then one goes out
//                 and relights; the glowing line pulses, an ember rises every few seconds
// Reduced motion: the end state at once, static, without flames and embers.
//
// The flames are drawn procedurally: many small flame tongues stand on points of the
// current burn edge, rise straight up and flicker with noise. Because each tongue is
// anchored to the edge, the fire always sits on the card and moves with the edge.

const ROTATION = (-12 * Math.PI) / 180;
// Canvas size around the card box, as fractions of card width/height (mirrors the CSS)
const CANVAS_MARGIN = { left: 0.2, right: 0.6, top: 0.8, bottom: 0.15 };

// Card texture (card-intact.webp, 2x resolution)
const TEX_W = 300;
const TEX_H = 420;
// Final burnt corner: along the top edge ~38% of the width, along the right edge ~42% of the height
const CORNER_X = 0.38;
const CORNER_Y = 0.42;

const START_DELAY_MS = 600;
const IGNITE_MS = 1000;
const BURN_MS = 11000;
const FADE_MS = 2000;

// Widths of the burn edge zones, in normalized burn distance (1 = final corner size)
const EDGE_AA = 0.006;
const GLOW = 0.02;
const CHAR = 0.035;
const HEAT = 0.11;

// Flame tongues along the edge
const MAX_TONGUES = 18;
// Flame height as a fraction of the card width
const FLAME_H_START = 0.1;
const FLAME_H_PEAK = 0.42;
const FLAME_H_AFTERBURN = 0.13;

export function init(root) {
	const canvas = root.querySelector('.burning-card__canvas');
	const fallback = root.querySelector('.burning-card__fallback');
	if (!canvas || !fallback) return;

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const image = new Image();
	image.src = fallback.currentSrc || fallback.src;
	image
		.decode()
		.then(() => start(root, canvas, image, reducedMotion))
		.catch(() => {
			// Keep the plain image if the card cannot be decoded
		});
}

function start(root, canvas, image, reducedMotion) {
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

	// Flames are drawn on their own layer, then everything over the intact card is cut away
	const layer = document.createElement('canvas');
	const layerCtx = layer.getContext('2d');

	// Each tongue keeps its own random character, so the fire looks irregular but stable
	const tongues = Array.from({ length: MAX_TONGUES }, () => ({
		jitter: (Math.random() - 0.5) * 0.6,
		seed: Math.random() * 100,
		speed: 1.4 + Math.random() * 1.8,
		size: 0.7 + Math.random() * 0.6,
	}));

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
		// offsetWidth ignores the float animation's small rotation
		cardW = root.offsetWidth || root.getBoundingClientRect().width;
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
	let phase = 'wait'; // wait | ignite | burn | fade | afterburn | still
	let elapsed = 0; // ms since ignition, only counted while visible
	let front = -Infinity; // current burn front in normalized burn distance
	let glowStrength = 1;
	let edge = { points: [], count: 0 };
	const embers = [];
	let nextAfterburnEmber = 0;
	let visible = false;
	let rafId = 0;
	let lastTick = 0;

	// Recolour the corner region for the current front and collect the burn edge
	const renderCard = () => {
		const src = original.data;
		const out = frame.data;
		const points = [];
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
							count++;
							if (points.length < 300) points.push(toScreen(rx0 + x, y));
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
		// Order the edge points along the edge (it runs from the top edge down to the right edge)
		points.sort((p1, p2) => p1[0] + p1[1] - (p2[0] + p2[1]));
		edge = { points, count };
	};

	const drawCardTo = (target) => {
		target.save();
		target.translate(centerX, centerY);
		target.rotate(ROTATION);
		target.drawImage(card, -cardW / 2, -cardH / 2, cardW, cardH);
		target.restore();
	};

	// One flame tongue standing on (x, y): a teardrop that rises straight up, with a bright core
	const drawTongue = (target, x, y, h, lean, alpha) => {
		const w = h * 0.42;
		const tipX = x + lean;
		const tipY = y - h;

		const outer = target.createLinearGradient(x, y, x, tipY);
		outer.addColorStop(0, rgba(colors.glowHot, alpha * 0.95));
		outer.addColorStop(0.3, rgba(colors.glow, alpha * 0.85));
		outer.addColorStop(0.65, rgba(colors.flameTip, alpha * 0.5));
		outer.addColorStop(1, rgba(colors.flameTip, 0));
		target.fillStyle = outer;
		target.beginPath();
		target.moveTo(x - w / 2, y);
		target.bezierCurveTo(x - w / 2, y - h * 0.45, tipX - w * 0.2, y - h * 0.72, tipX, tipY);
		target.bezierCurveTo(tipX + w * 0.2, y - h * 0.72, x + w / 2, y - h * 0.45, x + w / 2, y);
		target.quadraticCurveTo(x, y + w * 0.35, x - w / 2, y);
		target.fill();

		// Hot core in the lower part of the flame
		const coreH = h * 0.5;
		const coreW = w * 0.45;
		const core = target.createLinearGradient(x, y, x, y - coreH);
		core.addColorStop(0, rgba(colors.glowHot, alpha));
		core.addColorStop(1, rgba(colors.glowHot, 0));
		target.fillStyle = core;
		target.beginPath();
		target.moveTo(x - coreW / 2, y);
		target.quadraticCurveTo(x - coreW / 2, y - coreH * 0.6, x + lean * 0.4, y - coreH);
		target.quadraticCurveTo(x + coreW / 2, y - coreH * 0.6, x + coreW / 2, y);
		target.fill();
	};

	// Flames: tongues anchored on points spread along the current edge
	const drawFlames = (height, alpha, afterburn) => {
		const pts = edge.points;
		if (alpha <= 0 || height <= 0 || pts.length < 2) return;

		const [firstX, firstY] = pts[0];
		const [lastX, lastY] = pts[pts.length - 1];
		const span = Math.hypot(lastX - firstX, lastY - firstY);
		// More edge, more tongues; the afterburn has fewer, lower ones
		const spacing = cardW * (afterburn ? 0.075 : 0.055);
		const active = Math.max(2, Math.min(MAX_TONGUES, Math.round(span / spacing) + 1));
		const time = elapsed / 1000;
		const flameH = cardW * height;

		layerCtx.clearRect(0, 0, cssW, cssH);
		layerCtx.globalCompositeOperation = 'lighter';

		for (let i = 0; i < active; i++) {
			const tongue = tongues[i];
			const t = Math.min(1, Math.max(0, (i + 0.5 + tongue.jitter) / active));
			const [x, y] = pts[Math.round(t * (pts.length - 1))];
			// Flicker: height and lean follow smooth noise, fast and irregular like real fire
			const flicker = valueNoise(time * tongue.speed, tongue.seed);
			const flutter = valueNoise(time * tongue.speed * 2.7, tongue.seed + 31);
			let h = flameH * tongue.size * (0.45 + 0.55 * flicker + 0.2 * (flutter - 0.5));
			let a = alpha;
			if (afterburn) {
				// Now and then a small flame goes out and relights
				const life = valueNoise(time * 0.6, tongue.seed + 77);
				if (life < 0.22) continue;
				a *= Math.min(1, (life - 0.22) / 0.15);
				h *= 0.7 + 0.6 * (life - 0.22);
			}
			const lean = (valueNoise(time * 1.3, tongue.seed + 13) - 0.5) * h * 0.5;
			drawTongue(layerCtx, x, y + cardW * 0.01, h, lean, a);
		}

		// Soft warm light around the burning edge
		const [midX, midY] = pts[Math.floor(pts.length / 2)];
		const radius = Math.max(span * 0.8, flameH * 1.2);
		const halo = layerCtx.createRadialGradient(midX, midY - flameH * 0.3, 0, midX, midY - flameH * 0.3, radius);
		halo.addColorStop(0, rgba(colors.glow, alpha * (afterburn ? 0.12 : 0.22)));
		halo.addColorStop(1, rgba(colors.glow, 0));
		layerCtx.fillStyle = halo;
		layerCtx.fillRect(0, 0, cssW, cssH);

		// Flames never cover the intact card: they rise out of the edge
		layerCtx.globalCompositeOperation = 'destination-out';
		drawCardTo(layerCtx);
		layerCtx.globalCompositeOperation = 'source-over';

		ctx.drawImage(layer, 0, 0, cssW, cssH);
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

		let flameHeight = 0;
		let flameAlpha = 0;
		let ignition = 0;

		if (phase === 'ignite') {
			ignition = elapsed / IGNITE_MS;
		} else if (phase === 'burn') {
			const p = Math.min(1, (elapsed - IGNITE_MS) / BURN_MS);
			// Slow at first and ever faster, like paper that burns
			front = lerp(minBurnTime, 1, burnCurve(p));
			// The fire grows as it speeds up
			flameHeight = lerp(FLAME_H_START, FLAME_H_PEAK, Math.pow(p, 0.9));
			flameAlpha = Math.min(1, p * 10);
			ignition = Math.max(0, 1 - p * 5);
		} else if (phase === 'fade') {
			const p = Math.min(1, (elapsed - IGNITE_MS - BURN_MS) / FADE_MS);
			flameHeight = lerp(FLAME_H_PEAK, FLAME_H_AFTERBURN, easeOut(p));
			flameAlpha = lerp(1, 0.85, p);
		} else if (phase === 'afterburn') {
			flameHeight = FLAME_H_AFTERBURN;
			flameAlpha = 0.85;
		}

		if (phase === 'afterburn' || phase === 'still') {
			// Weak, slow pulse of the glowing line (static with reduced motion)
			glowStrength = phase === 'still' ? 0.8 : 0.65 + 0.25 * Math.sin((elapsed / 3500) * Math.PI * 2);
		}

		renderCard();
		drawCardTo(ctx);
		drawFlames(flameHeight, flameAlpha, phase === 'afterburn');
		drawIgnition(ignition);
		if (!reducedMotion) drawEmbers(dtSeconds);
	};

	// ---- Loop ----
	const tick = (now) => {
		rafId = 0;
		const dt = lastTick ? Math.min(50, now - lastTick) : 16;
		lastTick = now;
		elapsed += dt;
		dtSeconds = dt / 1000;

		if (phase === 'ignite' && elapsed >= IGNITE_MS) phase = 'burn';
		if (phase === 'burn' && elapsed >= IGNITE_MS + BURN_MS) {
			phase = 'fade';
			front = 1;
		}
		if (phase === 'fade' && elapsed >= IGNITE_MS + BURN_MS + FADE_MS) phase = 'afterburn';

		// Embers break away from the current edge while it burns; more edge, more embers
		const emberRate = Math.min(7, 1 + edge.count / 12);
		if (phase === 'burn' && Math.random() < dtSeconds * emberRate) spawnEmber(false);
		// Afterburn: a single slow ember every few seconds
		if (phase === 'afterburn' && elapsed >= nextAfterburnEmber) {
			spawnEmber(true);
			nextAfterburnEmber = elapsed + 1500 + Math.random() * 2000;
		}

		draw();
		if (visible) rafId = requestAnimationFrame(tick);
	};

	// Reduced motion: burnt end state at once, static, without flames and embers
	const showStill = () => {
		phase = 'still';
		front = 1;
		draw();
	};

	const resume = () => {
		if (phase === 'wait' || phase === 'still') return;
		lastTick = 0;
		if (!rafId) rafId = requestAnimationFrame(tick);
	};

	const pause = () => {
		if (rafId) cancelAnimationFrame(rafId);
		rafId = 0;
	};

	// ---- Start conditions ----
	let pageLoaded = document.readyState === 'complete';
	let halfVisible = false;
	let startTimer = 0;

	const ignite = () => {
		phase = 'ignite';
		elapsed = 0;
		if (visible) resume();
	};

	const tryStart = () => {
		if (phase !== 'wait' || startTimer) return;
		if (pageLoaded && halfVisible) startTimer = window.setTimeout(ignite, START_DELAY_MS);
	};

	root.classList.add('is-ready');
	new ResizeObserver(resize).observe(root);
	resize();

	if (reducedMotion) {
		showStill();
	} else {
		window.addEventListener('load', () => {
			pageLoaded = true;
			tryStart();
		});
	}

	new IntersectionObserver(
		([entry]) => {
			visible = entry.isIntersecting;
			halfVisible = halfVisible || entry.intersectionRatio >= 0.5;
			if (visible) resume();
			else pause();
			if (!reducedMotion) tryStart();
		},
		{ threshold: [0, 0.5] },
	).observe(root);
}

// ---- Helpers ----

function lerp(a, b, t) {
	return a + (b - a) * t;
}

// Burn progress: slow start that keeps accelerating
function burnCurve(t) {
	const x = Math.min(1, Math.max(0, t));
	return 0.12 * x + 0.88 * Math.pow(x, 2.3);
}

function easeOut(t) {
	return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 2);
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
		flameTip: token('--color-flame-tip', '#d9431e'),
		ember: token('--color-ember', '#ffc266'),
		emberGlow: token('--color-ember-glow', '#ff7828'),
	};
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
