// All site copy and data lives here. Add images to public/ and reference them as './name.png'.

export const profile = {
  name: 'trenton scott',
  avatar: './avatar-mii-final.png',
  location: 'guelph, ontario',
  // Rendered as one sentence. `chip` pulls an icon in beside the word, faizm-style.
  bio: 'i study computer engineering @ guelph and build across the hardware-software line, from developer tooling and search to rtl security and a risc-v core.',
  email: 'twscott06@gmail.com',
  resume: './trentonscott_cv.pdf',
};

export const links = [
  { label: 'github', href: 'https://github.com/trentzx' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/trentonscottx' },
  { label: 'email', href: `mailto:${profile.email}` },
];

export const nav = [
  { label: 'work', href: '#work' },
  { label: 'projects', href: '#projects' },
  { label: 'résumé', href: './trentonscott_cv.pdf' },
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
    org: 'bioacuity consulting',
    role: 'student consultant · supplier selection & regulatory deliverables',
    dates: 'jul 2026 – present',
    badge: 'current',
    icon: null,
  },
  {
    org: 'university of guelph',
    role: 'bachelor of computer engineering · expected apr 2028',
    dates: '2024 – present',
    badge: 'current',
    icon: null,
  },
  {
    org: 'cybertitan',
    role: 'cybersecurity team lead · 12th in canada',
    dates: '2023 – 2024',
    badge: null,
    icon: null,
  },
];

/*
 * Link rule: private repo with a live site links to the site only; a public
 * repo with a site links to both; a public repo on its own links to the repo.
 * Anything private with no site carries no link rather than a 404.
 */
export const projects: {
  id: string;
  title: string;
  blurb: string;
  stats: string | null;
  tech: string[];
  icon: string;
  /** True when the logo draws its own background tile; false for transparent marks. */
  tile: boolean;
  badge: Badge;
  source: string | null;
  demo: string | null;
}[] = [
  {
    id: 'research-finder',
    title: 'guelph research finder',
    blurb: 'search tool that helps guelph students find professors by research area, built on a pipeline that matched 524 professors to open publication records',
    stats: '867 professors · 9,000+ publications · 500+ users',
    tech: ['react', 'typescript', 'supabase', 'openalex'],
    icon: './research-finder-mark.png',
    tile: true,
    badge: null,
    source: null, // private repo
    demo: 'https://guelph-research-finder.vercel.app/',
  },
  {
    id: 'polysh',
    title: 'polysh',
    blurb: 'one shell, every dialect: type windows cmd or linux commands and polysh translates them, flags included, for the os you are actually on',
    stats: 'shipped via homebrew and winget',
    tech: ['rust', 'cli'],
    icon: './polysh-mark.svg',
    tile: true,
    badge: null,
    source: 'https://github.com/trentzx/polysh',
    demo: 'https://trentzx.github.io/polysh/',
  },
  {
    id: 'limit',
    title: 'limit',
    blurb: 'a yosys plugin that finds security bugs in verilog and systemverilog nobody maintains any more, backed by sat proofs and mapped to mitre hardware cwes',
    stats: null,
    tech: ['c++', 'yosys', 'sat solving'],
    icon: './limit-mark.svg',
    tile: true,
    badge: null,
    source: null, // private repo
    demo: null,
  },
  {
    id: 'tracekit',
    title: 'tracekit',
    blurb: 'a python debugging tool with no outside dependencies that records what a program does as it runs: calls, inputs, timing and errors',
    stats: '300 automated tests · 3 cli tools · desktop overlay',
    tech: ['python', 'sys.monitoring', 'tkinter'],
    icon: './tracekit-mark.svg',
    tile: false,
    badge: null,
    source: 'https://github.com/trentzx/tracekit',
    demo: null,
  },
  {
    id: 'campusscan',
    title: 'campusscan',
    blurb: 'indoor navigation that guides people to rooms in unfamiliar buildings with photo-by-photo directions through corridors, stairs and elevators',
    stats: 'dijkstra routing · step-free mode · 53 automated tests',
    tech: ['next.js', 'typescript', 'prisma', 'postgresql'],
    icon: './campusscan-mark.svg',
    tile: false,
    badge: null,
    source: null, // private repo
    demo: null,
  },
  {
    id: 'riscv',
    title: 'risc-v processor',
    blurb: 'a 32-bit risc-v processor in vhdl, built from the ground up: register file, 32-bit alu and instruction decoder, each stage verified against risc-v test programs',
    stats: null,
    tech: ['vhdl', 'xilinx vivado'],
    icon: './riscv-mark.svg',
    tile: false,
    badge: 'wip',
    source: null,
    demo: null,
  },
];

export const version = 'v2.3.0';
