// Central contact data, used by the contact card, footer and mobile booking bar.
export const contact = {
	name: 'Reinhard Hütter',
	phoneDisplay: '+43 677 62179694',
	/** International format without spaces, e.g. +436641234567 */
	phoneLink: '+4367762179694',
	email: 'office@huettermagic.com',
};

export const phoneHref = `tel:${contact.phoneLink}`;
export const emailHref = `mailto:${contact.email}`;

// Endpoint that receives the enquiry form (POST). Not decided yet, so nothing is sent anywhere.
// TODO: [TODO: Formular-Dienst] – set the URL of the chosen form service here.
export const formEndpoint: string | undefined = undefined;
