// A small set of line icons on a 24-unit grid, with soft round strokes to
// match the calm, rounded shapes of the app. Always decorative: the text
// beside an icon says what it means.
export const ICONS = {
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  bolt: '<path d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z"/>',
  chart: '<path d="M3.5 20.5h17"/><path d="M7 16.5v-5M12 16.5V6M17 16.5v-8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  cloudOff:
    '<path d="M3 3l18 18"/><path d="M8.5 6.4A6 6 0 0 1 17.7 10h.3a4 4 0 0 1 2.6 7"/><path d="M17 19H7.5a4.5 4.5 0 0 1-1.2-8.84"/>',
  download: '<path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.5 9.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.7"/><path d="M6.5 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.6-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  heart: '<path d="M12 20s-7.5-4.5-7.5-10.5A4.25 4.25 0 0 1 12 7a4.25 4.25 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20z"/>',
  hourglass:
    '<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3c0 4.5 4.5 6 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6-4.5 9s4.5 4.5 4.5 9"/>',
  layers: '<path d="M12 3.5l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  pictureInPicture:
    '<rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="12" y="11" width="6" height="5" rx="1"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.5-3 7.6-7.5 9-4.5-1.4-7.5-4.5-7.5-9V6z"/><path d="M9 12l2 2 4-4"/>',
  sliders:
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  trendingUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
} as const;

export type IconName = keyof typeof ICONS;
