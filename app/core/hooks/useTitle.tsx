// app/hooks/useTitle.ts
'use client';
import Head from 'next/head';

export function useTitle(title: string) {
  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
}
