// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Former subpages now live as sections on the one-pager
	redirects: {
		'/gallerie': '/#fotos',
		'/kontakt': '/#kontakt',
	},
	// Fonts are downloaded at build time and served from this site, never from Google
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: 'Fraunces',
			cssVariable: '--font-display',
			weights: ['400 900'],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['Georgia', 'serif'],
		},
		{
			provider: fontProviders.fontsource(),
			name: 'DM Sans',
			cssVariable: '--font-body',
			weights: ['400 700'],
			styles: ['normal'],
			subsets: ['latin'],
			fallbacks: ['system-ui', 'sans-serif'],
		},
	],
});
