// Effect "enquiry-form": turns the structured enquiry into an e-mail and shows the
// confirmation. Without JS the form falls back to its plain mailto action.
// TODO: replace the mailto hand-off with a real form endpoint once hosting is decided.

export function init(form: HTMLElement) {
	if (!(form instanceof HTMLFormElement)) return;
	const confirmation = document.getElementById(form.dataset.confirmation ?? '');

	form.addEventListener('submit', (event) => {
		event.preventDefault();

		const data = new FormData(form);
		const lines: string[] = [];
		for (const element of form.elements) {
			if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
			if (!element.name) continue;
			const label = form.querySelector(`label[for="${element.id}"]`)?.textContent?.trim() ?? element.name;
			lines.push(`${label}: ${data.get(element.name) || '–'}`);
		}

		const subject = encodeURIComponent('Anfrage über die Website');
		const body = encodeURIComponent(lines.join('\n'));
		window.location.href = `${form.action}?subject=${subject}&body=${body}`;

		form.hidden = true;
		if (confirmation) {
			confirmation.hidden = false;
			confirmation.focus();
		}
	});
}
