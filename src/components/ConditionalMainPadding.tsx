'use client';

import { usePathname } from 'next/navigation';

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
  const hasHeader = !PAGES_WITHOUT_HEADER.includes(pathname);
  
  return (
    <main className={hasHeader ? 'pt-16 flex-1' : 'flex-1'}>
      {children}
    </main>
  );
}
