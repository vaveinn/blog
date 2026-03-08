export type FriendSource = {
	url: string;
	name?: string;
};

// Add new friend links here.
// `name` is optional. If set, it overrides the detected site name.
// Description and icon remain auto-detected.
export const friendSources: FriendSource[] = [
	{
		url: "https://cloudflare.com",
		name: "CF",
	},
	{
		url: "https://github.com",
		name: "GitHub",
	},
	// {
	// 	url: "https://example.com",
	// 	name: "My Custom Friend Name",
	// },
];
