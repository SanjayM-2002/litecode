const statusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const errorMessages = {
  INVALID_REQUEST: 'Invalid request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_EMAIL: 'Invalid email',
  INVALID_PASSWORD: 'Invalid password',
  DATABASE_ERROR: 'Database error',
  SOCIAL_LINK_EXISTS: 'Social link already exists',
  SOMETHING_WENT_WRONG: 'Something went wrong',
};

const gender = ['MALE', 'FEMALE', 'OTHER'] as const;

const languages = [
  'PYTHON',
  'JAVA',
  'JAVASCRIPT',
  'C',
  'CPP',
  'RUBY',
  'GO',
  'SWIFT',
  'KOTLIN',
  'TYPESCRIPT',
  'RUST',
] as const;

// Constants for Topics
export const topics = [
  'Array',
  'String',
  'Hash Table',
  'Dynamic Programming',
  'Math',
  'Sorting',
  'Greedy',
  'Depth-First Search',
  'Binary Search',
  'Matrix',
  'Tree',
  'Breadth-First Search',
  'Bit Manipulation',
  'Two Pointers',
  'Prefix Sum',
  'Heap (Priority Queue)',
  'Binary Tree',
  'Linked List',
  'Stack',
  'Graph',
  'Counting',
  'Sliding Window',
  'Backtracking',
  'Union Find',
  'Ordered Set',
  'Number Theory',
  'Monotonic Stack',
  'Segment Tree',
  'Trie',
  'Bitmask',
  'Combinatorics',
  'Queue',
  'Divide and Conquer',
  'Recursion',
  'Binary Indexed Tree',
  'Geometry',
  'Binary Search Tree',
  'Hash Function',
  'Memoization',
  'String Matching',
  'Shortest Path',
  'Topological Sort',
  'Rolling Hash',
  'Game Theory',
  'Interactive',
  'Data Stream',
  'Monotonic Queue',
  'Brainteaser',
  'Randomized',
  'Doubly-Linked List',
  'Iterator',
  'Concurrency',
  'Probability and Statistics',
  'Quickselect',
  'Deque',
] as const;

const companies = [
  'Meta',
  'Amazon',
  'Google',
  'Uber',
  'Bloomberg',
  'Apple',
  'Microsoft',
  'TikTok',
  'LinkedIn',
  'Goldman Sachs',
  'Oracle',
  'Salesforce',
  'Nvidia',
  'Adobe',
  'Citadel',
  'Airbnb',
  'Snap',
  'Atlassian',
  'J.P. Morgan',
  'IBM',
] as const;

export { statusCodes, errorMessages, gender, languages, companies };
