// Seed Topic rows. Idempotent — re-running updates description/name without duplicating.
// Run from packages/db: `node seed/seed_topics.js`
//
// Reads packages/db/.env for DATABASE_URL.

const path = require('path');
const { Client } = require('pg');
const cuid = require('cuid');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TOPICS = [
  { slug: 'array', name: 'Array', description: 'Problems involving 1D / 2D arrays.' },
  { slug: 'string', name: 'String', description: 'Problems centered around string manipulation.' },
  { slug: 'hash-table', name: 'Hash Table', description: 'Problems solved using hash maps or sets.' },
  { slug: 'dynamic-programming', name: 'Dynamic Programming', description: 'Problems with overlapping subproblems and optimal substructure.' },
  { slug: 'math', name: 'Math', description: 'Number theory, combinatorics, and arithmetic.' },
  { slug: 'sorting', name: 'Sorting', description: 'Problems involving ordering elements.' },
  { slug: 'greedy', name: 'Greedy', description: 'Locally optimal choices that lead to a global optimum.' },
  { slug: 'depth-first-search', name: 'Depth-First Search', description: 'Recursive or stack-based traversal.' },
  { slug: 'breadth-first-search', name: 'Breadth-First Search', description: 'Level-by-level graph or tree traversal.' },
  { slug: 'binary-search', name: 'Binary Search', description: 'Logarithmic search over a sorted or monotonic space.' },
  { slug: 'tree', name: 'Tree', description: 'General tree structures (binary, n-ary, BST).' },
  { slug: 'graph', name: 'Graph', description: 'Problems on directed and undirected graphs.' },
  { slug: 'recursion', name: 'Recursion', description: 'Problems that decompose into smaller self-similar problems.' },
  { slug: 'two-pointers', name: 'Two Pointers', description: 'Linear scan with two indices.' },
  { slug: 'sliding-window', name: 'Sliding Window', description: 'Subarray / substring problems with a moving window.' },
  { slug: 'stack', name: 'Stack', description: 'LIFO-based problems and monotonic stacks.' },
  { slug: 'queue', name: 'Queue', description: 'FIFO-based problems and monotonic queues.' },
  { slug: 'heap', name: 'Heap (Priority Queue)', description: 'Top-k, k-way merge, scheduling.' },
  { slug: 'backtracking', name: 'Backtracking', description: 'Search with state restoration on failure.' },
  { slug: 'bit-manipulation', name: 'Bit Manipulation', description: 'Bitwise operations and tricks.' },
  { slug: 'linked-list', name: 'Linked List', description: 'Singly and doubly linked lists.' },
  { slug: 'trie', name: 'Trie', description: 'Prefix tree for string search and autocomplete.' },
  { slug: 'union-find', name: 'Union Find', description: 'Disjoint Set Union for connectivity problems.' },
  { slug: 'divide-and-conquer', name: 'Divide and Conquer', description: 'Recursive splitting and combining.' },
  { slug: 'topological-sort', name: 'Topological Sort', description: 'Ordering on directed acyclic graphs.' },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (set it in packages/db/.env)');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const t of TOPICS) {
      const result = await client.query(
        `INSERT INTO "Topic" (id, slug, name, description, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, true, now(), now())
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               description = EXCLUDED.description,
               "updatedAt" = now()
         RETURNING (xmax = 0) AS inserted`,
        [cuid(), t.slug, t.name, t.description ?? null],
      );

      if (result.rows[0]?.inserted) inserted += 1;
      else updated += 1;
    }

    await client.query('COMMIT');

    console.log(`Topics seeded:`);
    console.log(`  inserted: ${inserted}`);
    console.log(`  updated:  ${updated}`);
    console.log(`  total:    ${TOPICS.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
