// All site copy and data lives here. Add images to public/ and reference them as './name.png'.

export const profile = {
  name: 'trenton scott',
  avatar: './avatar-mii-final.png',
  location: 'guelph, ontario',
  // Rendered as one sentence. `chip` pulls an icon in beside the word, faizm-style.
  bio: 'i study computer engineering @ guelph, build across the hardware-software line, and spend my spare cycles on computer vision, local-first tools and security.',
  email: 'twscott06@gmail.com',
  resume: './trentonscott_resume_s2026.pdf',
};

export const links = [
  { label: 'github', href: 'https://github.com/trentzx' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/trentonscottx' },
  { label: 'email', href: `mailto:${profile.email}` },
];

export const nav = [
  { label: 'work', href: '#work' },
  { label: 'projects', href: '#projects' },
  { label: 'résumé', href: './trentonscott_resume_s2026.pdf' },
];

export type Badge = 'current' | 'wip' | null;

export const work: {
  org: string;
  role: string;
  dates: string;
  badge: Badge;
  icon: string | null;
}[] = [
  {
    org: 'university of guelph',
    role: 'computer engineering, third year',
    dates: '2024 – present',
    badge: 'current',
    icon: null,
  },
  {
    org: 'cybertitan',
    role: 'national finalist · team lead',
    dates: '2023 – 2024',
    badge: null,
    icon: null,
  },
  {
    org: 'independent projects',
    role: 'computer vision, developer tooling, embedded, local ai',
    dates: 'always',
    badge: null,
    icon: null,
  },
];

export const projects: {
  id: string;
  title: string;
  blurb: string;
  tech: string[];
  icon: string;
  badge: Badge;
  source: string | null;
  demo: string | null;
}[] = [
  {
    id: 'myswing',
    title: 'myswing',
    blurb: 'a golf swing analyzer that turns down-the-line video into tempo ratio, head stability and spine tilt',
    tech: ['python', 'mediapipe', 'opencv'],
    icon: './myswing-mark.svg',
    badge: 'wip',
    source: 'https://github.com/trentzx/MYSWING',
    demo: null,
  },
  {
    id: 'focusbase',
    title: 'focusbase',
    blurb: 'a local-first dashboard that folds tasks, calendar, syllabi and pull requests into one clear next step',
    tech: ['react', 'vite', 'ollama'],
    icon: './focusbase-mark.svg',
    badge: null,
    source: 'https://github.com/trentzx/focusbase',
    demo: null,
  },
  {
    id: 'git-cracked',
    title: 'git-cracked',
    blurb: 'a cross-platform local scheduler for git automation, with a cli, dashboard and catch-up runs. no api keys',
    tech: ['node.js', 'cli', 'node-cron'],
    icon: './git-cracked-mark.svg',
    badge: null,
    source: 'https://github.com/trentzx/git-cracked',
    demo: null,
  },
  {
    id: 'mycampus',
    title: 'mycampus',
    blurb: 'crowd-built indoor campus navigation: a room graph, dijkstra routing, step-free mode and 360° visual routes',
    tech: ['dijkstra', '360° imagery'],
    icon: './mycampus-mark.svg',
    badge: 'wip',
    source: null,
    demo: null,
  },
  {
    id: 'tokenpet',
    title: 'tokenpet',
    blurb: 'a virtual pet that grows on your ai-coding habit, fed by a local engine that streams token deltas live',
    tech: ['typescript', 'node.js'],
    icon: './tokenpet-mark.svg',
    badge: 'wip',
    source: 'https://github.com/trentzx/tokenpet',
    demo: null,
  },
  {
    id: 'newt',
    title: 'newt',
    blurb: 'an mcp server that renders solved physics problems as handwritten notebook pages inside claude',
    tech: ['mcp', 'image rendering'],
    icon: './newt-mark.svg',
    badge: 'wip',
    source: null,
    demo: null,
  },
];

export const version = 'v2.0.0';
