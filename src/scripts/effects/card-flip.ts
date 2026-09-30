// Effect "card-flip": turns a playing card between front and back.
// The hidden face is made inert, so Tab and screen readers only reach the visible side.
// Without JS (no "is-ready" class) both sides stay visible one below the other.

export function init(root: HTMLElement) {
	const front = root.querySelector<HTMLElement>('[data-flip-front]');
	const back = root.querySelector<HTMLElement>('[data-flip-back]');
	const openButton = root.querySelector<HTMLButtonElement>('.flip-open');
	const closeButton = root.querySelector<HTMLButtonElement>('.flip-close');
	if (!front || !back || !openButton || !closeButton) return;

	const setFlipped = (flipped: boolean, moveFocus: boolean) => {
		root.classList.toggle('is-flipped', flipped);
		openButton.setAttribute('aria-expanded', String(flipped));
		front.inert = flipped;
		back.inert = !flipped;
		if (moveFocus) (flipped ? closeButton : openButton).focus({ preventScroll: true });
	};

	root.classList.add('is-ready');
	setFlipped(false, false);

	openButton.addEventListener('click', () => setFlipped(true, true));
	closeButton.addEventListener('click', () => setFlipped(false, true));
}
