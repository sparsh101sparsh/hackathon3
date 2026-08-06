import { NextRequest } from 'next/server';
import { GET as statsHandler } from '../app/api/admin/stats/route';
import { GET as getProblemsHandler, POST as createProblemHandler } from '../app/api/admin/problems/route';
import { PUT as updateProblemHandler, DELETE as deleteProblemHandler } from '../app/api/admin/problems/[id]/route';
import { GET as getUsersHandler } from '../app/api/admin/users/route';
import { PATCH as updateUserRoleHandler } from '../app/api/admin/users/[id]/route';
import { prisma } from '../lib/prisma';
import { hashPassword, signToken } from '../lib/auth';

async function runTests() {
  console.log('====================================================');
  console.log('   CodeForge - Authenticated Admin Verification Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${testName}`);
      if (detail) console.error(`    Detail: ${detail}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-test-${timestamp}@codeforge.dev`,
        name: 'Admin Test User',
        passwordHash: hashPassword('AdminPass123!'),
        role: 'ADMIN',
      },
    });
    const adminToken = signToken({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    });
    const adminHeaders = { Cookie: `codeforge_session=${adminToken}` };

    // Unauthenticated admin access must be rejected.
    const anonymousStats = await statsHandler(new NextRequest('http://localhost:3000/api/admin/stats'));
    assert(anonymousStats.status === 403, 'Admin stats rejects unauthenticated requests');

    // ----------------------------------------------------
    // TEST 1: Admin Stats API (Authenticated)
    // ----------------------------------------------------
    console.log('--- Test Group 1: Admin Stats API ---');
    const statsReq = new NextRequest('http://localhost:3000/api/admin/stats', { method: 'GET', headers: adminHeaders });
    const statsRes = await statsHandler(statsReq);
    const statsData = await statsRes.json();

    assert(statsRes.status === 200, 'GET /api/admin/stats returns HTTP 200 for an admin session');
    assert(typeof statsData.totalProblems === 'number', 'Stats returns totalProblems count');
    assert(typeof statsData.totalSubmissions === 'number', 'Stats returns totalSubmissions count');
    console.log('');

    // ----------------------------------------------------
    // TEST 2: Admin Problem CRUD API (Authenticated)
    // ----------------------------------------------------
    console.log('--- Test Group 2: Admin Problem CRUD API ---');
    const testProblemSlug = `test-problem-${timestamp}`;

    const invalidCreateReq = new NextRequest('http://localhost:3000/api/admin/problems', {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Invalid Admin Problem',
        statement: 'invalid',
        inputFormat: 'invalid',
        outputFormat: 'invalid',
        constraints: 'invalid',
        difficulty: 'IMPOSSIBLE',
        timeLimit: 'not-a-number',
        memoryLimit: 99999,
      }),
    });
    const invalidCreateRes = await createProblemHandler(invalidCreateReq);
    assert(invalidCreateRes.status === 400, 'Admin problem creation rejects invalid difficulty and numeric limits');

    // 2a. Create Problem
    const createProbReq = new NextRequest('http://localhost:3000/api/admin/problems', {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Test Problem ${timestamp}`,
        slug: testProblemSlug,
        statement: 'Given two integers A and B, print their sum.',
        inputFormat: 'Single line with two space separated integers.',
        outputFormat: 'Single integer sum.',
        constraints: '1 <= A, B <= 10^9',
        difficulty: 'EASY',
        topicTags: ['Math', 'Implementation'],
        companyTags: ['TestCorp'],
        editorial: 'Simply compute A + B.',
        timeLimit: 1.0,
        memoryLimit: 256,
        sampleTestCases: [{ input: '3 5\n', expectedOutput: '8', explanation: '3 + 5 = 8' }],
        hiddenTestCases: [{ input: '100 200\n', expectedOutput: '300' }],
        codeTemplates: [{ language: 'python', code: 'import sys\nprint(sum(map(int, sys.stdin.read().split())))' }],
      }),
    });

    const createProbRes = await createProblemHandler(createProbReq);
    const createProbData = await createProbRes.json();

    assert(createProbRes.status === 201, 'POST /api/admin/problems creates problem for an admin session');
    assert(createProbData.slug === testProblemSlug, 'Created problem slug matches');
    assert(createProbData.testCases?.length === 2, 'Test cases saved correctly');
    const createdProblemId = createProbData.id;

    // 2b. Update Problem
    const updateProbReq = new NextRequest(`http://localhost:3000/api/admin/problems/${createdProblemId}`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Updated Test Problem ${timestamp}`,
        difficulty: 'MEDIUM',
      }),
    });
    const updateProbRes = await updateProblemHandler(updateProbReq, { params: Promise.resolve({ id: createdProblemId }) });
    const updateProbData = await updateProbRes.json();

    assert(updateProbRes.status === 200, 'PUT /api/admin/problems/[id] updates problem with HTTP 200');
    assert(updateProbData.title === `Updated Test Problem ${timestamp}`, 'Updated title matches');
    assert(updateProbData.difficulty === 'MEDIUM', 'Updated difficulty matches');

    // 2c. Delete Problem
    const deleteProbReq = new NextRequest(`http://localhost:3000/api/admin/problems/${createdProblemId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    const deleteProbRes = await deleteProblemHandler(deleteProbReq, { params: Promise.resolve({ id: createdProblemId }) });
    const deleteProbData = await deleteProbRes.json();

    assert(deleteProbRes.status === 200, 'DELETE /api/admin/problems/[id] deletes problem with HTTP 200');
    assert(deleteProbData.success === true, 'Delete response contains success flag');
    console.log('');

    // ----------------------------------------------------
    // TEST 3: Admin User Management API
    // ----------------------------------------------------
    console.log('--- Test Group 3: Admin User Management API ---');
    const getUsersReq = new NextRequest('http://localhost:3000/api/admin/users', { method: 'GET', headers: adminHeaders });
    const getUsersRes = await getUsersHandler(getUsersReq);
    const getUsersData = await getUsersRes.json();

    assert(getUsersRes.status === 200, 'GET /api/admin/users returns HTTP 200');
    assert(Array.isArray(getUsersData) && getUsersData.length > 0, 'Users list returned');

    const managedUser = await prisma.user.create({
      data: {
        email: `managed-user-${timestamp}@codeforge.dev`,
        name: 'Managed Test User',
        passwordHash: hashPassword('ManagedPass123!'),
        role: 'USER',
      },
    });

    // Update a real user's role to ADMIN
    const patchRoleReq = new NextRequest(`http://localhost:3000/api/admin/users/${managedUser.id}`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    const patchRoleRes = await updateUserRoleHandler(patchRoleReq, { params: Promise.resolve({ id: managedUser.id }) });
    const patchRoleData = await patchRoleRes.json();

    assert(patchRoleRes.status === 200, 'PATCH /api/admin/users/[id] updates a real user with HTTP 200');
    assert(patchRoleData.user?.role === 'ADMIN', 'User role updated to ADMIN');
    const persistedManagedUser = await prisma.user.findUnique({ where: { id: managedUser.id } });
    assert(persistedManagedUser?.role === 'ADMIN', 'User role update is persisted in the database');
    await prisma.user.delete({ where: { id: managedUser.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
    console.log('');

    console.log('====================================================');
    console.log(` Verification Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error running verification script:', error);
    process.exit(1);
  }
}

runTests();
