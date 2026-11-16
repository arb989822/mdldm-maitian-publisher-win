const splitTopics = (text) => {
  const lines = text.split('\n');
  const topics = [];
  const rest = [];
  for (const l of lines) {
    if (/^#\S+/.test(l.trim()) && l.trim().split(/\s+/).every(w => w.startsWith('#'))) {
      for (const w of l.trim().split(/\s+/)) topics.push(w.slice(1));
    } else rest.push(l);
  }
  return { body: rest.join('\n').trim(), topics };
};

export function extend({ out, sec, field, covers }) {
  const s = sec('快手');
  if (!s) return;
  const raw = field(s, '正文') || field(s, '描述') || '';
  const b = splitTopics(raw);
  out.platforms.kuaishou = {
    covers: covers['3x4'] ? ['3x4'] : [],
    body: b.body,
    topics: b.topics,
  };
}
