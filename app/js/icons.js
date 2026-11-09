// Íconos de trazo (24×24), dibujados para esta app.
const p = (d, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const I = {
  home: p('<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v10.5h13V9"/><path d="M10 19.5v-5h4v5"/>'),
  prices: p('<path d="M3 12.5 11.5 4H20v8.5L11.5 21z"/><circle cx="15.5" cy="8.5" r="1.4"/>'),
  activity: p('<path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/>'),
  income: p('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>'),
  more: p('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'),
  calendar: p('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>'),
  bell: p('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  back: p('<path d="M15 5l-7 7 7 7"/>'),
  chevron: p('<path d="M9 5l7 7-7 7"/>'),
  up: p('<path d="M12 19V5M6 11l6-6 6 6"/>', 'stroke-width="2.6"'),
  down: p('<path d="M12 5v14M6 13l6 6 6-6"/>', 'stroke-width="2.6"'),
  flat: p('<path d="M5 12h14"/>', 'stroke-width="2.6"'),
  ship: p('<path d="M3 15.5h18l-2.5 4h-13z"/><path d="M6 15.5V9h12v6.5"/><path d="M12 9V4.5"/><path d="M9 12h6"/>'),
  factory: p('<path d="M3 20V10l5 3V10l5 3V6l3-2v16"/><path d="M3 20h18V9l-5 3"/><path d="M7 17h2M12 17h2"/>'),
  mine: p('<path d="M5 20l7-12 7 12z"/><path d="M9.5 14.5h5"/><path d="M12 4V2.5"/>'),
  crane: p('<path d="M5 21V4h2v17"/><path d="M7 5h12l-3 3"/><path d="M14 5v6"/><rect x="12" y="11" width="4" height="3"/><path d="M3 21h8"/>'),
  wholesale: p('<path d="M3 8l9-4.5L21 8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M7 20v-7h10v7"/><path d="M7 16.5h10"/>'),
  child: p('<circle cx="12" cy="6" r="2.5"/><path d="M8 21l1.5-7.5h5L16 21"/><path d="M7 11.5c1.5 1 3 1.5 5 1.5s3.5-.5 5-1.5"/>'),
  people: p('<circle cx="9" cy="8" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2a4.5 4.5 0 0 1 5 4.3"/>'),
  doc: p('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15.5h6M9 9h2"/>'),
  dollar: p('<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-1-1.6-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.2 0 3 5.8 1.6 5.8 4.6 0 1.3-1.3 2.2-3 2.2-1.3 0-2.5-.6-3-1.7"/><path d="M12 6v1.6M12 16.6V18"/>'),
  basket: p('<path d="M4 9.5h16l-1.6 9.5a1.5 1.5 0 0 1-1.5 1.2H7.1a1.5 1.5 0 0 1-1.5-1.2z"/><path d="M8.5 9.5 11 4M15.5 9.5 13 4"/><path d="M9.5 13.5v3M14.5 13.5v3"/>'),
  work: p('<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2"/><path d="M3 12.5h18"/>'),
  settings: p('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="7"/>'),
  info: p('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>'),
  copy: p('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  share: p('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v7.5h14V12"/>'),
  check: p('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.4"'),
  spark: p('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
};

/** Ícono por tabla/indicador */
export const ICON_FOR = {
  ipc: I.prices, canastas: I.basket, mayoristas: I.wholesale, icc: I.crane, obra_publica: I.doc,
  emae: I.activity, ipi_manufacturero: I.factory, ipi_minero: I.mine, salarios: I.income,
  trabajo: I.work, pobreza: I.people, crianza: I.child, comex: I.ship, poblacion: I.people, dolar: I.dollar,
};
