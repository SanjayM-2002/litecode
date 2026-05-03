import { GeneratedTemplate, Signature } from './types';

const CPP_TYPE_MAP: Record<string, string> = {
  int: 'int',
  'int[]': 'vector<int>',
  'int[][]': 'vector<vector<int>>',
  string: 'string',
  'string[]': 'vector<string>',
  boolean: 'bool',
  'boolean[]': 'vector<bool>',
  void: 'void',
};

// Types that should be passed by reference in the method signature to avoid
// unnecessary copies. Matches LeetCode's C++ convention.
const PASS_BY_REF = new Set([
  'int[]',
  'int[][]',
  'string',
  'string[]',
  'boolean[]',
]);

function cppType(type: string): string {
  const mapped = CPP_TYPE_MAP[type];
  if (!mapped) {
    throw new Error(`Unsupported C++ type: "${type}". Supported: ${Object.keys(CPP_TYPE_MAP).join(', ')}`);
  }
  return mapped;
}

function cppParamType(type: string): string {
  const base = cppType(type);
  return PASS_BY_REF.has(type) ? `${base}&` : base;
}

export function generateCppTemplate(sig: Signature): GeneratedTemplate {
  const params = sig.args.map((a) => `${cppParamType(a.type)} ${a.name}`).join(', ');
  const returnType = cppType(sig.returnType);

  const starterCode = `class Solution {
public:
    ${returnType} ${sig.methodName}(${params}) {
        // your code here
    }
};
`;

  const argUnpack = sig.args
    .map((a, i) => `    ${cppType(a.type)} ${a.name} = input[${i}].get<${cppType(a.type)}>();`)
    .join('\n');

  const callExpr = `s.${sig.methodName}(${sig.args.map((a) => a.name).join(', ')})`;

  const callAndPrint =
    sig.returnType === 'void'
      ? `    ${callExpr};\n    cout << "null" << endl;`
      : `    auto out = ${callExpr};\n    cout << json(out).dump() << endl;`;

  const driverCode = `// Driver: combines user code with input parsing and output formatting.
// Expects nlohmann/json single-header (json.hpp) on the include path.
#include <bits/stdc++.h>
#include "json.hpp"
using namespace std;
using json = nlohmann::json;

{{USER_CODE}}

int main() {
    json input;
    cin >> input;
${argUnpack}
    Solution s;
${callAndPrint}
    return 0;
}
`;

  return { starterCode, driverCode };
}