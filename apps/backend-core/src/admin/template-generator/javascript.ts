import { GeneratedTemplate, Signature } from './types';

const JS_TYPE_MAP: Record<string, string> = {
  int: 'number',
  'int[]': 'number[]',
  'int[][]': 'number[][]',
  string: 'string',
  'string[]': 'string[]',
  boolean: 'boolean',
  'boolean[]': 'boolean[]',
  void: 'void',
};

function jsType(type: string): string {
  const mapped = JS_TYPE_MAP[type];
  if (!mapped) {
    throw new Error(
      `Unsupported JS type: "${type}". Supported: ${Object.keys(JS_TYPE_MAP).join(', ')}`,
    );
  }
  return mapped;
}

export function generateJavaScriptTemplate(sig: Signature): GeneratedTemplate {
  const paramList = sig.args.map((a) => a.name).join(', ');
  const docParams = sig.args
    .map((a) => ` * @param {${jsType(a.type)}} ${a.name}`)
    .join('\n');

  const starterCode = `class Solution {
    /**
${docParams}
     * @return {${jsType(sig.returnType)}}
     */
    ${sig.methodName}(${paramList}) {
        // your code here
    }
}
`;

  const callExpr = `new Solution().${sig.methodName}(...input)`;
  const perCase =
    sig.returnType === 'void'
      ? `  ${callExpr};\n  console.log('null');`
      : `  const result = ${callExpr};\n  console.log(JSON.stringify(result ?? null));`;

  const driverCode = `// Driver: combines user code with input parsing and output formatting.
//
// The judge feeds test cases as NDJSON — one compact JSON value per line — and
// reads back one compact JSON value per line. That one-line-per-case property
// is what lets the judge attribute a failure to an exact test case when several
// run in a single process: a mismatch on line 7 is unambiguously case 7, and a
// process that dies after 6 lines died on case 7.
//
// console.log to a redirected FILE is synchronous in Node, so each line is on
// disk before the next case runs. That matters: if a later case is SIGKILLed
// for TLE or OOM, the lines already emitted survive and the judge can still
// pinpoint which case was executing.
const fs = require('fs');

{{USER_CODE}}

// TODO: readFileSync buffers the whole stream. Fine for inline cases; switch to
// a streaming line reader if object-store-backed cases get large.
for (const line of fs.readFileSync(0, 'utf-8').split('\\n')) {
  if (line.trim() === '') continue;
  const input = JSON.parse(line);
  // A fresh Solution per case, so instance state cannot leak between cases.
  // Module-level variables still persist — same behaviour as LeetCode.
${perCase}
}
`;

  return { starterCode, driverCode };
}
