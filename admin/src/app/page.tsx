'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.push('/auth/sign-in');
  }, [router]);

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <div>Redirecting...</div>
    </main>
  );
}
