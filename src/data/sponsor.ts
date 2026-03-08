import { commentsConfig } from "@/config";

export type SponsorMethod = {
	id: string;
	name: string;
	icon: string;
	hint: string;
	qrImage: string;
};

export type SponsorGitHubConfig = {
	repo: string;
	approvedLabel: string;
	submitIssueTemplate: string;
};

export const sponsorMethods: SponsorMethod[] = [
	{
		id: "alipay",
		name: "支付宝",
		icon: "fa6-brands:alipay",
		hint: "扫码赞助",
		qrImage: "/sponsor/alipay-qr.svg",
	},
	{
		id: "wechat",
		name: "微信支付",
		icon: "fa6-brands:weixin",
		hint: "扫码赞助",
		qrImage: "/sponsor/wechat-qr.svg",
	},
];

export const sponsorGitHubConfig: SponsorGitHubConfig = {
	repo: commentsConfig.repo,
	approvedLabel: "sponsor-approved",
	submitIssueTemplate: "04-sponsor_record.yml",
};

export function getSponsorSubmitUrl(config: SponsorGitHubConfig): string {
	return `https://github.com/${config.repo}/issues/new?template=${config.submitIssueTemplate}`;
}
