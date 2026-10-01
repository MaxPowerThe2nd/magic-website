// Central contact data, used by the contact card, footer and mobile booking bar.
export const contact = {
	name: 'Reinhard Hütter',
	phoneDisplay: '+43 677 62179694',
	/** International format without spaces, e.g. +436641234567 */
	phoneLink: '+4367762179694',
	email: 'kontakt@magicreini.com',
};

export const phoneHref = `tel:${contact.phoneLink}`;
export const emailHref = `mailto:${contact.email}`;

// Endpoint of the enquiry form, handled by the Worker in src/worker/index.ts
export const formEndpoint = '/api/anfrage';

// Public Turnstile sitekey (safe to publish). For local tests build with
// PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA (Cloudflare test key, always passes).
export const turnstileSiteKey: string =
	import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '0x4AAAAAAFK-BwvOdoMGdX9u';
