export type ReleaseInfo = {
  version: "v10";
  ui: "dark-three-card";
  source: "complete-main";
};

const RELEASE_INFO: ReleaseInfo = {
  version: "v10",
  ui: "dark-three-card",
  source: "complete-main",
};

export function getReleaseInfo(): ReleaseInfo {
  return { ...RELEASE_INFO };
}
