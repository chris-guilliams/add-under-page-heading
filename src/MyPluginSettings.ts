
export interface Rule {
	tag: string;
	heading: string;
}

export interface MyPluginSettings {
	rules: Rule[];
}
export const DEFAULT_SETTINGS: MyPluginSettings = {
	rules: [
		{ tag: "career", heading: "## Career Discussion" },
		{ tag: "1-1", heading: "## One-on-One Topics" },
	],
};
