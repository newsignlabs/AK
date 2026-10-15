import { activeSocials } from '../lib/content';
import { socialIcons, socialLabels } from './Icons';
import { track } from '../lib/analytics';

export function SocialLinks({ className = '', withLabels = false }: { className?: string; withLabels?: boolean }) {
  return (
    <ul className={`socials ${withLabels ? 'socials--labels' : ''} ${className}`}>
      {activeSocials.map(([key, url]) => {
        const Icon = socialIcons[key];
        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={withLabels ? undefined : socialLabels[key]}
              onClick={() => track('social_click', { network: key })}
              data-cursor="link"
            >
              <Icon />
              {withLabels && <span>{socialLabels[key]}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
