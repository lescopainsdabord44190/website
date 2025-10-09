import { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  target?: string;
}

export function Link({ href, children, className = '', onClick, target }: LinkProps) {
  // Si c'est un lien externe (commence par http:// ou https://), utiliser un <a> normal
  const isExternal = href.startsWith('http://') || href.startsWith('https://');

  if (isExternal || target === '_blank') {
    return (
      <a href={href} className={className} onClick={onClick} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink to={href} className={className} onClick={onClick}>
      {children}
    </RouterLink>
  );
}
