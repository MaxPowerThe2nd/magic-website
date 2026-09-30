// Effect "video-lightbox": opens a video in a native <dialog>. The video is only
// loaded on click. Used by the hero showreel button and later by the video gallery.
// Markup: <a href="{plain url}" data-effect="video-lightbox" data-video-type="youtube|mp4"
//            data-video-embed="{embed url}" data-video-title="...">
// Without JS the link simply opens the video.
import './video-lightbox.css';

let dialog: HTMLDialogElement | undefined;
let frame: HTMLElement | undefined;

function getDialog(): HTMLDialogElement {
	if (dialog) return dialog;

	dialog = document.createElement('dialog');
	dialog.className = 'video-lightbox';
	dialog.innerHTML = `
		<button class="video-lightbox-close" type="button">
			<span aria-hidden="true">×</span><span class="visually-hidden">Video schließen</span>
		</button>
		<div class="video-lightbox-frame"></div>`;
	document.body.append(dialog);
	frame = dialog.querySelector<HTMLElement>('.video-lightbox-frame')!;

	dialog.querySelector('.video-lightbox-close')!.addEventListener('click', () => dialog!.close());
	// Click on the backdrop (outside the frame) closes the dialog
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog!.close();
	});
	// Esc closes natively; always unload the video so playback stops
	dialog.addEventListener('close', () => frame!.replaceChildren());

	return dialog;
}

export function init(trigger: HTMLElement) {
	trigger.addEventListener('click', (event) => {
		const { videoType, videoEmbed, videoTitle = 'Video' } = trigger.dataset;
		if (!videoEmbed) return;
		event.preventDefault();

		const box = getDialog();
		box.setAttribute('aria-label', videoTitle);

		let player: HTMLElement;
		if (videoType === 'mp4') {
			const video = document.createElement('video');
			video.src = videoEmbed;
			video.controls = true;
			video.autoplay = true;
			video.playsInline = true;
			player = video;
		} else {
			const iframe = document.createElement('iframe');
			iframe.src = videoEmbed;
			iframe.title = videoTitle;
			iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
			iframe.allowFullscreen = true;
			player = iframe;
		}

		frame!.replaceChildren(player);
		box.showModal();
	});
}
