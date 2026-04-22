
export interface Rule {
	tag: string;
	heading: string;
}

export interface AddUnderPageHeadingSettings {
	rules: Rule[];
}
export const DEFAULT_ADD_UNDER_PAGE_HEADING_SETTINGS: AddUnderPageHeadingSettings = {
	rules: [
		{ tag: "career", heading: "## Career Discussion" },
		{ tag: "1-1", heading: "## One-on-One Topics" },
	],
};
