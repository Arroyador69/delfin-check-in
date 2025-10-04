'use client';
import { DefaultSeo } from 'next-seo';
import { defaultSEO } from '@/lib/seo';

export function SEOProvider() {
  return <DefaultSeo {...defaultSEO} />;
}
