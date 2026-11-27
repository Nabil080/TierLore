// Three tier rows getting shorter, the last one dotted for what's still to rank.
// The middle row takes the text color, so the logo works on dark and light backgrounds
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <defs>
        <pattern id="logo-tone" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#8A84A0" />
        </pattern>
      </defs>
      <rect x="6" y="8" width="52" height="13" rx="4" fill="var(--accent)" />
      <rect x="6" y="25.5" width="38" height="13" rx="4" fill="currentColor" />
      <rect x="6.75" y="43.75" width="22.5" height="11.5" rx="3.5" fill="url(#logo-tone)" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="logo" style={{ fontSize: size }}>
      <LogoMark size={Math.round(size * 1.1)} />
      TierLore
    </span>
  )
}

// Shown in recording mode: the site's address, so viewers of the video can find it
export function Watermark() {
  return (
    <div className="watermark" aria-hidden="true">
      <LogoMark size={20} />
      <span>{window.location.host || 'TierLore'}</span>
    </div>
  )
}
