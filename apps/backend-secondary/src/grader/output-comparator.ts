/**
 * JSON deep-equal output comparison.
 * stdout: raw text from the program; trimmed of trailing whitespace before parse.
 * expected: the parsed JSON value from `inlineOutput`.
 *
 * Handles:
 *  - integers vs floats with small tolerance (1e-9 relative)
 *  - object key order independent
 *  - array order respected (caller can sort if order doesn't matter)
 *  - null and undefined treated the same (rare for our drivers, defensive)
 */
export function outputsMatch(stdout: string | null, expected: unknown): boolean {
  if (stdout === null) return false;

  let actual: unknown;
  try {
    actual = JSON.parse(stdout.trim());
  } catch {
    return false;
  }

  return deepEqual(actual, expected);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a == b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    const tol = 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    return Math.abs(a - b) <= tol;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as Record<string, unknown>).sort();
    const kb = Object.keys(b as Record<string, unknown>).sort();
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return false;
      if (
        !deepEqual(
          (a as Record<string, unknown>)[ka[i]],
          (b as Record<string, unknown>)[ka[i]],
        )
      ) {
        return false;
      }
    }
    return true;
  }

  return false;
}
