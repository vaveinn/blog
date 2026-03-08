import type { FriendSource } from "@/data/friends";

export type ResolvedFriendLink = {
	name: string;
	description: string;
	url: string;
	avatar: string;
};

type ResolveOptions = {
	fallbackAvatar?: string;
	timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 8000;

function normalizeUrl(rawUrl: string): string {
	const value = rawUrl.trim();
	if (/^https?:\/\//i.test(value)) {
		return value;
	}
	return `https://${value}`;
}

function getHostname(value: string): string {
	try {
		return new URL(value).hostname;
	} catch {
		return value;
	}
}

function cleanText(value: string | undefined): string {
	if (!value) return "";
	return value
		.replace(/&nbsp;/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function getTagAttr(tag: string, attr: string): string {
	const pattern = new RegExp(
		`${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
		"i",
	);
	const match = tag.match(pattern);
	return cleanText(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function getMetaContent(html: string, keys: string[]): string {
	const normalizedKeys = new Set(keys.map((item) => item.toLowerCase()));
	const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

	for (const tag of metaTags) {
		const key = (
			getTagAttr(tag, "property") ||
			getTagAttr(tag, "name") ||
			getTagAttr(tag, "itemprop")
		).toLowerCase();

		if (!normalizedKeys.has(key)) continue;

		const content = getTagAttr(tag, "content");
		if (content) return content;
	}

	return "";
}

function getTitle(html: string): string {
	const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
	return cleanText(match?.[1] ?? "");
}

function toAbsoluteUrl(href: string, pageUrl: string): string {
	if (!href || href.startsWith("data:")) return "";
	try {
		return new URL(href, pageUrl).href;
	} catch {
		return "";
	}
}

function getIconFromHtml(html: string, pageUrl: string): string {
	const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
	const candidates: { score: number; href: string }[] = [];

	for (const tag of linkTags) {
		const rel = getTagAttr(tag, "rel").toLowerCase();
		const href = getTagAttr(tag, "href");
		if (!rel.includes("icon") || !href) continue;

		let score = 1;
		if (rel.includes("apple-touch-icon")) score = 3;
		if (rel.includes("shortcut icon")) score = 2;

		const absoluteHref = toAbsoluteUrl(href, pageUrl);
		if (absoluteHref) {
			candidates.push({ score, href: absoluteHref });
		}
	}

	if (candidates.length === 0) return "";
	candidates.sort((a, b) => b.score - a.score);
	return candidates[0].href;
}

function makeDomainIconUrl(hostname: string): string {
	if (!hostname) return "";
	return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}

async function fetchHtml(url: string, timeoutMs: number): Promise<{ html: string; finalUrl: string } | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			redirect: "follow",
			signal: controller.signal,
			headers: {
				"user-agent":
					"Mozilla/5.0 (compatible; FriendLinksBot/1.0; +https://example.com/bot)",
				accept: "text/html,application/xhtml+xml",
			},
		});

		if (!response.ok) return null;

		const contentType = (response.headers.get("content-type") || "").toLowerCase();
		if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
			return null;
		}

		const html = await response.text();
		return { html, finalUrl: response.url || url };
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function resolveOneFriend(
	source: FriendSource,
	options: ResolveOptions,
): Promise<ResolvedFriendLink> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const normalizedUrl = normalizeUrl(source.url);
	const defaultHostname = getHostname(normalizedUrl);

	const initialName = cleanText(source.name) || defaultHostname;
	const initialDescription =
		cleanText(source.description) || `Visit ${defaultHostname}.`;
	const initialAvatar =
		cleanText(source.avatar) ||
		makeDomainIconUrl(defaultHostname) ||
		options.fallbackAvatar ||
		"";

	const page = await fetchHtml(normalizedUrl, timeoutMs);
	if (!page) {
		return {
			name: initialName,
			description: initialDescription,
			url: normalizedUrl,
			avatar: initialAvatar,
		};
	}

	const realHostname = getHostname(page.finalUrl);
	const fallbackName = cleanText(source.name) || realHostname || initialName;
	const fallbackDescription =
		cleanText(source.description) || initialDescription;
	const fallbackAvatar =
		cleanText(source.avatar) ||
		makeDomainIconUrl(realHostname) ||
		makeDomainIconUrl(defaultHostname) ||
		options.fallbackAvatar ||
		"";

	const detectedName =
		cleanText(source.name) ||
		getMetaContent(page.html, ["og:site_name", "application-name"]) ||
		getMetaContent(page.html, ["og:title", "twitter:title"]) ||
		getTitle(page.html) ||
		fallbackName;
	const detectedDescription =
		cleanText(source.description) ||
		getMetaContent(page.html, [
			"description",
			"og:description",
			"twitter:description",
		]) ||
		fallbackDescription;
	const detectedAvatar =
		cleanText(source.avatar) ||
		getIconFromHtml(page.html, page.finalUrl) ||
		fallbackAvatar;

	return {
		name: detectedName || fallbackName,
		description: detectedDescription || fallbackDescription,
		url: normalizedUrl,
		avatar: detectedAvatar || fallbackAvatar,
	};
}

export async function resolveFriendLinks(
	sources: FriendSource[],
	options: ResolveOptions = {},
): Promise<ResolvedFriendLink[]> {
	return Promise.all(sources.map((source) => resolveOneFriend(source, options)));
}
