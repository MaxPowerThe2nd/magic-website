// Effect "cloche": lifts the silver cloche to reveal the contact card.
// CSS (Cloche.astro) shows the card open by default; this module only adds the
// closed state, the one-time hint and the opening, and only when motion is allowed.

const HINT_DELAY_MS = 3000;

export function init(root: HTMLElement) {
	const lid = root.querySelector<HTMLButtonElement>('[data-cloche-lid]');
	const card = root.querySelector<HTMLElement>('[data-cloche-card]');
	if (!lid || !card) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const cardLinks = card.querySelectorAll<HTMLAnchorElement>('a');
	// Covered links stay in the DOM for screen readers but are skipped by the Tab key
	const setLinksFocusable = (focusable: boolean) =>
		cardLinks.forEach((link) =>
			focusable ? link.removeAttribute('tabindex') : link.setAttribute('tabindex', '-1'),
		);

	root.classList.add('is-ready');
	setLinksFocusable(false);

	const open = () => {
		if (root.classList.contains('is-open')) return;
		root.classList.remove('is-peek');
		root.classList.add('is-open');
		lid.setAttribute('aria-expanded', 'true');
		setLinksFocusable(true);
		// The lid disappears, so move focus to the revealed card
		card.focus({ preventScroll: true });
	};

	// A native button already handles click, Enter and Space
	lid.addEventListener('click', open);

	root.addEventListener('animationend', () => root.classList.remove('is-peek'));

	// Hint once per page view, a few seconds after the section becomes visible
	const observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer.disconnect();
			window.setTimeout(() => {
				if (!root.classList.contains('is-open')) root.classList.add('is-peek');
			}, HINT_DELAY_MS);
		},
		{ threshold: 0.5 },
	);
	observer.observe(root);
}
