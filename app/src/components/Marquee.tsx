/** M10 — slow infinite marquee; CSS-driven, pauses on hover, static under reduced motion. */
export function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="marquee__row" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={i}>
          {t}
          <span className="marquee__dot" aria-hidden>
            ✦
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee">
      <div className="marquee__track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
