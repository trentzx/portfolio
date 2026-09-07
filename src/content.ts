// All personal content lives here. Every entry below is a sample, not a real claim.
// Put files in public/ and use paths like './resume.pdf' or './portrait.jpg'.
export const portfolio = {
  name: 'Trenton Scott',
  role: 'Designer, developer & curious human',
  tagline: 'A little nostalgia. A lot of possibility.',
  bio: 'I like turning thoughtful ideas into things people can use, feel, and enjoy. This is a space for my work, my experiments, and the things I’m figuring out along the way.',
  location: 'Your city, Earth',
  portrait: './avatar-mii-final.png' as string | null,
  interests: ['Thoughtful interfaces', 'Creative coding', 'Old-school technology', 'Everyday discoveries'],
  skills: ['React', 'TypeScript', 'UI / UX design', 'Three.js', 'CSS', 'Prototyping'],
  email: 'twscott06@gmail.com' as string | null,
  github: 'https://github.com/trentzx' as string | null,
  linkedin: 'https://www.linkedin.com/in/trentonscottx' as string | null,
  resume: null as string | null,
  resumeSummary: 'Add a short overview of your background, strengths, and the kind of work you want to do next.',
  projects: [
    { id: 'orbit', title: 'Orbit', category: 'Product design · Development', description: 'A calmer home for everyday ideas.', image: './orbit.svg', technologies: ['React', 'TypeScript', 'CSS'], detail: 'Sample concept: a thoughtful workspace for collecting notes and connecting ideas. Replace this with the problem you solved, your role, your process, and the outcome. The illustration is an original placeholder.', demo: null as string | null, source: null as string | null },
    { id: 'fieldnotes', title: 'Fieldnotes', category: 'Creative development', description: 'A digital collection of little discoveries.', image: './fieldnotes.svg', technologies: ['React', 'SVG', 'Motion'], detail: 'Sample concept: an interactive journal for observations from the world outside. Replace this sample with a real case study, screenshots, and your contribution.', demo: null as string | null, source: null as string | null },
    { id: 'frequency', title: 'Frequency', category: 'Interaction design', description: 'An experiment in listening differently.', image: './frequency.svg', technologies: ['Web Audio', 'TypeScript'], detail: 'Sample concept: a playful visual companion for sound. Add the story of a real project here, including design decisions and what you learned.', demo: null as string | null, source: null as string | null },
  ],
  experience: [
    { date: 'Present', title: 'Your current chapter', organization: 'Role / organization', description: 'Describe your current work and responsibilities here. This is a sample entry.' },
    { date: 'Previously', title: 'A meaningful experience', organization: 'Company / collaboration', description: 'Add a past role, contribution, or accomplishment you would like to share.' },
    { date: 'The beginning', title: 'Learning & education', organization: 'School / self-directed study', description: 'Add your education, a relevant course, or the moment you started making things.' },
  ],
  playground: [
    { title: 'Color radio', description: 'Turn the dial. Find a new mood.', type: 'Interactive color study' },
    { title: 'Tiny orbits', description: 'A small experiment in motion and balance.', type: 'CSS motion study' },
  ],
};
export const channels = [
  { id: 'about', name: 'About Me', note: 'The person behind the pixels', number: '01' },
  { id: 'projects', name: 'Projects', note: 'Ideas, made real', number: '02' },
  { id: 'experience', name: 'Experience', note: 'The journey so far', number: '03' },
  { id: 'resume', name: 'Résumé', note: 'A little more on paper', number: '04' },
  { id: 'playground', name: 'Playground', note: 'Made out of curiosity', number: '05' },
  { id: 'contact', name: 'Contact', note: 'Good things start with hello', number: '06' },
] as const;



