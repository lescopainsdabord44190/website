import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function SafeHtml({ html, className, as: Component = 'div' }: SafeHtmlProps) {
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['em', 'strong', 'b', 'i', 'u', 'a', 'br', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return <Component className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}

