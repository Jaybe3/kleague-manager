import { parsePlayersColumn } from '../lib/importers/text-parser';

interface TestCase {
  input: string;
  expected: { name: string; action: 'FA' | 'DROP' }[];
}

const testCases: TestCase[] = [
  {
    input: "Dillon Gabriel QB • CLE - Signed for $0.00 Cooper Kupp WR • SEA - Dropped",
    expected: [
      { name: "Dillon Gabriel", action: "FA" },
      { name: "Cooper Kupp", action: "DROP" },
    ],
  },
  {
    input: "Jake Ferguson TE • DAL - Signed for $15.00 Adam Thielen WR • PIT - Dropped",
    expected: [
      { name: "Jake Ferguson", action: "FA" },
      { name: "Adam Thielen", action: "DROP" },
    ],
  },
  {
    input: "Carl Granderson DL • NO - Dropped",
    expected: [
      { name: "Carl Granderson", action: "DROP" },
    ],
  },
  {
    input: "Cam Ward QB • TEN - Signed for $0.00 Russell Wilson QB • NYG - Dropped",
    expected: [
      { name: "Cam Ward", action: "FA" },
      { name: "Russell Wilson", action: "DROP" },
    ],
  },
  {
    input: "Kenneth Walker III RB • SEA - Signed for $0.00",
    expected: [
      { name: "Kenneth Walker III", action: "FA" },
    ],
  },
];

console.log("=== Parser Test Results ===\n");

let passed = 0;
let failed = 0;

for (let i = 0; i < testCases.length; i++) {
  const { input, expected } = testCases[i];
  const result = parsePlayersColumn(input);

  console.log(`Test ${i + 1}: ${input.substring(0, 50)}...`);

  // Check count matches
  if (result.length !== expected.length) {
    console.log(`  ❌ FAIL: Expected ${expected.length} players, got ${result.length}`);
    console.log(`  Result:`, result.map(r => `${r.player.firstName} ${r.player.lastName} (${r.action})`));
    failed++;
    console.log("");
    continue;
  }

  // Check each player
  let testPassed = true;
  for (let j = 0; j < expected.length; j++) {
    const exp = expected[j];
    const got = result[j];
    const gotName = `${got.player.firstName} ${got.player.lastName}`;

    if (gotName !== exp.name || got.action !== exp.action) {
      console.log(`  ❌ FAIL: Player ${j + 1}`);
      console.log(`    Expected: ${exp.name} (${exp.action})`);
      console.log(`    Got:      ${gotName} (${got.action})`);
      testPassed = false;
    }
  }

  if (testPassed) {
    console.log(`  ✅ PASS`);
    for (const exp of expected) {
      console.log(`    - ${exp.name} (${exp.action})`);
    }
    passed++;
  } else {
    failed++;
  }

  console.log("");
}

console.log("=== Summary ===");
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed > 0) {
  process.exit(1);
}
