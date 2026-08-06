'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MobileAppEntryPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function routeUser() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json().catch(() => null);
        if (!active) return;
        router.replace(data?.user ? '/mobile/revision' : '/mobile/login');
      } catch {
        if (active) router.replace('/mobile/login');
      }
    }

    routeUser();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#08090d] px-5 py-8 text-slate-100">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-9 w-9 animate-spin text-amber-300" />
        <p className="text-sm font-semibold text-slate-300">Opening CodeForge Revision...</p>
      </div>
    </main>
  );
}
