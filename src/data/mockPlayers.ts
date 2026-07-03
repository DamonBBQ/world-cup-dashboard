export interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  influence: number;
  status: 'excellent' | 'good' | 'average' | 'poor' | 'injured';
  flag: string;
}

export interface TeamRating {
  rank: number;
  team: string;
  attack: number;
  creation: number;
  possession: number;
  defense: number;
  goalkeeper: number;
  overall: number;
  flag: string;
}

export const mockTeamRatings: TeamRating[] = [
  { rank: 1, team: 'Brazil', flag: '🇧🇷', attack: 92, creation: 90, possession: 88, defense: 85, goalkeeper: 89, overall: 89 },
  { rank: 2, team: 'France', flag: '🇫🇷', attack: 90, creation: 88, possession: 86, defense: 87, goalkeeper: 91, overall: 88 },
  { rank: 3, team: 'Argentina', flag: '🇦🇷', attack: 89, creation: 91, possession: 90, defense: 82, goalkeeper: 85, overall: 87 },
  { rank: 4, team: 'Spain', flag: '🇪🇸', attack: 85, creation: 93, possession: 95, defense: 84, goalkeeper: 87, overall: 87 },
  { rank: 5, team: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', attack: 88, creation: 85, possession: 82, defense: 86, goalkeeper: 90, overall: 86 },
  { rank: 6, team: 'Portugal', flag: '🇵🇹', attack: 87, creation: 87, possession: 84, defense: 83, goalkeeper: 88, overall: 85 },
  { rank: 7, team: 'Germany', flag: '🇩🇪', attack: 86, creation: 86, possession: 87, defense: 83, goalkeeper: 86, overall: 85 },
  { rank: 8, team: 'Netherlands', flag: '🇳🇱', attack: 82, creation: 80, possession: 81, defense: 88, goalkeeper: 84, overall: 83 },
  { rank: 9, team: 'Italy', flag: '🇮🇹', attack: 80, creation: 82, possession: 83, defense: 89, goalkeeper: 85, overall: 83 },
  { rank: 10, team: 'Croatia', flag: '🇭🇷', attack: 78, creation: 85, possession: 86, defense: 81, goalkeeper: 82, overall: 81 },
  { rank: 11, team: 'Japan', flag: '🇯🇵', attack: 79, creation: 81, possession: 79, defense: 76, goalkeeper: 83, overall: 79 },
  { rank: 12, team: 'South Korea', flag: '🇰🇷', attack: 77, creation: 76, possession: 72, defense: 78, goalkeeper: 81, overall: 76 },
];

export const mockPlayers: Player[] = [
  { id: 'p1', name: 'Kylian Mbappé', team: 'France', flag: '🇫🇷', position: 'FW', influence: 94, status: 'excellent' },
  { id: 'p2', name: 'Lionel Messi', team: 'Argentina', flag: '🇦🇷', position: 'MF', influence: 92, status: 'good' },
  { id: 'p3', name: 'Vinícius Júnior', team: 'Brazil', flag: '🇧🇷', position: 'FW', influence: 91, status: 'excellent' },
  { id: 'p4', name: 'Jude Bellingham', team: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'MF', influence: 89, status: 'excellent' },
  { id: 'p5', name: 'Pedri', team: 'Spain', flag: '🇪🇸', position: 'MF', influence: 88, status: 'good' },
  { id: 'p6', name: 'Cristiano Ronaldo', team: 'Portugal', flag: '🇵🇹', position: 'FW', influence: 87, status: 'average' },
  { id: 'p7', name: 'Antoine Griezmann', team: 'France', flag: '🇫🇷', position: 'MF', influence: 86, status: 'good' },
  { id: 'p8', name: 'Lautaro Martínez', team: 'Argentina', flag: '🇦🇷', position: 'FW', influence: 85, status: 'good' },
  { id: 'p9', name: 'Florian Wirtz', team: 'Germany', flag: '🇩🇪', position: 'MF', influence: 84, status: 'excellent' },
  { id: 'p10', name: 'Bruno Fernandes', team: 'Portugal', flag: '🇵🇹', position: 'MF', influence: 83, status: 'good' },
  { id: 'p11', name: 'Frenkie de Jong', team: 'Netherlands', flag: '🇳🇱', position: 'MF', influence: 82, status: 'good' },
  { id: 'p12', name: 'Takefusa Kubo', team: 'Japan', flag: '🇯🇵', position: 'MF', influence: 80, status: 'excellent' },
];

export const statusLabels: Record<string, string> = {
  excellent: '状态出色',
  good: '状态良好',
  average: '状态一般',
  poor: '状态不佳',
  injured: '伤停'
};

export const positionLabels: Record<string, string> = {
  GK: '门将',
  DF: '后卫',
  MF: '中场',
  FW: '前锋'
};
