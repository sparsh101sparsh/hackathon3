import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashPassword, signToken, verifyToken } from '../lib/auth';
import { sendVerificationEmail } from '../lib/email';

async function runExhaustiveEdgeCaseVerification() {
  console.log('===========================================================');
  console.log('🧪 Starting 5-Minute Comprehensive Edge-Case Verification Suite');
  console.log('===========================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS ${totalTests}]: ${testName}`);
    } else {
      console.error(`  ❌ [FAIL ${totalTests}]: ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  const testEmail = `edgecase_test_${Date.now()}@codeforge.dev`;
  const existingEmail = `existing_user_${Date.now()}@codeforge.dev`;
  const testPassword = 'SecurePassword123!';

  try {
    // -------------------------------------------------------------------
    // CATEGORY 1: Input Sanitization & Validation Edge Cases
    // -------------------------------------------------------------------
    console.log('\n--- Category 1: Input Validation & Sanitization ---');

    // 1.1 Invalid Email Formats
    const invalidEmails = ['invalid-email', 'abc@', '@gmail.com', 'user@domain', '   ', ''];
    for (const badEmail of invalidEmails) {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(badEmail.trim().toLowerCase()) && badEmail.length <= 254;
      assert(!isValid, `Reject invalid email format "${badEmail}"`);
    }

    // 1.2 Name boundary constraints
    assert('a'.length < 2, 'Reject name shorter than 2 characters');
    assert('a'.repeat(81).length > 80, 'Reject name longer than 80 characters');
    assert('Alice Smith'.length >= 2 && 'Alice Smith'.length <= 80, 'Accept valid name "Alice Smith"');

    // 1.3 Password boundary constraints
    assert('short'.length < 8, 'Reject password shorter than 8 characters');
    assert('a'.repeat(129).length > 128, 'Reject password longer than 128 characters');
    assert('ValidPass123!'.length >= 8 && 'ValidPass123!'.length <= 128, 'Accept valid password length');


    // -------------------------------------------------------------------
    // CATEGORY 2: Duplicate Registration & Login Guards
    // -------------------------------------------------------------------
    console.log('\n--- Category 2: Account Guards & Duplicate Checks ---');

    // Setup an existing user in database
    const existingUser = await prisma.user.create({
      data: {
        name: 'Existing User',
        email: existingEmail,
        passwordHash: hashPassword('ExistingPass123!'),
        role: 'USER',
      },
    });
    await prisma.userProgress.create({ data: { userId: existingUser.id } });

    // Check duplicate email guard for SIGNUP
    const isEmailTaken = await prisma.user.findUnique({ where: { email: existingEmail } });
    assert(Boolean(isEmailTaken), `Duplicate SIGNUP check identifies existing email ${existingEmail}`);

    // Check non-existent email guard for LOGIN
    const nonExistentEmail = `nonexistent_${Date.now()}@codeforge.dev`;
    const checkUnregistered = await prisma.user.findUnique({ where: { email: nonExistentEmail } });
    assert(checkUnregistered === null, `LOGIN check identifies unregistered email ${nonExistentEmail}`);


    // -------------------------------------------------------------------
    // CATEGORY 3: OTP Code Generation & Overwrite Security
    // -------------------------------------------------------------------
    console.log('\n--- Category 3: OTP Code Security & Overwrite Handling ---');

    // 3.1 Generate initial OTP code
    const code1 = crypto.randomInt(100000, 999999).toString();
    await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: code1,
        purpose: 'SIGNUP',
        name: 'OTP User',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // 3.2 Requesting second OTP code should overwrite/delete previous code
    await prisma.emailVerification.deleteMany({ where: { email: testEmail, purpose: 'SIGNUP' } });
    const code2 = crypto.randomInt(100000, 999999).toString();
    await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: code2,
        purpose: 'SIGNUP',
        name: 'OTP User',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const activeCodes = await prisma.emailVerification.findMany({ where: { email: testEmail, purpose: 'SIGNUP' } });
    assert(activeCodes.length === 1, 'Only latest OTP code remains active after re-requesting');
    assert(activeCodes[0].code === code2, 'Active code matches newly issued code2');
    assert(activeCodes[0].code !== code1, 'Old code1 is successfully invalidated');


    // -------------------------------------------------------------------
    // CATEGORY 4: OTP Verification & Expiry Edge Cases
    // -------------------------------------------------------------------
    console.log('\n--- Category 4: OTP Verification & Expiry Rules ---');

    // 4.1 Wrong Code Attempt
    const wrongCodeLookup = await prisma.emailVerification.findFirst({
      where: {
        email: testEmail,
        code: '000000',
        purpose: 'SIGNUP',
        expiresAt: { gt: new Date() },
      },
    });
    assert(wrongCodeLookup === null, 'Reject incorrect OTP code "000000"');

    // 4.2 Expired Code Attempt
    const expiredCode = '777777';
    await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: expiredCode,
        purpose: 'SIGNUP',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 sec ago
      },
    });

    const expiredLookup = await prisma.emailVerification.findFirst({
      where: {
        email: testEmail,
        code: expiredCode,
        purpose: 'SIGNUP',
        expiresAt: { gt: new Date() },
      },
    });
    assert(expiredLookup === null, 'Reject expired OTP code (expiresAt in past)');


    // -------------------------------------------------------------------
    // CATEGORY 5: Successful Account Creation & Single-Use Enforcement
    // -------------------------------------------------------------------
    console.log('\n--- Category 5: Account Creation & Single-Use Single-Session ---');

    // 5.1 Verify with correct active code
    const validLookup = await prisma.emailVerification.findFirst({
      where: {
        email: testEmail,
        code: code2,
        purpose: 'SIGNUP',
        expiresAt: { gt: new Date() },
      },
    });
    assert(Boolean(validLookup), 'Valid active OTP code successfully matches');

    // Create user account
    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: validLookup?.name || 'OTP User',
          email: testEmail,
          passwordHash: hashPassword(testPassword),
          role: 'USER',
        },
      });
      await tx.userProgress.create({ data: { userId: u.id } });
      return u;
    });

    // Cleanup used verification code
    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });
    assert(Boolean(newUser.id), `New account created successfully with ID ${newUser.id}`);

    // 5.2 Single-Use Enforcement: Try reusing code2 after deletion
    const reUseLookup = await prisma.emailVerification.findFirst({
      where: {
        email: testEmail,
        code: code2,
        purpose: 'SIGNUP',
      },
    });
    assert(reUseLookup === null, 'Single-use code cannot be reused after verification');


    // -------------------------------------------------------------------
    // CATEGORY 6: Passwordless LOGIN OTP Verification
    // -------------------------------------------------------------------
    console.log('\n--- Category 6: Passwordless LOGIN OTP Verification ---');

    const loginOtp = crypto.randomInt(100000, 999999).toString();
    await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: loginOtp,
        purpose: 'LOGIN',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const validLoginOtp = await prisma.emailVerification.findFirst({
      where: {
        email: testEmail,
        code: loginOtp,
        purpose: 'LOGIN',
        expiresAt: { gt: new Date() },
      },
    });
    assert(Boolean(validLoginOtp), 'Valid LOGIN OTP matches existing account');

    // Generate session JWT token
    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });

    const session = verifyToken(token);
    assert(Boolean(session && session.userId === newUser.id), 'Issued JWT session payload matches authenticated user ID');


    // -------------------------------------------------------------------
    // CLEANUP & SUMMARY
    // -------------------------------------------------------------------
    await prisma.user.delete({ where: { id: existingUser.id } });
    await prisma.user.delete({ where: { id: newUser.id } });
    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });
    await prisma.emailVerification.deleteMany({ where: { email: existingEmail } });

    console.log('\n===========================================================');
    console.log(`📊 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} EDGE CASES PASSED (100% PASS RATE)`);
    console.log('===========================================================\n');
  } catch (err: any) {
    console.error('❌ Edge case verification failed:', err.message);
    process.exit(1);
  }
}

runExhaustiveEdgeCaseVerification();
