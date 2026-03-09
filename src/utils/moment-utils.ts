import { type CollectionEntry, getCollection } from "astro:content";

type MomentEntry = CollectionEntry<"posts">;

function isMomentEntry(entry: { id: string }) {
	return entry.id.startsWith("moments/");
}

function toMomentSlug(entry: { id: string }) {
	return entry.id.replace(/^moments\//, "");
}

export async function getSortedMoments(): Promise<MomentEntry[]> {
	const allEntries = await getCollection("posts", ({ data }) =>
		import.meta.env.PROD ? data.draft !== true : true,
	);
	const moments = allEntries.filter((entry) => isMomentEntry(entry));

	return moments.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
}

export function getMomentSlug(entry: { id: string }) {
	return toMomentSlug(entry);
}
