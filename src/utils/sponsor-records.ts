import type { SponsorGitHubConfig } from "@/data/sponsor";

export type SponsorRecord = {
	id: number;
	name: string;
	amount: string;
	avatar: string;
	profileUrl: string;
	issueUrl: string;
	submittedAt: string;
};

type GitHubIssue = {
	id: number;
	body: string | null;
	html_url: string;
	created_at: string;
	user: {
		login: string;
		avatar_url: string;
		html_url: string;
	};
	pull_request?: unknown;
};

type GitHubRepo = {
	has_issues: boolean;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RECORDS = 100;

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanText(value: string): string {
	return value
		.replace(/\r/g, "")
		.replace(/<!--([\s\S]*?)-->/g, "")
		.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, "$2")
		.replace(/\*\*/g, "")
		.replace(/`/g, "")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && line !== "_No response_")
		.join(" ")
		.trim();
}

function extractField(body: string, headings: string[]): string {
	for (const heading of headings) {
		const headingPattern = escapeRegex(heading);
		const pattern = new RegExp(
			`(?:^|\\n)###\\s*${headingPattern}\\s*\\n+([\\s\\S]*?)(?=\\n###\\s|$)`,
			"i",
		);
		const match = body.match(pattern);
		if (!match?.[1]) continue;

		const value = cleanText(match[1]);
		if (value) return value;
	}

	return "";
}

function extractUrl(value: string): string {
	const match = value.match(/https?:\/\/[^\s)]+/i);
	return match?.[0] ?? "";
}

function parseRepo(repo: string): { owner: string; name: string } | null {
	const [owner, name, ...rest] = repo.trim().split("/").filter(Boolean);
	if (!owner || !name || rest.length > 0) return null;
	return { owner, name };
}

function parseRecord(issue: GitHubIssue): SponsorRecord {
	const body = issue.body ?? "";
	const name =
		extractField(body, ["赞助者名称", "昵称", "name", "sponsor name"]) ||
		issue.user.login;
	const amount =
		extractField(body, ["赞助金额", "金额", "amount", "sponsor amount"]) ||
		"未填写";
	const avatarText = extractField(body, [
		"头像链接（可选）",
		"头像链接",
		"avatar",
		"avatar url",
	]);
	const avatar = extractUrl(avatarText) || issue.user.avatar_url;

	return {
		id: issue.id,
		name,
		amount,
		avatar,
		profileUrl: issue.user.html_url,
		issueUrl: issue.html_url,
		submittedAt: issue.created_at,
	};
}

function buildRequestHeaders(): HeadersInit {
	const headers: HeadersInit = {
		accept: "application/vnd.github+json",
		"x-github-api-version": "2022-11-28",
	};

	const token = (import.meta.env as ImportMetaEnv).GITHUB_TOKEN;
	if (token) {
		headers.authorization = `Bearer ${token}`;
	}

	return headers;
}

export async function resolveSponsorIssueSubmissionAvailable(
	config: SponsorGitHubConfig,
): Promise<boolean> {
	const parsedRepo = parseRepo(config.repo);
	if (!parsedRepo) return false;

	const apiUrl = `https://api.github.com/repos/${parsedRepo.owner}/${parsedRepo.name}`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

	try {
		const response = await fetch(apiUrl, {
			headers: buildRequestHeaders(),
			signal: controller.signal,
		});
		// If repo metadata can't be fetched (e.g. rate limit/network), keep submit entry available.
		if (!response.ok) return true;

		const repo = (await response.json()) as GitHubRepo;
		return repo.has_issues !== false;
	} catch {
		return true;
	} finally {
		clearTimeout(timeout);
	}
}

export async function resolveSponsorRecords(
	config: SponsorGitHubConfig,
): Promise<SponsorRecord[]> {
	const parsedRepo = parseRepo(config.repo);
	if (!parsedRepo) return [];

	const params = new URLSearchParams({
		state: "all",
		labels: config.approvedLabel,
		per_page: String(DEFAULT_MAX_RECORDS),
		sort: "created",
		direction: "desc",
	});

	const apiUrl = `https://api.github.com/repos/${parsedRepo.owner}/${parsedRepo.name}/issues?${params.toString()}`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

	try {
		const response = await fetch(apiUrl, {
			headers: buildRequestHeaders(),
			signal: controller.signal,
		});
		if (!response.ok) return [];

		const issues = (await response.json()) as GitHubIssue[];
		return issues.filter((issue) => !issue.pull_request).map(parseRecord);
	} catch {
		return [];
	} finally {
		clearTimeout(timeout);
	}
}
