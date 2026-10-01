// Cloudflare Worker: handles POST /api/anfrage (the enquiry form) and passes every other
// request unchanged to the static assets built by Astro (./dist). The site itself stays static.
//
// Flow: honeypot check -> Turnstile Siteverify -> field validation -> e-mail via the
// send_email binding. Requests from the page's fetch() get JSON (Accept: application/json);
// a plain form POST (no JavaScript) gets a redirect back to the form, to #anfrage-ok or
// #anfrage-fehler, where the static page shows the matching message via CSS :target.
//
// Secrets: TURNSTILE_SECRET_KEY is a Worker secret (dashboard / .dev.vars), never in the repo.

interface EmailAddress {
	email: string;
	name?: string;
}

interface SendEmail {
	send(message: {
		from: string | EmailAddress;
		to: string | string[];
		replyTo?: string | EmailAddress;
		subject: string;
		text?: string;
	}): Promise<unknown>;
}

interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> };
	EMAIL: SendEmail;
	TURNSTILE_SECRET_KEY: string;
}

const FORM_PATH = '/api/anfrage';
const SENDER: EmailAddress = { email: 'formular@magicreini.com', name: 'Website magicreini.com' };
const RECIPIENT = 'reinhard.huetter.privat@gmail.com';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Form fields in mail order: name in the form, label in the mail, maximum length
const FIELDS = [
	['datum', 'Datum', 20],
	['ort', 'Ort', 120],
	['anlass', 'Anlass', 60],
	['gaeste', 'Gästeanzahl', 10],
	['format', 'Format', 80],
	['nachricht', 'Nachricht', 4000],
	['name', 'Name', 100],
	['email', 'E-Mail', 200],
	['telefon', 'Telefon', 40],
] as const;

type FieldName = (typeof FIELDS)[number][0];

// Simple, deliberately permissive address check: something@something.tld without spaces
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type ErrorCode = 'bad-request' | 'missing' | 'invalid-email' | 'turnstile' | 'send';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === FORM_PATH && request.method === 'POST') {
			return handleEnquiry(request, env);
		}
		// Everything else is served by the static assets, unchanged
		return env.ASSETS.fetch(request);
	},
};

async function handleEnquiry(request: Request, env: Env): Promise<Response> {
	const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');
	const reply = (ok: boolean, error?: ErrorCode, status = 200) =>
		wantsJson
			? Response.json(ok ? { ok: true } : { ok: false, error }, { status })
			: // Plain form POST without JavaScript: back to the form with a visible message
				Response.redirect(new URL(`/#anfrage-${ok ? 'ok' : 'fehler'}`, request.url).toString(), 303);

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return reply(false, 'bad-request', 400);
	}

	// Honeypot: invisible field that only bots fill in; discard silently, pretend success
	if (String(form.get('website') ?? '').trim() !== '') return reply(true);

	// Turnstile first, so bots never reach the validation or the mail
	const token = String(form.get('cf-turnstile-response') ?? '');
	const ip = request.headers.get('CF-Connecting-IP') ?? undefined;
	if (!token || !(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip))) {
		return reply(false, 'turnstile', 403);
	}

	// Read, trim and cap every field
	const values = {} as Record<FieldName, string>;
	for (const [field, , max] of FIELDS) {
		values[field] = String(form.get(field) ?? '').trim().slice(0, max);
	}
	// No line breaks where they could inject mail headers
	for (const field of ['name', 'email', 'anlass'] as const) {
		values[field] = values[field].replace(/[\r\n]+/g, ' ');
	}

	if (!values.name || !values.email) return reply(false, 'missing', 422);
	if (!EMAIL_PATTERN.test(values.email)) return reply(false, 'invalid-email', 422);

	const subject = `Neue Anfrage: ${values.anlass || 'ohne Anlass'} – ${values.name}`;
	const text = [
		'Neue Anfrage über das Formular auf magicreini.com',
		'',
		...FIELDS.map(([field, label]) =>
			field === 'nachricht'
				? `${label}:\n${values[field] || '–'}\n`
				: `${label}: ${values[field] || '–'}`,
		),
		'',
		'Antworten Sie einfach auf diese E-Mail, die Antwort geht direkt an den Anfragenden.',
	].join('\n');

	try {
		await env.EMAIL.send({
			from: SENDER,
			to: RECIPIENT,
			replyTo: values.email,
			subject,
			text,
		});
	} catch (error) {
		console.error('Sending the enquiry failed', error);
		return reply(false, 'send', 502);
	}

	return reply(true);
}

async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<boolean> {
	if (!secret) {
		console.error('TURNSTILE_SECRET_KEY is not set');
		return false;
	}
	const body = new FormData();
	// Trim in case the secret was pasted with a trailing space or line break
	body.append('secret', secret.trim());
	body.append('response', token);
	if (ip) body.append('remoteip', ip);
	try {
		const response = await fetch(SITEVERIFY_URL, { method: 'POST', body });
		const result = (await response.json()) as { success?: boolean; hostname?: string; 'error-codes'?: string[] };
		if (result.success !== true) {
			// Visible in the Worker logs (dashboard: Workers & Pages -> magic-website -> Logs)
			console.error('Turnstile rejected the token', {
				errors: result['error-codes'],
				hostname: result.hostname,
				secretLength: secret.trim().length,
			});
		}
		return result.success === true;
	} catch (error) {
		console.error('Turnstile Siteverify failed', error);
		return false;
	}
}
