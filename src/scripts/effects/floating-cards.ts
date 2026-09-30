// Effect "floating-cards": light mouse parallax for the floating card backs.
// Only on devices with a fine pointer (no phones) and when motion is allowed.

export function init(root: HTMLElement) {
	const canParallax = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!canParallax || reducedMotion) return;

	let frame = 0;
	window.addEventListener(
		'pointermove',
		(event) => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				// Mouse position relative to the viewport centre, -1..1
				root.style.setProperty('--mx', ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
				root.style.setProperty('--my', ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3));
			});
		},
		{ passive: true },
	);
}
