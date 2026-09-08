import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Copy, Download, Home, Mail, Volume2, VolumeX, Sparkles, MapPin, Github, Linkedin } from 'lucide-react';
import { channels, portfolio as p } from './content';

export function Preview({ type }: { type: string }) {
  return <div className={`preview preview-${type}`} aria-hidden="true">
    {type === 'about' && p.portrait ? <img className="channel-avatar" src={p.portrait} alt=""/> : type === 'about' && <><span className="hello-sticker">hello!</span><div className="portrait-art"><div className="hair"/><div className="face"><i/><i/><b/></div><div className="shirt"/></div><span className="little-star">✳</span></>}
    {type === 'projects' && <><div className="mini-window back-window"/><div className="mini-window"><div className="window-dots">•••</div><div className="window-picture"><i/><b/></div><div className="window-lines"/></div><span className="project-cursor">↖</span></>}
    {type === 'experience' && <><div className="tiny-timeline"><i/><i/><i/></div><span className="timeline-caption">one step at a time.</span></>}
    {type === 'resume' && <><div className="paper"><span>the story<br/>so far.</span><i/><i/><i/><b>↗</b></div><span className="paper-spark">✦</span></>}
    {type === 'playground' && <><div className="toy-ring"/><div className="toy-ball"/><div className="toy-cube"/><span className="toy-star">✳</span></>}
    {type === 'contact' && <><div className="envelope"><span>♡</span></div><span className="mail-bubble">let’s talk</span><span className="mail-star">✧</span></>}
  </div>;
}
function LinkOrUnavailable({ href, children }: { href: string | null; children: React.ReactNode }) {
  return href ? <a className="small-action" href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={18}/></a> : <span className="unavailable">{children} · not added yet</span>;
}
function Content({ section, project, go }: {section: string; project?: string; go: (path: string) => void}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [hue, setHue] = useState(205);
  const [playing, setPlaying] = useState(false);
  const [contactForm, setContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  const selected = p.projects.find(item => item.id === project);
  if (section === 'about') return <div className="about-layout"><div className="portrait-card">{p.portrait ? <img src={p.portrait} alt={p.name}/> : <><Preview type="about"/><span>Portrait placeholder</span></>}</div><div><p className="content-kicker">A HUMAN, FIRST.</p><h2>Hi, I’m {p.name}.</h2><p>{p.bio}</p><p className="location"><MapPin size={18}/>{p.location}</p><h3>Outside the work</h3><p>I’m usually thinking about a new project, following sports, getting a workout in, or listening to music. Those interests keep me curious about people, systems, rhythm, and the small details that make an experience feel right.</p><h3>Things I gravitate toward</h3><div className="tags">{p.interests.map(s => <span key={s}>{s}</span>)}</div><h3>My toolkit</h3><div className="tags blue">{p.skills.map(s => <span key={s}>{s}</span>)}</div></div></div>;
  if (section === 'projects') return selected ? <article className="project-detail"><button className="text-action" onClick={() => go('projects')}><ArrowLeft size={18}/>All projects</button><img className="project-hero" src={selected.image} alt={`${selected.title} project illustration`}/><p className="content-kicker">SELECTED PROJECT · {selected.category}</p><h2>{selected.title}</h2><p>{selected.detail}</p><div className="tags">{selected.technologies.map(t => <span key={t}>{t}</span>)}</div><div className="link-row"><LinkOrUnavailable href={selected.demo}>Live demo</LinkOrUnavailable><LinkOrUnavailable href={selected.source}>Source code</LinkOrUnavailable></div></article> : <><p className="content-kicker">SELECTED WORK · SIX PROJECTS</p><h2>Ideas, made real.</h2><p>A selection of tools, products, experiments, and works in progress.</p><div className="project-grid">{p.projects.map(item => <button className="project-card" key={item.id} onClick={() => go(`projects/${item.id}`)}><img src={item.image} alt={`${item.title} project illustration`}/><div><span>{item.category}</span><h3>{item.title}<ArrowUpRight size={23}/></h3><p>{item.description}</p></div></button>)}</div></>;
  if (section === 'experience') return <><p className="content-kicker">WORK, LEARNING & EVERYTHING BETWEEN</p><h2>A work in progress.</h2><p>Every chapter adds something. Here are a few of mine so far.</p><ol className="experience-list">{p.experience.map(item => <li key={item.title}><span className="date">{item.date}</span><div><h3>{item.title}</h3><span className="organization">{item.organization}</span><p>{item.description}</p></div></li>)}</ol></>;
  if (section === 'resume') return <div className="resume-layout"><div><p className="content-kicker">THE SHORT VERSION</p><h2>On paper.</h2><p>{p.resumeSummary}</p><h3>{p.name}</h3><p>{p.role}</p><div className="tags">{p.skills.map(s => <span key={s}>{s}</span>)}</div><div className="download-block"><button className="primary small" onClick={() => go('contact')}><Download size={19}/>Request résumé</button><p>I’m happy to share a current copy. Send me a note through the contact page.</p></div></div><div className="resume-sheet" aria-hidden="true"><span>{p.name}</span><small>{p.role}</small><hr/><b>PROFILE</b><i/><i/><i/><b>EXPERIENCE</b><i/><i/><i/><b>EDUCATION</b><i/><i/></div></div>;
  if (section === 'playground') return <><p className="content-kicker">A LITTLE MORE TO COME</p><h2>Lab coming soon.</h2><p>I’m collecting the experiments, technical notes, and unfinished ideas I want to share here. Check back soon.</p></>;
  return <>{contactForm ? <><button className="text-action" onClick={() => setContactForm(false)}><ArrowLeft size={18}/>Back to contact</button><p className="content-kicker">START A CONVERSATION</p><h2>Tell me what you’re thinking.</h2><form className="contact-form" onSubmit={event => {event.preventDefault(); const subject = encodeURIComponent(`Portfolio message from ${contactName}`); const body = encodeURIComponent(`${contactMessage}\n\nFrom: ${contactName}\nEmail: ${contactEmail}`); window.location.href = `mailto:${p.email}?subject=${subject}&body=${body}`;}}><div className="contact-form-grid"><label>Your name<input required value={contactName} onChange={event => setContactName(event.target.value)} placeholder="Name"/></label><label>Email address<input required type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="you@example.com"/></label></div><label>What are you thinking?<textarea required value={contactMessage} onChange={event => setContactMessage(event.target.value)} placeholder="A project, an opportunity, or just a hello..." rows={5}/></label><div className="contact-form-footer"><span>Good things start with a conversation.</span><button className="primary small" type="submit">Send message <ArrowUpRight size={18}/></button></div></form></> : <><p className="content-kicker">OPEN A NEW CONVERSATION</p><h2>Good things start<br/>with hello.</h2><p>Have an idea, a question, or just something nice to share?</p><button className="contact-email" onClick={() => setContactForm(true)}><Mail size={27}/><span>{p.email || 'Your email goes here'}</span><ArrowUpRight size={20}/></button><p className="copy-status">Click the email address to write a message.</p><div className="social-links"><LinkOrUnavailable href={p.github}><Github size={20}/>GitHub</LinkOrUnavailable><LinkOrUnavailable href={p.linkedin}><Linkedin size={20}/>LinkedIn</LinkOrUnavailable></div></>}</>;
}
export function Screen({ route, go, sound, toggleSound, active }: {route: string; go: (path: string) => void; sound: boolean; toggleSound: () => void; active: boolean}) {
  const [time, setTime] = useState(new Date());
  const [section, project] = route.split('/');
  const channel = channels.find(c => c.id === section);
  const lastSection = useRef('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {const timer = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(timer);}, []);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      const target = channel ? root.current?.querySelector<HTMLElement>('.channel-heading') : root.current?.querySelector<HTMLElement>(`[data-channel="${lastSection.current || 'about'}"]`);
      target?.focus({preventScroll: true});
      root.current?.querySelector('.channel-body')?.scrollTo({top: 0, behavior: 'smooth'});
      if (channel) lastSection.current = channel.id;
    }, 80);
    return () => clearTimeout(timer);
  }, [route, active, channel]);
  return <div ref={root} onWheelCapture={event => event.stopPropagation()} className={`tv-screen ${channel ? 'has-channel' : ''}`} inert={!active}>
    {channel ? <section className={`channel-content content-${section}`} key={route}><header className="channel-top"><button className="text-action" onClick={() => go('channels')}><ArrowLeft size={19}/>Back to channels</button><span>CH {channel.number}</span></header><div className="channel-body"><h1 className="channel-heading" tabIndex={-1}>{channel.name}</h1><Content section={section} project={project} go={go}/><p className="sample-note">Sample portfolio · Make this space your own.</p></div></section> : <><header className="screen-header"><div><span className="screen-wordmark">your little corner.</span><p>Pick a channel. Make yourself at home.</p></div><span className="live-badge"><i/>PERSONAL PORTFOLIO</span></header><nav className="channel-grid" aria-label="Portfolio channels">{channels.map(c => <button data-channel={c.id} className={`channel-tile tile-${c.id}`} key={c.id} onClick={() => go(c.id)} onKeyDown={e => { const keys = ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp']; if (!keys.includes(e.key)) return; e.preventDefault(); const columns = window.innerWidth < 760 ? 2 : 3; const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? columns : -columns; root.current?.querySelector<HTMLElement>(`[data-channel="${channels[(channels.indexOf(c) + step + channels.length) % channels.length].id}"]`)?.focus(); }}><Preview type={c.id}/><span className="tile-label">{c.name}<span>↗</span></span></button>)}</nav><div className="screen-caption"><Sparkles size={16}/><span>Six channels. A few different sides of me.</span></div></>}
    <footer className="screen-footer"><button onClick={() => go('channels')} className="home-control"><Home size={23}/><span>Home</span></button><div className="screen-clock"><time>{time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})}</time><span>{time.toLocaleDateString([], {month:'short', day:'numeric'})}</span></div><button className="sound-control" aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound} onClick={toggleSound}>{sound ? <Volume2 size={24}/> : <VolumeX size={24}/>}<span>Sound {sound ? 'on' : 'off'}</span></button></footer>
  </div>;
}
