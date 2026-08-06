import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function repair(code: string): string {
  return code.replace(
    /(\b(?:int|bool|void|double|float|long\s+long|std::string|std::vector\s*<[^;{}()]+>)\s+)(\d[A-Za-z0-9_]*)\s*(?=\()/g,
    '$1solve$2',
  );
}

async function main() {
  const templates = await prisma.codeTemplate.findMany({ where: { language: 'cpp' }, select: { id: true, code: true } });
  let repaired = 0;
  for (const template of templates) {
    const code = repair(template.code);
    if (code !== template.code) {
      await prisma.codeTemplate.update({ where: { id: template.id }, data: { code } });
      repaired++;
    }
  }
  console.log(`Repaired ${repaired} invalid C++ template identifiers.`);
}

main().finally(() => prisma.$disconnect());
