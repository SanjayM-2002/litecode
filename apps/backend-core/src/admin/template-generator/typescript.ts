import { GeneratedTemplate, Signature } from './types';

const TS_TYPE_MAP: Record<string, string> = {
  int: 'number',
  'int[]': 'number[]',
  'int[][]': 'number[][]',
  string: 'string',
  'string[]': 'string[]',
  boolean: 'boolean',
  'boolean[]': 'boolean[]',
  void: 'void',
};

function tsType(type: string): string {
  const mapped = TS_TYPE_MAP[type];
  if (!mapped) {
    throw new Error(
      `Unsupported TS type: "${type}". Supported: ${Object.keys(TS_TYPE_MAP).join(', ')}`,
    );
  }
  return mapped;
}

export function generateTypeScriptTemplate(sig: Signature): GeneratedTemplate {
  const params = sig.args.map((a) => `${a.name}: ${tsType(a.type)}`).join(', ');
  const returnType = tsType(sig.returnType);

  const starterCode = `class Solution {
    ${sig.methodName}(${params}): ${returnType} {
        // your code here
    }
}
`;

  const argTuple = sig.args.map((a) => tsType(a.type)).join(', ');
  const callExpr = `new Solution().${sig.methodName}(...(input as [${argTuple}]))`;
  const printResult =
    returnType === 'void'
      ? `${callExpr};\nconsole.log('null');`
      : `const result = ${callExpr};\nconsole.log(JSON.stringify(result ?? null));`;

  const driverCode = `// Driver: reads JSON input from stdin, calls user solution, prints JSON.
import * as fs from 'fs';
const input: unknown[] = JSON.parse(fs.readFileSync(0, 'utf-8'));

{{USER_CODE}}

${printResult}
`;

  return { starterCode, driverCode };
}