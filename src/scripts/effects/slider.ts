// Effect "slider": arrow buttons for a horizontal scroll-snap row.
// Swiping and keyboard scrolling work natively; the buttons scroll by one slide and are
// disabled at the start and end. Without JS the row still scrolls sideways.

export function init(root: HTMLElement) {
	const track = root.querySelector<HTMLElement>('.slider-track');
	const prev = root.querySelector<HTMLButtonElement>('[data-slider-prev]');
	const next = root.querySelector<HTMLButtonElement>('[data-slider-next]');
	if (!track || !prev || !next) return;

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const update = () => {
		const max = track.scrollWidth - track.clientWidth;
		prev.disabled = track.scrollLeft <= 1;
		next.disabled = track.scrollLeft >= max - 1;
	};

	// Scroll to the neighbouring slide in the given direction
	const go = (direction: 1 | -1) => {
		const slides = [...track.children] as HTMLElement[];
		const start = track.getBoundingClientRect().left;
		const offsets = slides.map((slide) => slide.getBoundingClientRect().left - start);
		const target =
			direction > 0
				? offsets.find((offset) => offset > 1)
				: [...offsets].reverse().find((offset) => offset < -1);
		if (target === undefined) return;
		track.scrollBy({ left: target, behavior: reducedMotion ? 'auto' : 'smooth' });
	};

	prev.addEventListener('click', () => go(-1));
	next.addEventListener('click', () => go(1));
	track.addEventListener('scroll', update, { passive: true });
	new ResizeObserver(update).observe(track);

	root.classList.add('is-ready');
	update();
}
