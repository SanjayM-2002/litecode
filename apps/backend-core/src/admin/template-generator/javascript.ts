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

  const driverCode = `const fs = require('fs');

{{USER_CODE}}

for (const line of fs.readFileSync(0, 'utf-8').split('\\n')) {
  if (line.trim() === '') continue;
  const input = JSON.parse(line);
${perCase}
}
`;

  return { starterCode, driverCode };
}
