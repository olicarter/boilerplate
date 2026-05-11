import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { orgsApi } from '../api';

interface Props {
  value: string;
  onChange: (value: string) => void;
  orgSlug: string;
  id?: string;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export interface MentionTextareaHandle {
  focus: () => void;
}

interface Suggestion { id: string; name: string }

function getMentionQuery(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return null;
  return { query: match[1], start: cursor - match[0].length };
}

export const MentionTextarea = forwardRef<MentionTextareaHandle, Props>(function MentionTextarea(
  { value, onChange, orgSlug, id, rows = 3, placeholder, maxLength, style, 'data-testid': testId },
  ref,
) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setMentionStart(null);
    setActiveIdx(0);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
    onChange(next);

    const cursor = e.target.selectionStart ?? next.length;
    const match = getMentionQuery(next, cursor);
    if (!match) { clearSuggestions(); return; }

    setMentionStart(match.start);
    setActiveIdx(0);
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    fetchTimeout.current = setTimeout(async () => {
      try {
        const results = await orgsApi.searchMembers(orgSlug, match.query);
        setSuggestions(results);
      } catch { setSuggestions([]); }
    }, 150);
  }

  function insertMention(name: string) {
    if (mentionStart === null) return;
    const ta = textareaRef.current;
    const cursor = ta?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const inserted = `@${name} `;
    const next = `${before}${inserted}${after}`;
    onChange(maxLength ? next.slice(0, maxLength) : next);
    clearSuggestions();
    // Restore focus and move cursor after the inserted mention
    requestAnimationFrame(() => {
      ta?.focus();
      const pos = mentionStart + inserted.length;
      ta?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(suggestions[activeIdx].name); }
    else if (e.key === 'Escape') { clearSuggestions(); }
  }

  // Close dropdown on blur (small delay to allow click on suggestion)
  function handleBlur() {
    setTimeout(clearSuggestions, 150);
  }

  useEffect(() => () => { if (fetchTimeout.current) clearTimeout(fetchTimeout.current); }, []);

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        id={id}
        data-testid={testId}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        rows={rows}
        placeholder={placeholder}
        style={style}
      />
      {suggestions.length > 0 && (
        <ul
          data-testid="mention-dropdown"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 100,
            minWidth: 160,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              data-testid="mention-suggestion"
              onMouseDown={(e) => { e.preventDefault(); insertMention(s.name); }}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                background: i === activeIdx ? '#f0f4ff' : 'transparent',
                fontSize: 14,
              }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

