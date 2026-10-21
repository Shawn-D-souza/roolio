/**
 * The Roolio time jar on its indigo tile, drawn on a 96-unit grid. The source
 * of truth is `assets/icon-source/roolio-icon.svg`; the shapes and colors here
 * follow it exactly (see DESIGN.md → Identity). The tile corner radius is 25%
 * of the width when shown rounded.
 *
 * `clipId` names the jar's clip path, so it must be unique within a page.
 */
export function markShapes(clipId: string, rounded = true): string {
  return `
  <defs><clipPath id="${clipId}"><circle cx="48" cy="54" r="24"/></clipPath></defs>
  <rect width="96" height="96" rx="${rounded ? 24 : 0}" fill="#2B2670"/>
  <circle cx="48" cy="54" r="26" fill="#C9C5FF" fill-opacity="0.14"/>
  <g clip-path="url(#${clipId})">
    <path d="M20 61 C30 57 39 65 48 61 S66 57 76 61 V84 H20 Z" fill="#FF9E85"/>
  </g>
  <circle cx="48" cy="54" r="26" fill="none" stroke="#C9C5FF" stroke-width="4"/>
  <rect x="38" y="14" width="20" height="9" rx="4.5" fill="#C9C5FF"/>
  <rect x="40" y="22" width="16" height="8" fill="#C9C5FF"/>
  <circle cx="48" cy="46" r="9.5" fill="#FFFFFF"/>
  <path d="M48 40 V46 L52.5 49" fill="none" stroke="#2B2670" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M29 47 A20 20 0 0 1 38 37" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>`;
}

let clipCount = 0;

/** A clip path id that no other mark on the page shares. */
export function nextClipId(): string {
  clipCount += 1;
  return `roolio-jar-${clipCount}`;
}

/** The mark as a standalone SVG document, for rendering to an image. */
export function markDocument(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96">${markShapes("jar")}</svg>`;
}
