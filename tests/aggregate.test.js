const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/\/\/ <pure>([\s\S]*?)\/\/ <\/pure>/);
assert.ok(match, 'pure block markers missing from index.html');
const lib = new Function(match[1] + '; return { aggregate, monthKeys, filterRepos, timeAgo, colorFor };')();

const NOW = new Date('2026-11-15T12:00:00Z');
const repos = [
  { name: 'alpha', description: 'Fast parser', language: 'Python', stargazers_count: 10, forks_count: 2, open_issues_count: 1, fork: false, pushed_at: '2026-11-01T00:00:00Z' },
  { name: 'beta', description: null, language: 'Go', stargazers_count: 0, forks_count: 0, open_issues_count: 0, fork: true, pushed_at: '2026-09-10T00:00:00Z' },
  { name: 'gamma', description: 'Go helper', language: 'Go', stargazers_count: 5, forks_count: 1, open_issues_count: 3, fork: false, pushed_at: '2024-01-01T00:00:00Z' },
  { name: 'delta', description: '', language: null, stargazers_count: 0, forks_count: 0, open_issues_count: 0, fork: false, pushed_at: '2026-11-10T00:00:00Z' },
];

test('monthKeys returns 12 ascending UTC months ending now', () => {
  const keys = lib.monthKeys(NOW, 12);
  assert.equal(keys.length, 12);
  assert.equal(keys[0], '2025-12');
  assert.equal(keys[11], '2026-11');
});

test('aggregate totals, languages, top repos and months', () => {
  const agg = lib.aggregate(repos, NOW);
  assert.deepEqual(agg.totals, { repos: 4, stars: 15, forks: 3, issues: 4 });
  assert.deepEqual(agg.languages, [['Go', 2], ['Python', 1]]);
  assert.deepEqual(agg.top.map(r => r.name), ['alpha', 'gamma']);
  const months = Object.fromEntries(agg.months);
  assert.equal(months['2026-11'], 2);
  assert.equal(months['2026-09'], 1);
  assert.equal(Object.values(months).reduce((a, b) => a + b, 0), 3);
});

test('aggregate handles an empty account', () => {
  const agg = lib.aggregate([], NOW);
  assert.equal(agg.totals.repos, 0);
  assert.deepEqual(agg.languages, []);
  assert.deepEqual(agg.top, []);
});

test('filterRepos searches, filters and sorts', () => {
  assert.deepEqual(lib.filterRepos(repos, { q: 'go' }).map(r => r.name), ['gamma']);
  assert.deepEqual(lib.filterRepos(repos, { lang: 'Go', hideForks: true }).map(r => r.name), ['gamma']);
  assert.deepEqual(lib.filterRepos(repos, { sort: 'stars' }).map(r => r.name).slice(0, 2), ['alpha', 'gamma']);
  assert.deepEqual(lib.filterRepos(repos, { sort: 'name' }).map(r => r.name), ['alpha', 'beta', 'delta', 'gamma']);
  assert.equal(lib.filterRepos(repos, {})[0].name, 'delta');
});

test('timeAgo formats relative times', () => {
  assert.equal(lib.timeAgo('2026-11-15T11:59:50Z', NOW), 'just now');
  assert.equal(lib.timeAgo('2026-11-15T11:00:00Z', NOW), '1 hour ago');
  assert.equal(lib.timeAgo('2026-11-10T12:00:00Z', NOW), '5 days ago');
  assert.equal(lib.timeAgo('2025-11-01T00:00:00Z', NOW), '1 year ago');
});

test('colorFor is stable for known and unknown languages', () => {
  assert.equal(lib.colorFor('Python'), '#3572a5');
  assert.equal(lib.colorFor('Zig'), lib.colorFor('Zig'));
  assert.match(lib.colorFor('Zig'), /^hsl\(/);
});
