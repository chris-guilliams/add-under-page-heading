
export interface Rule {
	tags: string[];
	heading: string;
}

export interface AddUnderPageHeadingSettings {
	rules: Rule[];
}

export const DEFAULT_ADD_UNDER_PAGE_HEADING_SETTINGS: AddUnderPageHeadingSettings = {
	rules: [
		{ tags: ["career"], heading: "## Career Discussion" },
		{ tags: ["1-1"], heading: "## One-on-One Topics" },
	],
};
