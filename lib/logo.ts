/**
 * APL TECH mark geometry — paths lifted verbatim from the supplied editable
 * SVG (viewBox 0 0 520 300). Kept out of the component file so Fast Refresh
 * doesn't force a full reload when the logo renders.
 */
export const APL_PATHS = [
  // main angled A / top bar
  "M42 190 L108 55 Q115 42 130 42 H330 V94 H151 L101 190 Z",
  // inner diagonal
  "M145 104 H204 L258 190 H201 Z",
  // central / right P-like form
  "M194 104 H270 V144 H326 Q348 144 348 121 V42 H397 V126 Q397 178 344 178 H270 V190 L244 151 V104 Z",
  // right horizontal bar
  "M348 190 H490 V236 H348 Z",
];

export const APL_VIEWBOX = "0 0 520 300";
/** Symbol only, cropped past the TECH wordmark. */
export const APL_SYMBOL_VIEWBOX = "30 30 472 218";
export const APL_SYMBOL_RATIO = 472 / 218;
export const APL_FULL_RATIO = 520 / 300;

/** Matches --color-accent-{deep,mid,bright} in globals.css. */
export const APL_STOPS = ["#6e2382", "#76218a", "#92168e"] as const;
