// Reads CHANGELOG.md into releases for the "What's new" window. Only released
// versions: the Unreleased section is work not deployed yet.

export type Release = {
  version: string;
  date: string;
  sections: { heading: string; items: string[] }[];
};

export function parseChangelog(md: string): Release[] {
  const releases: Release[] = [];
  let release: Release | null = null;
  let section: Release['sections'][number] | null = null;

  for (const line of md.split('\n')) {
    const version = line.match(/^## \[(\d+\.\d+\.\d+)\] - (\S+)/);
    if (version) {
      release = { version: version[1], date: version[2], sections: [] };
      releases.push(release);
      section = null;
    } else if (line.startsWith('## ')) {
      release = null; // Unreleased, or anything else that is not a version
    } else if (release && line.startsWith('### ')) {
      section = { heading: line.slice(4).trim(), items: [] };
      release.sections.push(section);
    } else if (section && line.startsWith('- ')) {
      section.items.push(line.slice(2).trim());
    } else if (section?.items.length && /^\s+\S/.test(line)) {
      // A bullet wrapped onto the next line.
      section.items[section.items.length - 1] += ` ${line.trim()}`;
    }
  }

  // Players read this as plain text, so drop the code ticks.
  for (const r of releases) {
    for (const s of r.sections) s.items = s.items.map((i) => i.replace(/`/g, ''));
  }
  return releases;
}
