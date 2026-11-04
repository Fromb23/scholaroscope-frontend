import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Principal Dashboard',
};

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
