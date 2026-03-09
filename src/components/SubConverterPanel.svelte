<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";

type PresetName = "minimal" | "balanced" | "comprehensive" | "custom";
type LinkKey = "xray" | "singbox" | "clash" | "surge" | "subconverter";

type GeneratedLinks = Record<LinkKey, string>;

const ALL_RULES = [
	"Ad Block",
	"AI Services",
	"Bilibili",
	"Youtube",
	"Google",
	"Private",
	"Location:CN",
	"Telegram",
	"Github",
	"Microsoft",
	"Apple",
	"Social Media",
	"Streaming",
	"Gaming",
	"Education",
	"Financial",
	"Cloud Services",
	"Non-China",
];

const PRESET_RULES: Record<Exclude<PresetName, "custom">, string[]> = {
	minimal: ["Location:CN", "Private", "Non-China"],
	balanced: [
		"Location:CN",
		"Private",
		"Non-China",
		"Github",
		"Google",
		"Youtube",
		"AI Services",
		"Telegram",
	],
	comprehensive: [...ALL_RULES],
};

const RULE_LABELS: Record<string, string> = {
	"Ad Block": "广告拦截",
	"AI Services": "AI 服务",
	Bilibili: "哔哩哔哩",
	Youtube: "YouTube",
	Google: "Google 服务",
	Private: "私有网络",
	"Location:CN": "国内流量",
	Telegram: "Telegram",
	Github: "GitHub",
	Microsoft: "Microsoft",
	Apple: "Apple",
	"Social Media": "社交媒体",
	Streaming: "流媒体",
	Gaming: "游戏平台",
	Education: "教育资源",
	Financial: "金融服务",
	"Cloud Services": "云服务",
	"Non-China": "非中国流量",
};

const LINK_ITEMS: Array<{ key: LinkKey; label: string }> = [
	{ key: "xray", label: "Xray（Base64）" },
	{ key: "singbox", label: "Sing-box" },
	{ key: "clash", label: "Clash" },
	{ key: "surge", label: "Surge" },
	{ key: "subconverter", label: "Subconverter 配置链接" },
];

const CUSTOM_RULES_PLACEHOLDER =
	'[{"name":"自定义分组","site_rules":["example"],"ip_rules":[]}]';

const STORAGE_KEYS = {
	endpoint: "subconv:endpoint",
	input: "subconv:input",
	userAgent: "subconv:user_agent",
	customRules: "subconv:custom_rules",
	groupByCountry: "subconv:group_by_country",
	includeAutoSelect: "subconv:include_auto_select",
	enableClashUI: "subconv:enable_clash_ui",
	externalController: "subconv:external_controller",
	externalUiDownloadUrl: "subconv:external_ui_download_url",
	selectedPreset: "subconv:selected_preset",
	selectedRules: "subconv:selected_rules",
} as const;

let endpoint = "https://app.sublink.works";
let input = "";
let userAgent = "";
let selectedPreset: PresetName = "balanced";
let selectedRules = [...PRESET_RULES.balanced];
let customRulesJson = "";
let groupByCountry = false;
let includeAutoSelect = true;
let enableClashUI = false;
let externalController = "";
let externalUiDownloadUrl = "";

let generatedLinks: GeneratedLinks | null = null;
let errorMessage = "";
let copiedKey: LinkKey | null = null;
let hydrated = false;
let copyTimer: ReturnType<typeof setTimeout> | null = null;

function isPresetName(value: string | null): value is PresetName {
	return (
		value === "minimal" ||
		value === "balanced" ||
		value === "comprehensive" ||
		value === "custom"
	);
}

function normalizeEndpoint(rawValue: string): string {
	const trimmed = rawValue.trim();
	if (!trimmed) {
		throw new Error("请填写 Worker 地址。");
	}

	const withProtocol = /^https?:\/\//i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;
	const parsed = new URL(withProtocol);

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error("Worker 地址必须使用 http 或 https 协议。");
	}

	const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
	return `${parsed.origin}${path}`;
}

