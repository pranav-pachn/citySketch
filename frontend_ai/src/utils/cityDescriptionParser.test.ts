/**
 * Test suite for cityDescriptionParser
 * Demonstrates parsing of various natural language inputs
 * Extended with Guide Section 1 keyword coverage
 */

import { parseText } from './cityDescriptionParser';

// ============================================================================
// Test Cases
// ============================================================================

const testCases = [
  {
    name: 'Example from requirements',
    input:
      'Design a 10 acre eco-friendly city with park, hospital and low traffic',
    expected: {
      area_in_acres: 10,
      priority: 'low traffic',
      constraints: {
        eco: true,
        low_traffic: true,
        high_density: false,
      },
    },
  },
  {
    name: 'Minimal input (empty)',
    input: '',
    expected: {
      area_in_acres: 5,
      priority: 'balanced',
      constraints: {
        eco: false,
        low_traffic: false,
        high_density: false,
      },
    },
  },
  {
    name: 'Only area specified',
    input: 'I want a 20 acre city',
    expected: {
      area_in_acres: 20,
      priority: 'balanced',
    },
  },
  {
    name: 'Multiple zones',
    input:
      'high density commercial city with 15 acres, needs hospital and parks',
    expected: {
      area_in_acres: 15,
      priority: 'high density',
    },
  },
  {
    name: 'Eco-friendly focus',
    input: 'eco friendly 8 acre residential zone with parks',
    expected: {
      area_in_acres: 8,
      priority: 'eco priority',
      constraints: {
        eco: true,
      },
    },
  },
  {
    name: 'Mixed casing',
    input: 'DESIGN A 12 ACRE City WITH HoSPiTaL',
    expected: {
      area_in_acres: 12,
      priority: 'balanced',
    },
  },
  {
    name: 'All constraints',
    input:
      'eco 25 acre city low traffic high density commercial hospital park',
    expected: {
      area_in_acres: 25,
      priority: 'low traffic',
      constraints: {
        eco: true,
        low_traffic: true,
        high_density: true,
      },
    },
  },
  // ── Guide Section 1 — New test cases ──
  {
    name: 'Guide example 1 — eco city',
    input: 'Design a 10 acre eco friendly city with parks, hospitals, low traffic and commercial zones',
    expected: {
      area_in_acres: 10,
      priority: 'low traffic',
      constraints: {
        eco: true,
        low_traffic: true,
        high_density: false,
      },
    },
  },
  {
    name: 'Guide example 2 — smart urban area',
    input: 'Build a smart urban area with healthcare, green spaces, high density housing and balanced traffic',
    expected: {
      area_in_acres: 5,  // No acre specified → default 5
      priority: 'high density',
      constraints: {
        eco: false,
        low_traffic: false,
        high_density: true,
      },
    },
  },
  {
    name: 'School keyword extraction',
    input: 'A city with schools near residential areas',
    expected: {
      area_in_acres: 5,
      priority: 'balanced',
    },
  },
  {
    name: 'Acreage edge case — very small (1 acre)',
    input: '1 acre eco city',
    expected: {
      area_in_acres: 1,
      priority: 'eco priority',
      constraints: {
        eco: true,
      },
    },
  },
  {
    name: 'Acreage edge case — very large (100 acres)',
    input: '100 acre mega city',
    expected: {
      area_in_acres: 100,
      priority: 'balanced',
    },
  },
];

// ============================================================================
// Test Runner
// ============================================================================

const runTests = (): void => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      City Description Parser - Test Suite                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);

    const result = parseText(testCase.input);

    console.log('Output:', JSON.stringify(result, null, 2));

    // Verify expected values
    let testPassed = true;

    if (
      testCase.expected.area_in_acres &&
      result.area_in_acres !== testCase.expected.area_in_acres
    ) {
      console.log(
        `❌ Area mismatch: expected ${testCase.expected.area_in_acres}, got ${result.area_in_acres}`
      );
      testPassed = false;
    }

    if (
      testCase.expected.priority &&
      result.priority !== testCase.expected.priority
    ) {
      console.log(
        `❌ Priority mismatch: expected "${testCase.expected.priority}", got "${result.priority}"`
      );
      testPassed = false;
    }

    if (testCase.expected.constraints) {
      const expectedConstraints = testCase.expected.constraints;
      if (
        expectedConstraints.eco !== undefined &&
        result.constraints.eco !== expectedConstraints.eco
      ) {
        console.log(
          `❌ Eco constraint mismatch: expected ${expectedConstraints.eco}, got ${result.constraints.eco}`
        );
        testPassed = false;
      }
      if (
        expectedConstraints.low_traffic !== undefined &&
        result.constraints.low_traffic !== expectedConstraints.low_traffic
      ) {
        console.log(
          `❌ Low traffic constraint mismatch: expected ${expectedConstraints.low_traffic}, got ${result.constraints.low_traffic}`
        );
        testPassed = false;
      }
      if (
        expectedConstraints.high_density !== undefined &&
        result.constraints.high_density !== expectedConstraints.high_density
      ) {
        console.log(
          `❌ High density constraint mismatch: expected ${expectedConstraints.high_density}, got ${result.constraints.high_density}`
        );
        testPassed = false;
      }
    }

    if (testPassed) {
      console.log('✅ PASSED');
      passed++;
    } else {
      failed++;
    }

    console.log('─'.repeat(60) + '\n');
  });

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  Tests Passed: ${passed}/${testCases.length}`.padEnd(60) + '║');
  console.log(`║  Tests Failed: ${failed}/${testCases.length}`.padEnd(60) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
};

// ============================================================================
// Example Usage
// ============================================================================

export const exampleUsage = (): void => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           Example Usage - Single Parse                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const userInput =
    'Design a 10 acre eco-friendly city with park, hospital and low traffic';

  console.log(`User Input:\n"${userInput}"\n`);
  console.log('Parsed Output:');

  const parsed = parseText(userInput);
  console.log(JSON.stringify(parsed, null, 2));
};

// Export for use in other modules
export { runTests, testCases };
