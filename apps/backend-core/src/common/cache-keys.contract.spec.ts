import { cacheKeys } from '@litecode/cache';


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
