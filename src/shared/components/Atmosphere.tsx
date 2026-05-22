/**
 * Atmosphere: the drifting warm beige/brown blobs and grain overlay that
 * give every screen a soft, organic ambience. Tinted via the --atmos-*
 * tokens, so it stays barely-there in light and deepens in dark. Purely
 * decorative: fixed, pointer-inert, and rendered behind all content.
 */
export function Atmosphere() {
  return (
    <div className="atmos" aria-hidden="true">
      <span className="atmos__blob atmos__blob--1" />
      <span className="atmos__blob atmos__blob--2" />
      <span className="atmos__blob atmos__blob--3" />
    </div>
  );
}
