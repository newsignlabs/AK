import { Link } from 'react-router';
import type { ReactNode, MouseEventHandler } from 'react';

type Common = {
  children: ReactNode;
  variant?: 'solid' | 'ghost';
  icon?: ReactNode;
  className?: string;
  onClick?: MouseEventHandler;
};

/** M9 — label rolls up to a duplicate on hover. */
function Label({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <>
      <span className="btn__roll">
        <span className="btn__label">{children}</span>
        <span className="btn__label" aria-hidden>{children}</span>
      </span>
      {icon && <span className="btn__icon">{icon}</span>}
    </>
  );
}

export function Button({
  children,
  variant = 'solid',
  icon,
  className = '',
  onClick,
  to,
  href,
  type = 'button',
  disabled,
}: Common & { to?: string; href?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  const cls = `btn btn--${variant} ${className}`;
  if (to) return <Link to={to} className={cls} onClick={onClick}><Label icon={icon}>{children}</Label></Link>;
  if (href)
    return (
      <a href={href} className={cls} onClick={onClick} target="_blank" rel="noopener noreferrer">
        <Label icon={icon}>{children}</Label>
      </a>
    );
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      <Label icon={icon}>{children}</Label>
    </button>
  );
}

/** Text link with an underline that draws left→right on hover. */
export function TextLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`text-link ${className}`}>
      {children}
    </Link>
  );
}
