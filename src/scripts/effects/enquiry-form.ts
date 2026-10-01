// Effect "enquiry-form": validates the enquiry with clear German messages and sends it with
// fetch to the Worker (form action, POST /api/anfrage), including the Turnstile token.
// While sending, the button is disabled. Success shows the confirmation, errors a friendly
// German message with the e-mail address as an alternative.
// Without JS the form is a plain POST; the Worker then redirects back to #anfrage-ok / -fehler.

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

declare global {
	interface Window {
		turnstile?: { reset: (widget?: Element | string) => void };
	}
}

const CONTACT_EMAIL = 'kontakt@magicreini.com';

const ERROR_MESSAGES: Record<string, string> = {
	turnstile: `Die Sicherheitsprüfung hat leider nicht geklappt. Bitte versuchen Sie es noch einmal oder schreiben Sie mir direkt an ${CONTACT_EMAIL}.`,
	missing: 'Bitte geben Sie Ihren Namen und Ihre E-Mail-Adresse an.',
	'invalid-email': 'Bitte prüfen Sie Ihre E-Mail-Adresse.',
	default: `Ihre Anfrage konnte leider nicht gesendet werden. Bitte versuchen Sie es später noch einmal oder schreiben Sie mir direkt an ${CONTACT_EMAIL}.`,
};

export function init(root: HTMLElement) {
	if (!(root instanceof HTMLFormElement)) return;
	const form = root;
	const endpoint = form.getAttribute('action');
	const confirmation = document.getElementById(form.dataset.confirmation ?? '');
	const status = document.getElementById(form.dataset.status ?? '');
	const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
	const widget = form.querySelector('.cf-turnstile');

	// JS takes over validation and sending
	form.noValidate = true;

	const fields = [...form.elements].filter(
		(element): element is Field =>
			(element instanceof HTMLInputElement ||
				element instanceof HTMLSelectElement ||
				element instanceof HTMLTextAreaElement) &&
			element.name !== 'website' &&
			element.name !== 'cf-turnstile-response',
	);

	const errorFor = (field: Field) => document.getElementById(`${field.id}-error`);

	const message = (field: Field) => {
		const { validity, dataset } = field;
		if (validity.valueMissing) return dataset.errorMissing ?? 'Bitte füllen Sie dieses Feld aus.';
		if (validity.typeMismatch) return dataset.errorType ?? 'Bitte prüfen Sie Ihre Eingabe.';
		if (validity.rangeUnderflow) return dataset.errorRange ?? 'Bitte prüfen Sie Ihre Eingabe.';
		return 'Bitte prüfen Sie Ihre Eingabe.';
	};

	// Show or clear the message of one field; returns whether the field is valid
	const check = (field: Field) => {
		const error = errorFor(field);
		const valid = field.checkValidity();
		if (valid) {
			field.removeAttribute('aria-invalid');
			if (error) error.hidden = true;
		} else {
			field.setAttribute('aria-invalid', 'true');
			if (error) {
				error.textContent = message(field);
				error.hidden = false;
				field.setAttribute('aria-describedby', error.id);
			}
		}
		return valid;
	};

	// Once a field was marked invalid, re-check it while the visitor corrects it
	for (const field of fields) {
		field.addEventListener('input', () => {
			if (field.getAttribute('aria-invalid') === 'true') check(field);
		});
	}

	const showStatus = (text: string) => {
		if (!status) return;
		status.textContent = text;
		status.hidden = false;
	};

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (status) status.hidden = true;

		const invalid = fields.filter((field) => !check(field));
		if (invalid.length) {
			invalid[0].focus();
			return;
		}

		const data = new FormData(form);
		if (!data.get('cf-turnstile-response')) {
			showStatus('Die Sicherheitsprüfung läuft noch. Bitte versuchen Sie es in einem Moment noch einmal.');
			return;
		}

		if (submit) submit.disabled = true;
		try {
			const response = await fetch(endpoint ?? '/api/anfrage', {
				method: 'POST',
				body: data,
				headers: { Accept: 'application/json' },
			});
			const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			if (!response.ok || !result.ok) {
				showStatus(ERROR_MESSAGES[result.error ?? ''] ?? ERROR_MESSAGES.default);
				// A Turnstile token can only be used once; get a fresh one for the next attempt
				if (widget) window.turnstile?.reset(widget);
				return;
			}

			form.hidden = true;
			if (confirmation) {
				confirmation.hidden = false;
				confirmation.focus();
			}
		} catch {
			showStatus(ERROR_MESSAGES.default);
			if (widget) window.turnstile?.reset(widget);
		} finally {
			if (submit) submit.disabled = false;
		}
	});
}
