// Real constructor brand colors, used as visual accents (avatar backgrounds, card
// borders) tied to a driver/team's identity — not a data-encoding categorical series.
const TEAM_COLORS: Record<string, string> = {
  Mercedes: '#00A19C',
  Ferrari: '#DC0000',
  'Red Bull': '#1E3A8A',
  McLaren: '#FF8000',
  'Aston Martin': '#00352F',
  'Alpine F1 Team': '#2173B8',
  Williams: '#00A3E0',
  'Haas F1 Team': '#6E6E6E',
  'RB F1 Team': '#4E7FFF',
  Audi: '#6F42C1',
  'Cadillac F1 Team': '#C9A227',
  'Alfa Romeo': '#981E32',
  AlphaTauri: '#2B4562',
  'Racing Point': '#D6529C',
  Renault: '#B8A400',
  Sauber: '#00534C',
};
const FALLBACK = '#3A3B3D';

export function colorForTeam(name: string | null | undefined): string {
  return (name && TEAM_COLORS[name]) || FALLBACK;
}
