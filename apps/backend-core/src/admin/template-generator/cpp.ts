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

  // Indented for the loop body inside main().
  const argUnpack = sig.args
    .map((a, i) => `        ${cppType(a.type)} ${a.name} = input[${i}].get<${cppType(a.type)}>();`)
    .join('\n');

  const callExpr = `s.${sig.methodName}(${sig.args.map((a) => a.name).join(', ')})`;

  // `endl` rather than "\n" is deliberate — see the note in the driver.
  const callAndPrint =
    sig.returnType === 'void'
      ? `        ${callExpr};\n        cout << "null" << endl;`
      : `        auto out = ${callExpr};\n        cout << json(out).dump() << endl;`;

  const driverCode = `// Driver: combines user code with input parsing and output formatting.
// Expects nlohmann/json single-header (json.hpp) on the include path.
//
// The judge feeds test cases as NDJSON — one compact JSON value per line — and
// reads back one compact JSON value per line. That one-line-per-case property
// is what lets the judge attribute a failure to an exact test case when several
// run in a single process: a mismatch on line 7 is unambiguously case 7, and a
// process that dies after 6 lines died on case 7.
#include <bits/stdc++.h>
#include "json.hpp"
using namespace std;
using json = nlohmann::json;

{{USER_CODE}}

int main() {
    string line;
    // getline + parse rather than \`cin >> input\`: nlohmann's stream operator
    // throws at end of input instead of failing the loop condition cleanly.
    while (getline(cin, line)) {
        if (line.empty()) continue;
        json input = json::parse(line);
${argUnpack}
        // Constructed inside the loop so member state cannot leak between
        // cases. \`static\` locals and globals still persist — same behaviour
        // as LeetCode, and the user's responsibility.
        Solution s;
${callAndPrint}
    }
    return 0;
}
`;

  return { starterCode, driverCode };
}
