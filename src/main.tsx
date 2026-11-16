import { createRoot } from 'react-dom/client';
import { Github, Globe } from 'lucide-react';
import { links, nav, profile, projects, version, work, type Badge } from './content';
import './style.css';

/** Glossy status pill: `current`, `wip`. */
function Pill({ kind }: { kind: Badge }) {
  if (!kind) return null;
  return <span className={`pill pill-${kind}`}>{kind}</span>;
}

/**
 * Decorative bubbles drifting up through the page margins. Sizes, offsets and
 * durations are spread by index so the field never looks like a grid. Hidden
 * entirely under `prefers-reduced-motion` (see style.css).
 */
function Bubbles() {
  const bubbles = [
    { left: '4%', size: 86, delay: 0, duration: 26 },
    { left: '11%', size: 34, delay: 6, duration: 19 },
    { left: '17%', size: 56, delay: 12, duration: 31 },
    { left: '7%', size: 22, delay: 17, duration: 16 },
    { left: '21%', size: 14, delay: 3, duration: 22 },
    { left: '80%', size: 64, delay: 2, duration: 28 },
    { left: '88%', size: 28, delay: 9, duration: 18 },
    { left: '94%', size: 44, delay: 14, duration: 24 },
    { left: '84%', size: 18, delay: 20, duration: 15 },
    { left: '75%', size: 36, delay: 24, duration: 33 },
  ];
  return (
    <div className="bubbles" aria-hidden="true">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animationDelay: `-${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
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
  return (
    <div className="page">
      <Bubbles />
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
              </div>
              <div className="row-meta row-actions">
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
