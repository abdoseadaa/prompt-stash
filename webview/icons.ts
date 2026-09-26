/** Inline SVGs, trusted content only — these are injected via innerHTML. */

const S = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"`;

export const Icons = {
  plus: `<svg ${S}><path d="M8 3v10M3 8h10"/></svg>`,

  chevronRight: `<svg ${S}><path d="M6 4l4 4-4 4"/></svg>`,

  copy: `<svg ${S}><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5H4A1.5 1.5 0 0 0 2.5 5v6.5"/></svg>`,

  image: `<svg ${S}><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><circle cx="6" cy="6.75" r="1"/><path d="M3 11l3-2.5 2.5 2 2-1.5L13 11"/></svg>`,

  file: `<svg ${S}><path d="M9 2.5H5A1.5 1.5 0 0 0 3.5 4v8A1.5 1.5 0 0 0 5 13.5h6a1.5 1.5 0 0 0 1.5-1.5V6z"/><path d="M9 2.5V6h3.5"/></svg>`,

  trash: `<svg ${S}><path d="M3 5h10M6.5 5V3.5h3V5M4.5 5l.5 8h6l.5-8"/></svg>`,

  paperclip: `<svg ${S}><path d="M11.5 7.5l-4 4a2.47 2.47 0 0 1-3.5-3.5l5-5a1.65 1.65 0 0 1 2.33 2.33l-5 5a.83.83 0 0 1-1.16-1.16l4.33-4.34"/></svg>`,

  folder: `<svg ${S}><path d="M2.5 12.5v-8A1 1 0 0 1 3.5 3.5h2.8l1.2 1.5h5A1 1 0 0 1 13.5 6v6.5z"/></svg>`,

  check: `<svg ${S}><path d="M3.5 8.5l3 3 6-7"/></svg>`,

  reveal: `<svg ${S}><path d="M9.5 2.5h4v4M13.5 2.5l-5.5 5.5"/><path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3"/></svg>`,

  expand: `<svg ${S}><path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10"/></svg>`,

  close: `<svg ${S}><path d="M4 4l8 8M12 4l-8 8"/></svg>`,

  zoomIn: `<svg ${S}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3M7 5v4M5 7h4"/></svg>`,

  zoomOut: `<svg ${S}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3M5 7h4"/></svg>`,

  fit: `<svg ${S}><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><path d="M6 6.5h4v3h-4z"/></svg>`,
};
