import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true });

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy');
    node.setAttribute('decoding', 'async');
  }
});

const proseStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: '#333',
};

export function MarkdownContent({ content }: { content: string }) {
  const raw = marked.parse(content) as string;
  const html = DOMPurify.sanitize(raw);

  return (
    <div
      className="md-prose"
      style={proseStyle}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
