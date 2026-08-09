import { cacheKeys } from '@litecode/cache';

/**
 * Cross-language contract test.
 *
 * The Go judge worker invalidates caches directly after writing a verdict, so
 * it re-declares these key formats in apps/judge/internal/cache/cache.go. Two
 * copies of a string, and no compiler on either side can see the other.
 *
 * The dangerous edit is the VERSION SEGMENT. Bumping `problem:v2` to `v3` here
 * is a correct, deliberate change — and it silently breaks the judge, which
 * carries on deleting `problem:v2:*` keys that nobody reads while the API
 * serves stale problem data forever. No exception, no log line, nothing to
 * notice.
 *
 * So this test asserts the literals rather than the behaviour. If it fails,
 * that is the point: make the same change in apps/judge/internal/cache/cache.go
 * and update the expectation here.
 *
 * Only the three keys the judge touches are pinned. The rest are free to change.
 */
describe('cache key formats shared with apps/judge', () => {
  it('userSolvedMap matches userSolvedMapFmt in cache.go', () => {
    expect(cacheKeys.userSolvedMap('abc123')).toBe('user:abc123:solved-map');
  });

  it('problemBySlug matches problemBySlugFmt in cache.go', () => {
    expect(cacheKeys.problemBySlug('two-sum')).toBe('problem:v2:two-sum');
  });

  it('problemsListPattern matches problemsListPattern in cache.go', () => {
    expect(cacheKeys.problemsListPattern()).toBe('problems:list:v2:*');
  });

  it('the list pattern actually matches keys the list builder produces', () => {
    // Guards the other direction: a pattern that no longer covers real keys
    // would leave the judge deleting nothing at all.
    const key = cacheKeys.problemsList({
      tier: 'FREE',
      difficulty: null,
      page: 1,
      limit: 20,
    });
    const prefix = cacheKeys.problemsListPattern().replace(/\*$/, '');
    expect(key.startsWith(prefix)).toBe(true);
  });
});
