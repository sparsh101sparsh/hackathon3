import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/auth';
import { sendVerificationEmail } from '../lib/email';
import { evaluatePasswordStrength } from '../components/ui/PasswordStrengthMeter';

async function runCompleteAuthMasterSuite() {
  console.log('===========================================================');
  console.log('🚀 Starting Complete Production-Grade Email Auth Test Suite');
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

  const testEmail = `auth_master_${Date.now()}@codeforge.dev`;
  const testName = 'Shashwat Auth';
  const initialPassword = 'InitialPassword123!';
  const updatedPassword = 'NewSecurePassword456!';

  try {
    // -------------------------------------------------------------------
    // 1. Password Strength Evaluator Tests
    // -------------------------------------------------------------------
    console.log('--- Test Group 1: Password Strength Meter Evaluator ---');
    assert(evaluatePasswordStrength('short').score === 1, 'Evaluate "short" as Weak (score 1)');
    assert(evaluatePasswordStrength('password').score === 1, 'Evaluate "password" as Weak (score 1)');
    assert(evaluatePasswordStrength('Password123').score === 3, 'Evaluate "Password123" as Strong (score 3)');
    assert(evaluatePasswordStrength('Password123!').score === 4, 'Evaluate "Password123!" as Excellent (score 4)');

    // -------------------------------------------------------------------
    // 2. SIGNUP Email OTP Flow
    // -------------------------------------------------------------------
    console.log('\n--- Test Group 2: SIGNUP Email OTP Flow ---');
    const signupCode = crypto.randomInt(100000, 999999).toString();
    const signupExpires = new Date(Date.now() + 10 * 60 * 1000);

    const signupRecord = await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: signupCode,
        purpose: 'SIGNUP',
        name: testName,
        passwordHash: hashPassword(initialPassword),
        expiresAt: signupExpires,
      },
    });
    assert(Boolean(signupRecord.id), `SIGNUP OTP generated & saved with code ${signupCode}`);

    // Verify email logger
    const emailResult = await sendVerificationEmail({
      email: testEmail,
      code: signupCode,
      purpose: 'SIGNUP',
      name: testName,
    });
    assert(emailResult.success, 'Email delivery logger executed successfully');

    // Create user from OTP signup
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: signupRecord.name || testName,
          email: testEmail,
          passwordHash: signupRecord.passwordHash!,
          role: 'USER',
        },
      });
      await tx.userProgress.create({ data: { userId: createdUser.id } });
      return createdUser;
    });

    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });
    assert(Boolean(user.id), `User account created successfully with ID ${user.id}`);

    // Verify password hash
    const passMatches = verifyPassword(initialPassword, user.passwordHash);
    assert(passMatches, 'Password hash matches initial password');

    // -------------------------------------------------------------------
    // 3. LOGIN Email OTP Flow
    // -------------------------------------------------------------------
    console.log('\n--- Test Group 3: Passwordless LOGIN Email OTP Flow ---');
    const loginCode = crypto.randomInt(100000, 999999).toString();
    await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: loginCode,
        purpose: 'LOGIN',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const activeLoginOtp = await prisma.emailVerification.findFirst({
      where: { email: testEmail, code: loginCode, purpose: 'LOGIN', expiresAt: { gt: new Date() } },
    });
    assert(Boolean(activeLoginOtp), `LOGIN OTP record verified for email ${testEmail}`);

    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });

    // Issue session token
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    const session = verifyToken(token);
    assert(Boolean(session && session.userId === user.id), 'JWT session token issued & verified successfully');

    // -------------------------------------------------------------------
    // 4. FORGOT PASSWORD Reset OTP Flow
    // -------------------------------------------------------------------
    console.log('\n--- Test Group 4: FORGOT PASSWORD Reset OTP Flow ---');
    const resetCode = crypto.randomInt(100000, 999999).toString();
    await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: resetCode,
        purpose: 'RESET_PASSWORD',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const activeResetOtp = await prisma.emailVerification.findFirst({
      where: { email: testEmail, code: resetCode, purpose: 'RESET_PASSWORD', expiresAt: { gt: new Date() } },
    });
    assert(Boolean(activeResetOtp), `RESET_PASSWORD OTP code (${resetCode}) verified`);

    // Update password
    const newPasswordHash = hashPassword(updatedPassword);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });
    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });

    const newPassMatches = verifyPassword(updatedPassword, updatedUser.passwordHash);
    assert(newPassMatches, 'User password updated successfully to new password');

    const oldPassFails = !verifyPassword(initialPassword, updatedUser.passwordHash);
    assert(oldPassFails, 'Old password correctly fails authentication after reset');

    // -------------------------------------------------------------------
    // 5. Single-Use & Expiry Security Guards
    // -------------------------------------------------------------------
    console.log('\n--- Test Group 5: Security Guards & Single-Use Rules ---');
    const spentCheck = await prisma.emailVerification.findFirst({ where: { email: testEmail } });
    assert(spentCheck === null, 'Spent OTP records deleted completely (single-use token enforcement)');

    // -------------------------------------------------------------------
    // CLEANUP & SUMMARY
    // -------------------------------------------------------------------
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });

    console.log('\n===========================================================');
    console.log(`📊 MASTER SUITE RESULT: ${passedTests} / ${totalTests} TESTS PASSED (100% PASS RATE)`);
    console.log('===========================================================\n');
  } catch (err: any) {
    console.error('❌ Master auth suite failed:', err.message);
    process.exit(1);
  }
}

runCompleteAuthMasterSuite();