function parseCustomRules(): unknown[] {
	const raw = customRulesJson.trim();
	if (!raw) {
		return [];
	}

	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed)) {
		throw new Error("自定义规则必须是 JSON 数组。");
	}

	return parsed;
}

function normalizeRules(values: unknown): string[] {
	if (!Array.isArray(values)) {
		return [];
	}

	const selected = new Set<string>();
	for (const value of values) {
		if (typeof value === "string" && ALL_RULES.includes(value)) {
			selected.add(value);
		}
	}
	return ALL_RULES.filter((rule) => selected.has(rule));
}

function selectedRulesParam(): string {
	if (selectedPreset === "custom") {
		return JSON.stringify(selectedRules);
	}
	return selectedPreset;
}

function createParams(includeConfig: boolean): URLSearchParams {
	const params = new URLSearchParams();

	if (includeConfig) {
		const trimmedInput = input.trim();
		if (!trimmedInput) {
			throw new Error("请输入输入源内容。");
		}

		params.set("config", trimmedInput);
		if (userAgent.trim()) {
			params.set("ua", userAgent.trim());
		}

		if (enableClashUI) {
			params.set("enable_clash_ui", "true");
		}
		if (externalController.trim()) {
			params.set("external_controller", externalController.trim());
		}
		if (externalUiDownloadUrl.trim()) {
			params.set("external_ui_download_url", externalUiDownloadUrl.trim());
		}
	}

	params.set("selectedRules", selectedRulesParam());

	const customRules = parseCustomRules();
	if (customRules.length > 0) {
		params.set("customRules", JSON.stringify(customRules));
	}

	if (groupByCountry) {
		params.set("group_by_country", "true");
	}
	if (!includeAutoSelect) {
		params.set("include_auto_select", "false");
	}

	return params;
}

function generateLinks(): void {
	errorMessage = "";
	try {
		const base = normalizeEndpoint(endpoint);
		const commonParams = createParams(true);
		const commonQuery = commonParams.toString();

		const subconverterParams = createParams(false);
		const subconverterQuery = subconverterParams.toString();

		generatedLinks = {
			xray: `${base}/xray?${commonQuery}`,
			singbox: `${base}/singbox?${commonQuery}`,
			clash: `${base}/clash?${commonQuery}`,
			surge: `${base}/surge?${commonQuery}`,
			subconverter: `${base}/subconverter${subconverterQuery ? `?${subconverterQuery}` : ""}`,
		};
	} catch (error) {
		generatedLinks = null;
		errorMessage =
			error instanceof Error ? error.message : "生成链接失败。";
	}
}

function onPresetChange(event: Event): void {
	const value = (event.target as HTMLSelectElement).value;
	if (!isPresetName(value)) {
		return;
	}
	selectedPreset = value;
	if (value !== "custom") {
		selectedRules = [...PRESET_RULES[value]];
	}
}

function toggleRule(ruleName: string): void {
	const hasRule = selectedRules.includes(ruleName);
	if (hasRule) {
		selectedRules = selectedRules.filter((rule) => rule !== ruleName);
	} else {
		selectedRules = ALL_RULES.filter((rule) =>
			new Set([...selectedRules, ruleName]).has(rule),
		);
	}
	selectedPreset = "custom";
}

function clearForm(): void {
	input = "";
	userAgent = "";
	customRulesJson = "";
	groupByCountry = false;
	includeAutoSelect = true;
	enableClashUI = false;
	externalController = "";
	externalUiDownloadUrl = "";
	selectedPreset = "balanced";
	selectedRules = [...PRESET_RULES.balanced];
	generatedLinks = null;
	errorMessage = "";
}

function fallbackCopy(text: string): void {
	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	document.body.removeChild(textarea);
	if (!copied) {
		throw new Error("复制失败。");
	}
}

async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}
	fallbackCopy(text);
}

