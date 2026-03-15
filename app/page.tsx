'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    router.replace('/login');
    return null;
  }

  router.replace('/dashboard');
  return null;
}
