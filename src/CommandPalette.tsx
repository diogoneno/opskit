import { useEffect, useId, useRef, useState } from 'react';
import { navigate } from './router';
import { searchTools } from './search';
import { tools } from './tools/registry';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const id = useId();
  const results = searchTools(tools, query);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      input.current?.focus();
    } else if (!open && d.open) d.close();
  }, [open]);

  const go = (slug: string) => {
    navigate(slug);
    setQuery('');
    setActive(0);
    onClose();
  };

  return (
    <dialog ref={dialog} className="palette" aria-label="Command palette" onClose={onClose} onClick={(e) => e.target === dialog.current && onClose()}>
      <label htmlFor={id} className="sr-only">
        Search tools
      </label>
      <input
        ref={input}
        id={id}
        type="search"
        placeholder="Search tools…"
        value={query}
        role="combobox"
        aria-expanded="true"
        aria-controls={id + '-list'}
        aria-activedescendant={results[active] ? `${id}-${results[active].slug}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            go(results[active].slug);
          }
        }}
      />
      <ul id={id + '-list'} role="listbox" aria-label="Tools">
        {results.map((t, i) => (
          <li
            key={t.slug}
            id={`${id}-${t.slug}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? 'active' : undefined}
            onMouseMove={() => setActive(i)}
            onClick={() => go(t.slug)}
          >
            <span className="name">{t.name}</span>
            <span className="cat">{t.category}</span>
          </li>
        ))}
        {!results.length && <li className="empty">No tool matches “{query}”</li>}
      </ul>
    </dialog>
  );
}
