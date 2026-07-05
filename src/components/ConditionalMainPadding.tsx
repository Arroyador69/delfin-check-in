'use client';

import { usePathname } from 'next/navigation';
import { isOnboardingPath } from '@/lib/onboarding-route';

interface ConditionalMainPaddingProps {
  children: React.ReactNode;
}

export default function ConditionalMainPadding({ children }: ConditionalMainPaddingProps) {
  const pathname = usePathname();
  
  // Páginas que NO tienen header, por lo tanto NO necesitan padding-top
  const PAGES_WITHOUT_HEADER: string[] = [
    '/admin-login',
    '/forgot-password',
  ];
  
  // Si es una página sin header, no aplicar padding-top
  const hasHeader = !PAGES_WITHOUT_HEADER.includes(pathname) && !isOnboardingPath(pathname);
  
  return (
    <main className={hasHeader ? 'pt-[calc(4rem+env(safe-area-inset-top))] flex-1' : 'flex-1'}>
      {children}
    </main>
  );
}
