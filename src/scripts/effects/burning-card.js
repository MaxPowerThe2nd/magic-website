// Effect module "burning-card": the card flares up once when it first becomes visible
// (flame video fades in and plays, 14 embers), then smoulders (video fades out and pauses,
// glow pulses, 4 slow embers). On desktop, hovering makes it flare up again briefly.
// With prefers-reduced-motion nothing happens: only the card image is shown.

// Burn edge in % of the element box (left end -> right end).
const EDGE_LEFT = [5.9, 35.5];
const EDGE_RIGHT = [83, 23.1];

const FIRST_BURN_MS = 3500;
const HOVER_BURN_MS = 2000;
const HOVER_COOLDOWN_MS = 3000;
const BURN_EMBERS = 14;
const SMOULDER_EMBERS = 4;

export function init(el) {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const video = el.querySelector('video');
	const card = el.querySelector('.burning-card__card');
	let burning = false;
	let visible = false;
	let hasBurned = false;
	let burnTimer = 0;
	let lastTrigger = 0;

	const play = () => video.play().catch(() => {});

	const burn = (duration) => {
		burning = true;
		lastTrigger = Date.now();
		el.classList.add('is-burning');
		setEmbers(el, BURN_EMBERS, false);
		if (visible) play();

		window.clearTimeout(burnTimer);
		burnTimer = window.setTimeout(() => {
			burning = false;
			el.classList.remove('is-burning');
			el.classList.add('is-smoldering');
			setEmbers(el, SMOULDER_EMBERS, true);
		}, duration);
	};

	// Pause the video once it has faded out after burning
	video.addEventListener('transitionend', (event) => {
		if (event.propertyName === 'opacity' && !burning) video.pause();
	});

	// First flare-up when the card becomes visible; pause while it is out of view
	const observer = new IntersectionObserver(
		([entry]) => {
			visible = entry.isIntersecting;
			if (visible && !hasBurned) {
				hasBurned = true;
				burn(FIRST_BURN_MS);
			} else if (burning) {
				if (visible) play();
				else video.pause();
			}
		},
		{ threshold: 0.5 },
	);
	observer.observe(el);

	// Desktop only: hovering the card makes it flare up again, with a cooldown
	if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
		card.addEventListener('pointerenter', () => {
			if (!hasBurned || burning) return;
			if (Date.now() - lastTrigger < HOVER_BURN_MS + HOVER_COOLDOWN_MS) return;
			burn(HOVER_BURN_MS);
		});
	}
}

// Replace the embers: many short-lived ones while burning, a few slow ones while smouldering.
// Embers only start on the burn edge within the card width.
function setEmbers(el, count, slow) {
	el.querySelectorAll('.burning-card__ember').forEach((ember) => ember.remove());

	for (let i = 0; i < count; i++) {
		const t = 0.05 + Math.random() * 0.9;
		const ember = document.createElement('span');
		ember.className = 'burning-card__ember';
		ember.style.left = `${EDGE_LEFT[0] + (EDGE_RIGHT[0] - EDGE_LEFT[0]) * t}%`;
		ember.style.top = `${EDGE_LEFT[1] + (EDGE_RIGHT[1] - EDGE_LEFT[1]) * t - 2}%`;
		if (slow) {
			ember.style.setProperty('--d', `${(4 + Math.random() * 2).toFixed(2)}s`);
			// Spread the few embers evenly over time
			ember.style.setProperty('--delay', `${(-(i / count) * 5).toFixed(2)}s`);
		} else {
			ember.style.setProperty('--d', `${(2.2 + Math.random() * 2.2).toFixed(2)}s`);
			ember.style.setProperty('--delay', `${(-Math.random() * 4).toFixed(2)}s`);
		}
		ember.style.setProperty('--dx', `${Math.round(Math.random() * 50 - 10)}px`);
		if (Math.random() < 0.4) ember.style.width = ember.style.height = '2px';
		el.appendChild(ember);
	}
}
