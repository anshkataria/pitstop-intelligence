const FLAGS: Record<string, string> = {
  Australia: '🇦🇺',
  Austria: '🇦🇹',
  Azerbaijan: '🇦🇿',
  Bahrain: '🇧🇭',
  Belgium: '🇧🇪',
  Brazil: '🇧🇷',
  Canada: '🇨🇦',
  China: '🇨🇳',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Hungary: '🇭🇺',
  Italy: '🇮🇹',
  Japan: '🇯🇵',
  Mexico: '🇲🇽',
  Monaco: '🇲🇨',
  Netherlands: '🇳🇱',
  Portugal: '🇵🇹',
  Qatar: '🇶🇦',
  Russia: '🇷🇺',
  'Saudi Arabia': '🇸🇦',
  Singapore: '🇸🇬',
  Spain: '🇪🇸',
  Turkey: '🇹🇷',
  UAE: '🇦🇪',
  UK: '🇬🇧',
  USA: '🇺🇸',
};

export function flagForCountry(country: string | null | undefined): string {
  return (country && FLAGS[country]) || '';
}
