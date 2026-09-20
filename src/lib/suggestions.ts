import {
  Atom,
  Box,
  Building2,
  Circle,
  Coffee,
  Gamepad2,
  Landmark,
  LayoutDashboard,
  Orbit,
  Timer,
  type LucideIcon,
} from 'lucide-react';

/** 首页和聊天页共用同一份示例清单，改一处两边同步 */
export interface Suggestion {
  key: string;
  Icon: LucideIcon;
  /** page：普通网页；scene：Three.js 三维场景，生成时走另一套提示词前缀 */
  group: 'page' | 'scene';
}

export const SUGGESTIONS: readonly Suggestion[] = [
  { key: 'hotel', Icon: Building2, group: 'page' },
  { key: 'museum', Icon: Landmark, group: 'page' },
  { key: 'cafe', Icon: Coffee, group: 'page' },
  { key: 'retroShop', Icon: Gamepad2, group: 'page' },
  { key: 'pomodoro', Icon: Timer, group: 'page' },
  { key: 'saas', Icon: LayoutDashboard, group: 'page' },
  { key: 'energyCore', Icon: Atom, group: 'scene' },
  { key: 'blackHole', Icon: Orbit, group: 'scene' },
  { key: 'portal', Icon: Circle, group: 'scene' },
  { key: 'mechCube', Icon: Box, group: 'scene' },
];

export const SUGGESTION_GROUPS: ReadonlyArray<{
  group: Suggestion['group'];
  items: readonly Suggestion[];
}> = [
  { group: 'page', items: SUGGESTIONS.filter((s) => s.group === 'page') },
  { group: 'scene', items: SUGGESTIONS.filter((s) => s.group === 'scene') },
];
