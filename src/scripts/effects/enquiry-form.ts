// Effect "enquiry-form": validates the enquiry with clear German messages and sends it to the
// form service configured in src/data/contact.ts (form action). As long as no service is set,
// nothing is sent to anyone and no success is faked: the visitor is pointed to phone and e-mail.

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function init(root: HTMLElement) {
	if (!(root instanceof HTMLFormElement)) return;
	const form = root;
	const endpoint = form.getAttribute('action');
	const confirmation = document.getElementById(form.dataset.confirmation ?? '');
	const status = document.getElementById(form.dataset.status ?? '');
	const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');

	// JS takes over validation, so the button can be used even without a service
	form.noValidate = true;
	if (submit) submit.disabled = false;

	const fields = [...form.elements].filter(
		(element): element is Field =>
			element instanceof HTMLInputElement ||
			element instanceof HTMLSelectElement ||
			element instanceof HTMLTextAreaElement,
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

		if (!endpoint) {
			// TODO: [TODO: Formular-Dienst] – no service configured yet, nothing is sent
			showStatus(
				'Der Versand über das Formular ist noch nicht eingerichtet. Bitte rufen Sie mich an oder schreiben Sie mir eine E-Mail – die Kontaktdaten finden Sie unter der Servierglocke.',
			);
			return;
		}

		if (submit) submit.disabled = true;
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				body: new FormData(form),
				headers: { Accept: 'application/json' },
			});
			if (!response.ok) throw new Error(String(response.status));

			form.hidden = true;
			if (confirmation) {
				confirmation.hidden = false;
				confirmation.focus();
			}
		} catch {
			showStatus(
				'Ihre Anfrage konnte leider nicht gesendet werden. Bitte versuchen Sie es später noch einmal oder melden Sie sich per Telefon oder E-Mail.',
			);
		} finally {
			if (submit) submit.disabled = false;
		}
	});
}
