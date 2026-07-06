/**
 * 前端世界杯防御过滤
 * 后端已做源头过滤，此处为第二层保险
 */

const EXCLUDED_WORLD_CUP_KEYWORDS = [
  'qualification',
  'qualifiers',
  'qualifier',
  'club',
  'women',
  'u17',
  'u20',
  'u21',
  'friendly',
];

/**
 * 判断是否为世界杯相关赛事名称
 * @param value - competition 字段值
 * @returns true 表示是世界杯比赛
 */
export function isWorldCupCompetitionName(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase();
  
  if (!text.includes('world cup')) return false;
  
  return !EXCLUDED_WORLD_CUP_KEYWORDS.some(keyword => text.includes(keyword));
}
