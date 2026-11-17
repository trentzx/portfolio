import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Github, Globe, Play } from 'lucide-react';
import Pond from './Pond';
import { links, nav, profile, projects, version, work, type Badge } from './content';
import './style.css';

/** Glossy status pill: `current`, `wip`. */
function Pill({ kind }: { kind: Badge }) {
  if (!kind) return null;
  return <span className={`pill pill-${kind}`}>{kind}</span>;
}

function Header() {
  return (
    <header className="head">
      <img className="avatar" src={profile.avatar} alt="" width={44} height={44} />
      <h1>{profile.name}</h1>
      <nav>
        {nav.map(item => (
          <a key={item.label} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section id={title} className="section">
      <h2>{title}</h2>
      <ul className="rows">{children}</ul>
    </section>
  );
}

export default function App() {
  // Demos are fetched only when asked for, so the page stays light.
  const [openDemo, setOpenDemo] = useState<string | null>(null);
  const calm =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="page">
      <Pond />
      <div className="glass">
        <Header />

        <p className="bio">{profile.bio}</p>

        <div className="links">
          {links.map(l => (
            <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>

        <Section title="work">
          {work.map(w => (
            <li key={w.org} className="row">
              <div className="row-main">
                <div className="row-title">
                  <strong>{w.org}</strong>
                  <Pill kind={w.badge} />
                </div>
                <div className="row-sub">{w.role}</div>
              </div>
              <div className="row-meta">{w.dates}</div>
            </li>
          ))}
        </Section>

        <Section title="projects">
          {projects.map(p => {
            const icon = (
              <img
                className={`row-icon ${p.tile ? 'tiled' : ''}`}
                src={p.icon}
                alt=""
                width={30}
                height={30}
                loading="lazy"
              />
            );
            // Prefer the live site over the repo when a project has both.
            const iconHref = p.demo ?? p.source;
            return (
            <li key={p.id} className="row">
              {iconHref ? (
                /* Redundant with the action icons on the right, so it's kept out
                   of the tab order and the accessibility tree rather than
                   announcing the same destination twice. */
                <a
                  className="row-icon-link"
                  href={iconHref}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {icon}
                </a>
              ) : (
                icon
              )}
              <div className="row-main">
                <div className="row-title">
                  <strong>{p.title}</strong>
                  <Pill kind={p.badge} />
                </div>
                <div className="row-sub">{p.blurb}</div>
                {p.stats && <div className="row-stats">{p.stats}</div>}
                <div className="row-tech">
                  {p.tech.map(t => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                {p.video && openDemo === p.id && (
                  <video
                    className="row-video"
                    src={p.video}
                    controls
                    loop
                    muted
                    playsInline
                    autoPlay={!calm}
                  />
                )}
              </div>
              <div className="row-meta row-actions">
                {p.video && (
                  <button
                    type="button"
                    className={`row-demo ${openDemo === p.id ? 'is-open' : ''}`}
                    aria-expanded={openDemo === p.id}
                    aria-label={`${openDemo === p.id ? 'Hide' : 'Watch'} the ${p.title} demo`}
                    onClick={() => setOpenDemo(openDemo === p.id ? null : p.id)}
                  >
                    <Play size={11} />
                    demo
                  </button>
                )}
                {p.source && (
                  <a href={p.source} target="_blank" rel="noreferrer" aria-label={`${p.title} source on GitHub`}>
                    <Github size={15} />
                  </a>
                )}
                {p.demo && (
                  <a href={p.demo} target="_blank" rel="noreferrer" aria-label={`${p.title} live demo`}>
                    <Globe size={15} />
                  </a>
                )}
              </div>
            </li>
            );
          })}
        </Section>

        <footer className="foot">
          <span>
            © {new Date().getFullYear()} {profile.name}
          </span>
          <span className="version">{version}</span>
        </footer>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
