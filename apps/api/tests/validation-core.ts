import { ValidationService } from "../src/services/validation.service.js";

async function runCoreTests() {
  console.log("-----------------------------------------");
  console.log("🧪 RUNNING VALIDATION ENGINE TESTS");
  console.log("-----------------------------------------\n");

  const testCases = [
    { email: "john.doe@gmail.com", expected: "valid" },
    { email: "bademail@syntax", expected: "invalid" },
    { email: "test@mailinator.com", expected: "disposable" },
    { email: "admin@gmail.com", expected: "role_based" },
  ];

  let passed = 0;

  for (const tc of testCases) {
    const res = await ValidationService.validate(tc.email);
    const pass = res.status === tc.expected;
    console.log(`[${pass ? '✅ PASS' : '❌ FAIL'}] ${tc.email}`);
    console.log(`   -> Status: ${res.status} (Expected: ${tc.expected})`);
    console.log(`   -> Score: ${res.score}/100`);
    console.log(`   -> MX Records: ${res.hasMxRecords}`);
    console.log(`   -> Disposable: ${res.isDisposable}`);
    console.log(`   -> Role Based: ${res.isRoleBased}\n`);
    if (pass) passed++;
  }

  console.log(`Tests Passed: ${passed}/${testCases.length}`);
}

runCoreTests().then(() => process.exit(0)).catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});
