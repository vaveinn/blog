import type {
	CommentsConfig,
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Lucas's Blog",
	subtitle: "Welcome to my personal blog!",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 175, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: true, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{
			name: "\u53cb\u94fe",
			url: "/friends/",
		},
		{
			name: "\u8d5e\u52a9",
			url: "/sponsor/",
		},
		{
			name: "\u8BA2\u9605\u8F6C\u6362",
			url: "/sub-converter/",
		},
		{
			name: "\u52A8\u6001",
			url: "/moments/",
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Lucas", // Display name of the author
	bio: "\u7535\u6c14\u5de5\u7a0b\u4e13\u4e1a\u5b66\u751f\uff0c\u4e1a\u4f59\u65f6\u95f4\u559c\u6b22\u7f16\u7a0b\u548c\u5199\u535a\u5ba2\u3002", // A short bio or description of the author
	links: [
		{
			name: "Telegram",
			icon: "fa6-brands:telegram",
			url: "https://t.me/auepyc",
		},
		{
			name: "\u90ae\u7bb1",
			icon: "fa6-solid:envelope",
			url: "mailto:vaveinn@outlook.com",
		},
		{
			name: "QQ",
			icon: "fa6-brands:qq",
			url: "https://wpa.qq.com/msgrd?v=3&uin=2674338676&site=qq&menu=yes",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const commentsConfig: CommentsConfig = {
	enable: true,
	provider: "giscus",
	repo: "vaveinn/blog",
	repoId: "R_kgDORhUwew",
	category: "General",
	categoryId: "DIC_kwDORhUwe84C38Il",
	mapping: "pathname",
	strict: false,
	reactionsEnabled: true,
	emitMetadata: false,
	inputPosition: "bottom",
	lang: "zh-CN",
	theme: "preferred_color_scheme",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

