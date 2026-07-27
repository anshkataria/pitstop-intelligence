const FLAGS: Record<string, string> = {
  American: '🇺🇸',
  Argentine: '🇦🇷',
  Australian: '🇦🇺',
  Austrian: '🇦🇹',
  Belgian: '🇧🇪',
  Brazilian: '🇧🇷',
  British: '🇬🇧',
  Canadian: '🇨🇦',
  Chinese: '🇨🇳',
  Danish: '🇩🇰',
  Dutch: '🇳🇱',
  Finnish: '🇫🇮',
  French: '🇫🇷',
  German: '🇩🇪',
  Italian: '🇮🇹',
  Japanese: '🇯🇵',
  Mexican: '🇲🇽',
  Monegasque: '🇲🇨',
  'New Zealander': '🇳🇿',
  Polish: '🇵🇱',
  Russian: '🇷🇺',
  Spanish: '🇪🇸',
  Swiss: '🇨🇭',
  Thai: '🇹🇭',
};

export function flagFor(nationality: string | null | undefined): string {
  return (nationality && FLAGS[nationality]) || '';
}