async function copyLink(key: LinkKey): Promise<void> {
	if (!generatedLinks) {
		return;
	}

	const value = generatedLinks[key];
	try {
		await copyToClipboard(value);
		copiedKey = key;
		if (copyTimer) {
			clearTimeout(copyTimer);
		}
		copyTimer = setTimeout(() => {
			copiedKey = null;
		}, 1600);
	} catch (error) {
		errorMessage = error instanceof Error ? error.message : "复制失败。";
	}
}

onMount(() => {
	try {
		endpoint = localStorage.getItem(STORAGE_KEYS.endpoint) || endpoint;
		input = localStorage.getItem(STORAGE_KEYS.input) || "";
		userAgent = localStorage.getItem(STORAGE_KEYS.userAgent) || "";
		customRulesJson = localStorage.getItem(STORAGE_KEYS.customRules) || "";
		groupByCountry = localStorage.getItem(STORAGE_KEYS.groupByCountry) === "true";
		includeAutoSelect =
			localStorage.getItem(STORAGE_KEYS.includeAutoSelect) !== "false";
		enableClashUI = localStorage.getItem(STORAGE_KEYS.enableClashUI) === "true";
		externalController =
			localStorage.getItem(STORAGE_KEYS.externalController) || "";
		externalUiDownloadUrl =
			localStorage.getItem(STORAGE_KEYS.externalUiDownloadUrl) || "";

		const storedPreset = localStorage.getItem(STORAGE_KEYS.selectedPreset);
		if (isPresetName(storedPreset)) {
			selectedPreset = storedPreset;
		}

		const storedRules = localStorage.getItem(STORAGE_KEYS.selectedRules);
		if (storedRules) {
			selectedRules = normalizeRules(JSON.parse(storedRules));
		}

		if (selectedPreset !== "custom") {
			selectedRules = [...PRESET_RULES[selectedPreset]];
		} else if (selectedRules.length === 0) {
			selectedRules = [...PRESET_RULES.balanced];
		}
	} catch {
		selectedPreset = "balanced";
		selectedRules = [...PRESET_RULES.balanced];
	}

	hydrated = true;
});

onDestroy(() => {
	if (copyTimer) {
		clearTimeout(copyTimer);
	}
});

$: if (hydrated) {
	localStorage.setItem(STORAGE_KEYS.endpoint, endpoint);
	localStorage.setItem(STORAGE_KEYS.input, input);
	localStorage.setItem(STORAGE_KEYS.userAgent, userAgent);
	localStorage.setItem(STORAGE_KEYS.customRules, customRulesJson);
	localStorage.setItem(STORAGE_KEYS.groupByCountry, String(groupByCountry));
	localStorage.setItem(
		STORAGE_KEYS.includeAutoSelect,
		String(includeAutoSelect),
	);
	localStorage.setItem(STORAGE_KEYS.enableClashUI, String(enableClashUI));
	localStorage.setItem(STORAGE_KEYS.externalController, externalController);
	localStorage.setItem(
		STORAGE_KEYS.externalUiDownloadUrl,
		externalUiDownloadUrl,
	);
	localStorage.setItem(STORAGE_KEYS.selectedPreset, selectedPreset);
	localStorage.setItem(
		STORAGE_KEYS.selectedRules,
		JSON.stringify(selectedRules),
	);
}
</script>

