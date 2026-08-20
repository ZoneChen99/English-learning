export type Season = "spring" | "summer" | "autumn" | "winter";

export interface Palette {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  deco: string;
}

/** 四套低饱和、温暖、清新的季节配色 */
export const SEASON_PALETTES: Record<Season, Palette> = {
  spring: {
    bg: "#F7FAF6",
    surface: "#FFFFFF",
    ink: "#2E3A33",
    muted: "#7A8A80",
    accent: "#7FB77E",
    accentSoft: "#E3F0E2",
    deco: "#F3C6D3",
  },
  summer: {
    bg: "#FBF9F3",
    surface: "#FFFFFF",
    ink: "#33302A",
    muted: "#8A8270",
    accent: "#E0A93C",
    accentSoft: "#FBEFD3",
    deco: "#6FB1A0",
  },
  autumn: {
    bg: "#FAF6F0",
    surface: "#FFFFFF",
    ink: "#3A2F28",
    muted: "#8C7A68",
    accent: "#C98A3E",
    accentSoft: "#F3E2CC",
    deco: "#B5612E",
  },
  winter: {
    bg: "#F6F8FA",
    surface: "#FFFFFF",
    ink: "#2C333A",
    muted: "#79868F",
    accent: "#7FA8C9",
    accentSoft: "#E4EEF4",
    deco: "#C9D6DE",
  },
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

export const SEASON_NAMES: Record<Season, string> = {
  spring: "春天",
  summer: "夏天",
  autumn: "秋天",
  winter: "冬天",
};

/** 随季节变化的问候语 */
export const SEASON_GREETINGS: Record<Season, string> = {
  spring: "今天，慢慢来",
  summer: "盛夏，心静自然凉",
  autumn: "秋意渐浓，正好沉淀",
  winter: "冬日，温一壶暖意",
};

/** 首页主标题下方的季节副文案 */
export const SEASON_SUBTITLES: Record<Season, string> = {
  spring: "在语言的世界里，遇见更好的自己",
  summer: "探索语言的无限可能",
  autumn: "在故事中理解世界，在语言中遇见智慧",
  winter: "在安静中积蓄力量，在语言中收获温暖",
};

export const ALL_SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

/** 气象季节：春 3-5，夏 6-8，秋 9-11，冬 12-2 */
export function getSeasonFromDate(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export function formatDateCN(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
}
