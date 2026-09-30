// Effect loader: finds every element with data-effect="name" and initialises the
// matching module. New effects only need a new file and one entry in this map.
type EffectModule = { init: (element: HTMLElement) => void };

const effects: Record<string, () => Promise<EffectModule>> = {
	cloche: () => import('./cloche'),
	'enquiry-form': () => import('./enquiry-form'),
	'floating-cards': () => import('./floating-cards'),
	'video-lightbox': () => import('./video-lightbox'),
};

for (const element of document.querySelectorAll<HTMLElement>('[data-effect]')) {
	for (const name of (element.dataset.effect ?? '').split(/\s+/)) {
		const load = effects[name];
		if (load) load().then((module) => module.init(element));
	}
}
