'use client';

import {
  getTutorialVideoEmbedUrl,
  getTutorialVideoWatchUrl,
  type TutorialVideoKey,
} from '@/lib/tutorial-videos';

type Props = {
  videoKey: TutorialVideoKey;
  title: string;
  description?: string;
  watchOnYouTubeLabel?: string;
  /** UI in account language; video narration is Spanish only. */
  spanishAudioNote?: string;
  className?: string;
};

export default function TutorialVideoEmbed({
  videoKey,
  title,
  description,
  watchOnYouTubeLabel = 'Ver en YouTube',
  spanishAudioNote,
  className = '',
}: Props) {
  const embedUrl = getTutorialVideoEmbedUrl(videoKey);
  const watchUrl = getTutorialVideoWatchUrl(videoKey);

  return (
    <div className={`rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl shrink-0" aria-hidden>
          🎥
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
          {description ? (
            <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">{description}</p>
          ) : null}
          {spanishAudioNote ? (
            <p className="text-xs text-gray-500 mt-1 italic">{spanishAudioNote}</p>
          ) : null}
        </div>
      </div>
      <div
        className="w-full rounded-xl overflow-hidden bg-black/5"
        style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}
      >
        <iframe
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="mt-3 text-center">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
        >
          {watchOnYouTubeLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}