<section class="card-base subconverter-wrap p-6 md:p-8">
	<div class="mb-6">
		<h1 class="panel-title">
			<Icon icon="material-symbols:sync-rounded" class="text-[1.75rem] text-[var(--primary)]" />
			订阅转换
		</h1>
		<p class="panel-subtitle">
			基于 sublink-worker 的核心流程，Worker 地址可以默认。
		</p>
	</div>

	<div class="stack">
		<div>
			<label class="field-label" for="sub-worker-endpoint">Worker 地址</label>
			<input
				id="sub-worker-endpoint"
				class="field-input"
				type="text"
				bind:value={endpoint}
				placeholder="https://app.sublink.works"
			/>
			<p class="field-help">
				可填写你自己部署的 sublink-worker 域名。
			</p>
		</div>

		<div>
			<label class="field-label" for="sub-input">输入源</label>
			<textarea
				id="sub-input"
				class="field-textarea"
				rows={6}
				bind:value={input}
				placeholder="粘贴订阅链接、Clash YAML、Sing-box JSON 或 Surge 配置。"
			></textarea>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<div>
				<label class="field-label" for="rule-preset">规则预设</label>
				<select
					id="rule-preset"
					class="field-select"
					value={selectedPreset}
					on:change={onPresetChange}
				>
					<option value="minimal">最小化</option>
					<option value="balanced">均衡</option>
					<option value="comprehensive">全面</option>
					<option value="custom">自定义</option>
				</select>
			</div>

			<div>
				<label class="field-label" for="user-agent">自定义 User-Agent（可选）</label>
				<input
					id="user-agent"
					class="field-input"
					type="text"
					bind:value={userAgent}
					placeholder="curl/7.74.0"
				/>
			</div>
		</div>

		<div>
			<div class="field-label">规则集合</div>
			<div class="rule-grid">
				{#each ALL_RULES as rule}
					<button
						type="button"
						class="rule-chip"
						class:rule-chip-active={selectedRules.includes(rule)}
						on:click={() => toggleRule(rule)}
					>
						{RULE_LABELS[rule] ?? rule}
					</button>
				{/each}
			</div>
		</div>

		<div class="grid gap-3 md:grid-cols-2">
			<label class="option-item">
				<input type="checkbox" bind:checked={groupByCountry} />
				<span>按国家分组</span>
			</label>
			<label class="option-item">
				<input type="checkbox" bind:checked={includeAutoSelect} />
				<span>包含自动选择</span>
			</label>
			<label class="option-item">
				<input type="checkbox" bind:checked={enableClashUI} />
				<span>启用 Clash UI</span>
			</label>
		</div>

		{#if enableClashUI}
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label class="field-label" for="external-controller">外部控制器</label>
					<input
						id="external-controller"
						class="field-input"
						type="text"
						bind:value={externalController}
						placeholder="0.0.0.0:9090"
					/>
				</div>
				<div>
					<label class="field-label" for="external-ui-url">外部 UI 下载地址</label>
					<input
						id="external-ui-url"
						class="field-input"
						type="text"
						bind:value={externalUiDownloadUrl}
						placeholder="https://example.com/zashboard.zip"
					/>
				</div>
			</div>
		{/if}

		<div>
			<label class="field-label" for="custom-rules">自定义规则 JSON（可选）</label>
			<textarea
				id="custom-rules"
				class="field-textarea field-textarea-mono"
				rows={4}
				bind:value={customRulesJson}
				placeholder={CUSTOM_RULES_PLACEHOLDER}
			></textarea>
		</div>

		<div class="action-row">
			<button class="btn-regular action-btn" type="button" on:click={generateLinks}>
				<Icon icon="material-symbols:bolt-rounded" class="mr-2 text-[1.1rem]" />
				生成链接
			</button>
			<button class="btn-plain action-btn-secondary" type="button" on:click={clearForm}>
				清空
			</button>
		</div>

		{#if errorMessage}
			<p class="error-text">{errorMessage}</p>
		{/if}
	</div>
</section>

{#if generatedLinks}
	<section class="card-base result-wrap p-6 md:p-8 mt-4">
		<h2 class="result-title">转换结果</h2>
		<div class="result-list">
			{#each LINK_ITEMS as item}
				<div class="result-item">
					<div class="result-label">{item.label}</div>
					<div class="result-control">
						<input class="field-input field-input-mono" readonly value={generatedLinks[item.key]} />
						<button
							type="button"
							class="btn-regular copy-btn"
							on:click={() => copyLink(item.key)}
						>
							{copiedKey === item.key ? "已复制" : "复制"}
						</button>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.subconverter-wrap,
	.result-wrap {
		border: 1px solid var(--line-color);
	}

	.stack {
		display: grid;
		gap: 1.1rem;
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 1.65rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--deep-text) 88%, black 12%);
	}

	.panel-subtitle {
		margin-top: 0.5rem;
		color: rgba(0, 0, 0, 0.62);
		line-height: 1.65;
	}

	.field-label {
		display: block;
		font-size: 0.92rem;
		font-weight: 700;
		color: rgba(0, 0, 0, 0.75);
		margin-bottom: 0.45rem;
	}

	.field-help {
		font-size: 0.8rem;
		margin-top: 0.45rem;
		color: rgba(0, 0, 0, 0.5);
	}

	.field-input,
	.field-textarea,
	.field-select {
		width: 100%;
		border-radius: 0.9rem;
		border: 1px solid var(--line-color);
		background: var(--btn-regular-bg);
		color: rgba(0, 0, 0, 0.82);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.field-input,
	.field-select {
		height: 2.8rem;
		padding: 0 0.85rem;
	}

	.field-textarea {
		padding: 0.75rem 0.85rem;
		line-height: 1.55;
		resize: vertical;
		min-height: 7rem;
	}

	.field-textarea-mono,
	.field-input-mono {
		font-family: "JetBrains Mono Variable", "JetBrains Mono", "SFMono-Regular",
			Consolas, "Liberation Mono", Menlo, monospace;
		font-size: 0.83rem;
	}

	.field-input:focus,
	.field-textarea:focus,
	.field-select:focus {
		outline: none;
		border-color: color-mix(in srgb, var(--primary) 68%, white 32%);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, white 82%);
	}

	.rule-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9.2rem, 1fr));
		gap: 0.55rem;
	}

	.rule-chip {
		border: 1px solid var(--line-color);
		background: var(--btn-regular-bg);
		color: rgba(0, 0, 0, 0.74);
		border-radius: 0.75rem;
		padding: 0.5rem 0.6rem;
		font-size: 0.82rem;
		font-weight: 600;
		transition: all 0.16s ease;
	}

	.rule-chip:hover {
		background: var(--btn-regular-bg-hover);
		color: var(--primary);
	}

	.rule-chip-active {
		border-color: var(--primary);
		color: var(--primary);
		background: var(--btn-plain-bg-hover);
	}

	.option-item {
		border: 1px solid var(--line-color);
		border-radius: 0.85rem;
		background: var(--btn-regular-bg);
		padding: 0.65rem 0.8rem;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(0, 0, 0, 0.73);
	}

	.option-item input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--primary);
	}

	.action-row {
		display: flex;
		gap: 0.7rem;
		flex-wrap: wrap;
	}

	.action-btn {
		height: 2.85rem;
		padding: 0 1.1rem;
		border-radius: 0.9rem;
		font-weight: 700;
	}

	.action-btn-secondary {
		height: 2.85rem;
		padding: 0 1rem;
		border-radius: 0.9rem;
		border: 1px solid var(--line-color);
	}

	.error-text {
		color: oklch(0.58 0.2 25);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.result-title {
		font-size: 1.22rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--deep-text) 88%, black 12%);
		margin-bottom: 0.85rem;
	}

	.result-list {
		display: grid;
		gap: 0.95rem;
	}

	.result-item {
		display: grid;
		gap: 0.45rem;
	}

	.result-label {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(0, 0, 0, 0.72);
	}

	.result-control {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.55rem;
	}

	.copy-btn {
		border-radius: 0.8rem;
		min-width: 5.1rem;
		height: 2.8rem;
		font-size: 0.84rem;
		font-weight: 700;
		padding: 0 0.8rem;
	}

	@media (max-width: 720px) {
		.panel-title {
			font-size: 1.34rem;
		}

		.result-control {
			grid-template-columns: 1fr;
		}

		.copy-btn {
			width: 100%;
		}
	}
</style>
