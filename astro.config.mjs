// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Former subpages now live as sections on the one-pager
	redirects: {
		'/gallerie': '/#fotos',
		'/kontakt': '/#kontakt',
	},
	// Fonts are downloaded at build time and served from this site as woff2, never from Google
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: 'Cormorant Garamond',
			cssVariable: '--font-display',
			weights: ['400', '500', '600'],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			formats: ['woff2'],
			display: 'swap',
			fallbacks: ['serif'],
		},
		{
			provider: fontProviders.fontsource(),
			name: 'Jost',
			cssVariable: '--font-body',
			weights: ['400 600'],
			styles: ['normal'],
			subsets: ['latin'],
			formats: ['woff2'],
			display: 'swap',
			fallbacks: ['sans-serif'],
		},
	],
});
