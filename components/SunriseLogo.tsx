/**
 * Sabar sunrise mark — golden half-ring sun with teardrop rays
 * rising over a tapered horizon swoosh.
 */
export function SunriseLogo({ size = 32 }: { size?: number }) {
  const cx = 100, cy = 95;      // sun center
  const rayDist = 46;           // ray base distance from center

  // 11 rays across the top half — longest at the top, shrinking to the sides
  const rays = [];
  for (let deg = 15; deg <= 165; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const x = cx + rayDist * Math.cos(rad);
    const y = cy - rayDist * Math.sin(rad);
    const h = 10 + 20 * Math.sin(rad); // ray length
    rays.push({ x, y, h, rot: 90 - deg });
  }

  return (
    <svg width={size} height={(size * 140) / 200} viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sun-ring" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%"  stopColor="#F08C1B" />
          <stop offset="55%" stopColor="#F7A928" />
          <stop offset="100%" stopColor="#FFD84D" />
        </linearGradient>
        <linearGradient id="sun-ray" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%"  stopColor="#F7A928" />
          <stop offset="100%" stopColor="#FFDF66" />
        </linearGradient>
        <linearGradient id="sun-swoosh" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%"   stopColor="#F08C1B" />
          <stop offset="50%"  stopColor="#FFB347" />
          <stop offset="100%" stopColor="#F08C1B" />
        </linearGradient>
      </defs>

      {/* rays — teardrop leaves pointing outward */}
      {rays.map(({ x, y, h, rot }, i) => (
        <path
          key={i}
          d={`M 0 0 C 4.5 ${-h * 0.35}, 3.5 ${-h * 0.78}, 0 ${-h} C -3.5 ${-h * 0.78}, -4.5 ${-h * 0.35}, 0 0 Z`}
          fill="url(#sun-ray)"
          transform={`translate(${x} ${y}) rotate(${rot})`}
        />
      ))}

      {/* sun — thick half ring, open at the bottom */}
      <path
        d="M 62 95
           A 38 38 0 0 1 138 95
           L 124 95
           A 24 24 0 0 0 76 95
           Z"
        fill="url(#sun-ring)"
      />

      {/* horizon swoosh — tapered crescent */}
      <path
        d="M 8 118 Q 100 94 192 118 Q 100 112 8 118 Z"
        fill="url(#sun-swoosh)"
      />
    </svg>
  );
}
