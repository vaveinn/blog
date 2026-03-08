export type FriendSource = {
	url: string;
	name?: string;
	description?: string;
	avatar?: string;
};

// Add new friend links here. By default, name/description/avatar are auto-detected from each site.
export const friendSources: FriendSource[] = [
	{
		url: "https://example.com",
	},
	{
		url: "https://example.org",
	},
];
