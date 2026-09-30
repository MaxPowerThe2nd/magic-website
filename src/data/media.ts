// Single place for video sources. The showreel play button in the hero is only
// rendered once a source is set here.
//   YouTube:     { type: 'youtube', id: 'VIDEO_ID' }  (played via youtube-nocookie.com)
//   Own MP4:     { type: 'mp4', src: '/videos/showreel.mp4' }  (file in /public/videos)
export type Video = { type: 'youtube'; id: string } | { type: 'mp4'; src: string };

// TODO: enter the showreel here once it exists, e.g. { type: 'youtube', id: '...' } or { type: 'mp4', src: '/videos/showreel.mp4' }
export const showreel: Video | undefined = undefined;

/** Plain link used without JavaScript */
export function videoUrl(video: Video): string {
	return video.type === 'youtube' ? `https://www.youtube.com/watch?v=${video.id}` : video.src;
}

/** Embed URL used inside the lightbox */
export function videoEmbed(video: Video): string {
	return video.type === 'youtube'
		? `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`
		: video.src;
}
