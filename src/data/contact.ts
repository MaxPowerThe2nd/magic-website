// Central contact data, used by the contact card, footer and mobile booking bar.
// TODO: replace the placeholders with the real phone number and e-mail address.
export const contact = {
	name: 'Reinhard Hütter',
	phoneDisplay: '[TODO: Telefon]',
	/** International format without spaces, e.g. +436641234567 */
	phoneLink: '[TODO: Telefon]',
	email: '[TODO: E-Mail]',
};

export const phoneHref = `tel:${contact.phoneLink}`;
export const emailHref = `mailto:${contact.email}`;
