import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { MessageCircle } from 'lucide-react';
import { getGuestHubPublicBySlug } from '@/lib/guest-hub';

export const dynamic = 'force-dynamic';

export default async function GuestHubPublicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const data = await getGuestHubPublicBySlug(slug);
  if (!data) notFound();

  const t = await getTranslations('guestHubPage');

  const digits = (data.whatsapp || '').replace(/\D/g, '');
  const waHref = digits ? `https://wa.me/${digits}` : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <p className="text-sm font-semibold text-sky-600">{t('brand')}</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{data.welcomeTitle}</h1>
      <p className="text-slate-500 text-sm mt-1">{data.propertyName}</p>

      {data.instructions ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            {t('instructionsTitle')}
          </h2>
          <p className="mt-3 text-slate-800 whitespace-pre-wrap leading-relaxed">{data.instructions}</p>
        </section>
      ) : null}

      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-white font-semibold shadow-md hover:bg-emerald-700 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          {t('whatsappCta')}
        </a>
      ) : null}
    </div>
  );
}
