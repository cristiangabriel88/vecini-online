/**
 * Atmosphere: the drifting sage blobs and grain overlay that give every
 * screen the warm, organic ambience of the brand placeholder. Purely
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
