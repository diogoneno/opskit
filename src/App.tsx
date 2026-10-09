import { createElement, lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { CommandPalette } from './CommandPalette';
import { hrefFor, useRoute } from './router';
import { categories, toolBySlug, tools } from './tools/registry';

const pages = new Map<string, LazyExoticComponent<ComponentType>>(tools.map((t) => [t.slug, lazy(t.load)]));
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function Home() {
  return (
    <>
      <header className="tool-header">
        <h1>opskit</h1>
        <p>
          {tools.length} DevOps and SRE tools that run entirely in your browser. Your data never leaves this tab — the one
          exception, the OSV vulnerability lookup, says so and only runs when you click.
        </p>
        <p className="hint">
          Press <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd> <kbd>K</kbd> to search, <kbd>/</kbd> to jump to a tool’s first input.
        </p>
      </header>
      {categories.map((c) => (
        <section key={c} aria-labelledby={`cat-${c}`}>
          <h2 id={`cat-${c}`}>{c}</h2>
          <ul className="grid">
            {tools
              .filter((t) => t.category === c)
              .map((t) => (
                <li key={t.slug}>
                  <a className="card" href={hrefFor(t.slug)}>
                    <strong>{t.name}</strong>
                    <span>{t.description}</span>
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export default function App() {
  const slug = useRoute();
  const tool = toolBySlug.get(slug);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = tool ? `${tool.name} · opskit` : 'opskit';
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [tool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === '/' && !typing && !paletteOpen) {
        const first = document.querySelector<HTMLElement>('#main input, #main textarea, #main select');
        if (first) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand" href="#/">opskit</a>
        <button type="button" className="btn" onClick={() => setPaletteOpen(true)} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
          Search <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <button type="button" className="btn menu-toggle" aria-expanded={menuOpen} aria-controls="sidebar" onClick={() => setMenuOpen(!menuOpen)}>
          Menu
        </button>
      </header>
      <nav id="sidebar" className={`sidebar${menuOpen ? ' open' : ''}`} aria-label="Tools" onClick={(e) => (e.target as HTMLElement).closest('a') && setMenuOpen(false)}>
        {categories.map((c) => (
          <div key={c}>
            <h2 className="nav-cat">{c}</h2>
            <ul>
              {tools
                .filter((t) => t.category === c)
                .map((t) => (
                  <li key={t.slug}>
                    <a href={hrefFor(t.slug)} aria-current={t.slug === slug ? 'page' : undefined}>
                      {t.name}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <main id="main" tabIndex={-1}>
        {tool ? (
          <Suspense fallback={<p role="status">Loading…</p>}>{createElement(pages.get(tool.slug)!)}</Suspense>
        ) : slug ? (
          <p role="alert">
            No tool called “{slug}”. <a href="#/">Back to all tools</a>
          </p>
        ) : (
          <Home />
        )}
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
