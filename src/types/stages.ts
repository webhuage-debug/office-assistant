export const FOLLOW_STAGE_OPTIONS = [
  "待跟进",
  "跟进中",
  "方案中",
  "报价中",
  "已签约",
  "已完结",
] as const;

export const FOLLOW_UP_STAGE_VALUES = ["跟进中", "方案中", "报价中"] as const;

export const SIGNED_STAGE_VALUES = ["已签约"] as const;

export type FollowStageValue = (typeof FOLLOW_STAGE_OPTIONS)[number];
