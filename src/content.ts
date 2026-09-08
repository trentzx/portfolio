// Personal content for the portfolio. Put additional files in public/ and use paths like './resume.pdf'.
export const portfolio = {
  name: 'Trenton Scott',
  role: 'Computer engineering student, builder & curious human',
  tagline: 'Hardware, software, and everything worth exploring.',
  bio: 'I’m a third-year Computer Engineering student at the University of Guelph who enjoys building across the hardware-software boundary. I like turning thoughtful ideas into things people can use, feel, and enjoy—from computer-vision experiments and local-first tools to embedded systems and security projects. I’m also a CyberTitan national finalist, so I enjoy cybersecurity from both sides: understanding how systems work and learning how to make them more resilient.',
  location: 'Guelph, Ontario',
  portrait: './avatar-mii-final.png' as string | null,
  interests: ['Hardware + software', 'Cybersecurity', 'Sports + the gym', 'Music', 'Thoughtful interfaces', 'Creative coding'],
  skills: ['React', 'TypeScript', 'Python', 'C / C++', 'Cybersecurity', 'UI / UX design', 'Prototyping'],
  email: 'twscott06@gmail.com' as string | null,
  github: 'https://github.com/trentzx' as string | null,
  linkedin: 'https://www.linkedin.com/in/trentonscottx' as string | null,
  resume: './trentonscott_resume_s2026.pdf' as string | null,
  resumeSummary: 'Third-year Computer Engineering student at the University of Guelph interested in building useful systems across hardware, software, and cybersecurity.',
  projects: [
    { id: 'myswing', title: 'MYSWING', category: 'Computer vision · WIP', description: 'A golf swing analyzer that turns video into measurable technique.', image: './myswing-mark.svg', technologies: ['Python', 'MediaPipe', 'OpenCV', 'NumPy'], detail: 'A computer-vision pipeline for down-the-line golf swing video. It detects swing phases and reports tempo ratio, head stability, and spine tilt, with annotated output video and reliability checks for imperfect footage.', demo: null as string | null, source: 'https://github.com/trentzx/MYSWING' as string | null, wip: true },
    { id: 'focusbase', title: 'Focusbase', category: 'Product development', description: 'A local-first dashboard for turning a busy day into a clear next step.', image: './focusbase-mark.svg', technologies: ['React', 'Vite', 'Ollama', 'Google Calendar'], detail: 'A personal startup dashboard combining focus tasks, weather, syllabus parsing, GitHub pull requests, Google Calendar, a scratchpad, and a local AI assistant. Data stays in browser storage, with direct integrations where needed.', demo: null as string | null, source: 'https://github.com/trentzx/focusbase' as string | null },
    { id: 'newt', title: 'Newt', category: 'MCP server · WIP', description: 'Handwritten physics solutions, rendered right inside Claude.', image: './newt-mark.svg', technologies: ['MCP', 'Claude', 'Image rendering'], detail: 'Newt turns a solved physics problem into a polished handwritten-on-notebook-paper image through a Model Context Protocol server, making a conversational solution feel like a worked page from a notebook.', demo: null as string | null, source: null as string | null, wip: true },
    { id: 'mycampus', title: 'MyCampus', category: 'Navigation product · WIP', description: 'Crowd-built indoor navigation for university campuses.', image: './mycampus-mark.svg', technologies: ['Dijkstra', '360° imagery', 'Wayfinding'], detail: 'A campus navigation system that combines a graph of rooms, hallways, stairs, elevators, and entrances with photo-by-photo and 360° visual routes. Dijkstra finds the shortest route, including an optional step-free mode; Gaussian-splat spaces are planned next.', demo: null as string | null, source: null as string | null, wip: true },
    { id: 'git-cracked', title: 'git-cracked', category: 'Developer tooling', description: 'A cross-platform local scheduler for Git-based automation.', image: './git-cracked-mark.svg', technologies: ['Node.js', 'CLI', 'node-cron', 'simple-git'], detail: 'A local Node.js tool with a CLI, browser dashboard, scheduling, catch-up behavior, cross-platform startup scripts, and direct Git operations. It is packaged for installation through npx and designed to run without external services or API keys.', demo: null as string | null, source: 'https://github.com/trentzx/git-cracked' as string | null },
    { id: 'tokenpet', title: 'tokenpet', category: 'Desktop tooling · WIP', description: 'A virtual pet that grows with your AI-coding practice.', image: './tokenpet-mark.svg', technologies: ['TypeScript', 'Node.js', 'Local JSONL'], detail: 'A local usage engine that reads Claude Code logs, deduplicates and buckets token activity, and streams live deltas. The next phases add an Electron tray shell, pet loop, persistence, and evolution.', demo: null as string | null, source: 'https://github.com/trentzx/tokenpet' as string | null, wip: true },
  ],
  experience: [
    { date: '2024 — Present', title: 'Computer Engineering', organization: 'University of Guelph · Guelph, ON', description: 'Third-year student exploring software, embedded systems, computer engineering design, and the space where physical systems meet thoughtful interfaces.' },
    { date: '2023 — 2024', title: 'CyberTitan National Finalist', organization: 'Cybersecurity competition', description: 'Led a team through a multi-round national cybersecurity competition while researching vulnerabilities, mitigation strategies, and practical system defense.' },
    { date: 'Always', title: 'Building across disciplines', organization: 'Independent projects', description: 'I learn by making: from computer vision and developer tooling to campus navigation, physics interfaces, local AI, and hardware experiments.' },
  ],
  playground: [
    { title: 'Newt experiments', description: 'Exploring how physics problems can become visual, handwritten explanations inside Claude.', type: 'MCP + image rendering' },
    { title: 'MYSWING lab', description: 'Testing pose landmarks, swing phases, and ways to make movement measurable from video.', type: 'Computer vision study' },
  ],
};
export const channels = [
  { id: 'about', name: 'About Me', note: 'The person behind the pixels', number: '01' },
  { id: 'projects', name: 'Projects', note: 'Ideas, made real', number: '02' },
  { id: 'experience', name: 'Experience', note: 'The journey so far', number: '03' },
  { id: 'resume', name: 'Résumé', note: 'A little more on paper', number: '04' },
  { id: 'playground', name: 'Lab', note: 'Experiments in progress', number: '05' },
  { id: 'contact', name: 'Contact', note: 'Good things start with hello', number: '06' },
] as const;



