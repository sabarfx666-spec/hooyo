/**
 * Sabar dragon mark — spiral-coil dragon with flame breath,
 * red→orange gradient style.
 */
export function DragonLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* odd coil layers: yellow-orange bottom → red top */}
        <linearGradient id="dg-odd" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%"  stopColor="#FFB300" />
          <stop offset="55%" stopColor="#F9612B" />
          <stop offset="100%" stopColor="#EF233C" />
        </linearGradient>
        {/* even coil layers: deep red top → orange bottom */}
        <linearGradient id="dg-even" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#99102E" />
          <stop offset="50%" stopColor="#E5352F" />
          <stop offset="100%" stopColor="#FF8A2A" />
        </linearGradient>
        {/* innermost swirl end */}
        <linearGradient id="dg-core" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#7C0D26" />
          <stop offset="100%" stopColor="#D9302F" />
        </linearGradient>
        {/* head: orange snout → deep red skull */}
        <linearGradient id="dg-head" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%"  stopColor="#FF7A1A" />
          <stop offset="45%" stopColor="#EF233C" />
          <stop offset="100%" stopColor="#B3122F" />
        </linearGradient>
        {/* flames: yellow tip → orange base */}
        <linearGradient id="dg-flame" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%"  stopColor="#FFD43B" />
          <stop offset="100%" stopColor="#FF7A1A" />
        </linearGradient>
      </defs>

      {/* ── spiral coil body — each circle tangent to the previous at a rotating point ── */}
      <circle cx="250" cy="300" r="170" fill="url(#dg-odd)" />
      <circle cx="250" cy="266" r="136" fill="url(#dg-even)" />
      <circle cx="282" cy="266" r="104" fill="url(#dg-odd)" />
      <circle cx="282" cy="292" r="78"  fill="url(#dg-even)" />
      <circle cx="260" cy="292" r="56"  fill="url(#dg-odd)" />
      <circle cx="260" cy="274" r="38"  fill="url(#dg-even)" />
      <circle cx="274" cy="274" r="24"  fill="url(#dg-odd)" />
      <circle cx="274" cy="285" r="13"  fill="url(#dg-core)" />

      {/* ── flame breath ── */}
      <path d="M 138 136 C 96 126, 62 110, 28 80 C 64 120, 98 138, 136 150 Z" fill="url(#dg-flame)" />
      <path d="M 142 148 C 106 152, 78 160, 46 180 C 84 170, 114 164, 146 160 Z" fill="url(#dg-flame)" />

      {/* ── head ── */}
      <path
        d="M 80 118
           L 186 76
           L 228 30
           L 252 86
           L 322 120
           L 368 178
           L 344 212
           L 232 176
           L 166 164
           L 118 148
           L 146 130
           Z"
        fill="url(#dg-head)"
      />

      {/* eye */}
      <path d="M 198 98 L 216 92 L 222 105 L 205 110 Z" fill="#1A1024" />
    </svg>
  );
}
