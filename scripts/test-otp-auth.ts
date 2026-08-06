import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashPassword, signToken, verifyToken } from '../lib/auth';
import { sendVerificationEmail } from '../lib/email';

async function runOtpAuthTest() {
  console.log('🧪 [TEST]: Starting Email OTP Verification System E2E Test...');

  const testEmail = `otp_test_${Date.now()}@codeforge.dev`;
  const testName = 'OTP Test User';
  const testPassword = 'TestPassword123!';

  try {
    // 1. Simulate sending 6-digit verification code for SIGNUP
    console.log(`1. Generating 6-digit SIGNUP verification code for ${testEmail}...`);
    const signupCode = crypto.randomInt(100000, 999999).toString();
    const passwordHash = hashPassword(testPassword);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const verificationRecord = await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: signupCode,
        purpose: 'SIGNUP',
        name: testName,
        passwordHash,
        expiresAt,
      },
    });

    console.log(`✅ EmailVerification record created! ID: ${verificationRecord.id}, Code: ${signupCode}`);

    // Verify email logger
    await sendVerificationEmail({
      email: testEmail,
      code: signupCode,
      purpose: 'SIGNUP',
      name: testName,
    });

    // 2. Simulate OTP Verification & User Creation
    console.log(`2. Verifying OTP code (${signupCode}) and creating User account...`);
    const activeVerification = await prisma.emailVerification.findFirst({
      where: {
        email: testEmail,
        code: signupCode,
        purpose: 'SIGNUP',
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeVerification) {
      throw new Error('❌ Active verification record not found!');
    }

    const createdUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: activeVerification.name || testName,
          email: testEmail,
          passwordHash: activeVerification.passwordHash || passwordHash,
          role: 'USER',
        },
      });
      await tx.userProgress.create({ data: { userId: u.id } });
      return u;
    });

    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });

    console.log(`✅ User created! ID: ${createdUser.id}, Name: ${createdUser.name}`);

    // 3. Test LOGIN OTP Flow
    console.log(`3. Testing LOGIN OTP code flow for ${testEmail}...`);
    const loginCode = crypto.randomInt(100000, 999999).toString();
    await prisma.emailVerification.create({
      data: {
        email: testEmail,
        code: loginCode,
        purpose: 'LOGIN',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const activeLoginVerification = await prisma.emailVerification.findFirst({
      where: {
        email: testEmail,
        code: loginCode,
        purpose: 'LOGIN',
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeLoginVerification) {
      throw new Error('❌ Login verification OTP record not found!');
    }

    // Issue JWT session token
    const token = signToken({
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      role: createdUser.role,
    });

    const sessionPayload = verifyToken(token);
    if (!sessionPayload || sessionPayload.userId !== createdUser.id) {
      throw new Error('❌ JWT Session Token verification failed!');
    }

    console.log(`✅ JWT Session Token verified for user: ${sessionPayload.email}`);

    // Cleanup test data
    await prisma.user.delete({ where: { id: createdUser.id } });
    await prisma.emailVerification.deleteMany({ where: { email: testEmail } });

    console.log('\n🎉 [SUCCESS]: All Email OTP Verification tests passed cleanly!\n');
  } catch (err: any) {
    console.error('❌ [TEST FAILED]:', err.message);
    process.exit(1);
  }
}

runOtpAuthTest();
