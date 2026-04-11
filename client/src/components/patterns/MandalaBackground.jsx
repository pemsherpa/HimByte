export default function MandalaBackground({ className = '', opacity = 0.06 }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      <svg className="w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" style={{ opacity }}>
        <defs>
          <pattern id="mandala-bg" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#1B5E8A" strokeWidth="0.5">
              <circle cx="50" cy="50" r="45" />
              <circle cx="50" cy="50" r="35" />
              <circle cx="50" cy="50" r="25" />
              <circle cx="50" cy="50" r="15" />
              <circle cx="50" cy="50" r="5"  />
              <line x1="50" y1="5"  x2="50" y2="95" />
              <line x1="5"  y1="50" x2="95" y2="50" />
              <line x1="17" y1="17" x2="83" y2="83" />
              <line x1="83" y1="17" x2="17" y2="83" />
              <path d="M50 5 Q65 30 50 50 Q35 30 50 5" />
              <path d="M95 50 Q70 65 50 50 Q70 35 95 50" />
              <path d="M50 95 Q35 70 50 50 Q65 70 50 95" />
              <path d="M5 50 Q30 35 50 50 Q30 65 5 50" />
              <path d="M83 17 Q60 35 50 50 Q65 30 83 17" />
              <path d="M83 83 Q65 70 50 50 Q70 65 83 83" />
              <path d="M17 83 Q30 65 50 50 Q35 70 17 83" />
              <path d="M17 17 Q35 30 50 50 Q30 35 17 17" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mandala-bg)" />
      </svg>
    </div>
  );
}
