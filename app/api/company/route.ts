import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTtlCached } from '@/lib/ttlCache';

export const dynamic = 'force-dynamic';

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  problemCount: number;
}

const TARGET_COMPANIES = [
  {
    id: 'google',
    name: 'Google',
    slug: 'google',
    logo: '/companies/google.svg',
    description: 'Search, Cloud, Android & Tech Innovations',
    problemCount: 45,
  },
  {
    id: 'amazon',
    name: 'Amazon',
    slug: 'amazon',
    logo: '/companies/amazon.svg',
    description: 'E-Commerce, AWS Cloud Infrastructure & Logistics',
    problemCount: 52,
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    slug: 'microsoft',
    logo: '/companies/microsoft.svg',
    description: 'Windows OS, Azure Cloud, Developer Tools',
    problemCount: 38,
  },
  {
    id: 'meta',
    name: 'Meta',
    slug: 'meta',
    logo: '/companies/meta.svg',
    description: 'Social Platforms, AR/VR, Distributed Infrastructure',
    problemCount: 41,
  },
  {
    id: 'apple',
    name: 'Apple',
    slug: 'apple',
    logo: '/companies/apple.svg',
    description: 'Consumer Hardware, iOS Ecosystem, Metal & Services',
    problemCount: 29,
  },
  {
    id: 'netflix',
    name: 'Netflix',
    slug: 'netflix',
    logo: '/companies/netflix.svg',
    description: 'Streaming Media, Recommendation Engines & Edge Services',
    problemCount: 24,
  },
  {
    id: 'uber',
    name: 'Uber',
    slug: 'uber',
    logo: '/companies/uber.svg',
    description: 'Global Ridesharing, Geospatial Indexing & Logistics',
    problemCount: 31,
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    slug: 'flipkart',
    logo: '/companies/flipkart.svg',
    description: 'E-Commerce, Supply Chain Management & High-QPS Microservices',
    problemCount: 22,
  },
];

export async function GET(req: NextRequest) {
  try {
    const companies = await getTtlCached('public:companies:v2', 30_000, async () => {
      const dbCompanies = await prisma.company.findMany({
        include: {
          _count: {
            select: { companyProblems: true },
          },
        },
      });

      const dbMap = new Map(dbCompanies.map((c) => [c.name.toLowerCase(), c]));
      return TARGET_COMPANIES.map((seed): CompanySummary => {
        const dbComp = dbMap.get(seed.name.toLowerCase());
        const count = dbComp?._count.companyProblems || dbComp?.problemCount || seed.problemCount;
        return {
          id: dbComp?.id || seed.id,
          name: seed.name,
          slug: seed.slug,
          logo: seed.logo,
          description: dbComp?.description || seed.description,
          problemCount: count,
        };
      });
    });

    return NextResponse.json({ companies });
  } catch (error: unknown) {
    console.error('Error in /api/company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company list' },
      { status: 500 }
    );
  }
}
