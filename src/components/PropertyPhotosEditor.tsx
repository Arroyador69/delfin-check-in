'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { GripVertical, Star, X } from 'lucide-react';

type PropertyPhotosEditorProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
};

export default function PropertyPhotosEditor({ photos, onChange }: PropertyPhotosEditorProps) {
  const t = useTranslations('settings.properties');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const setAsMain = (index: number) => {
    if (index <= 0 || index >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const moveToIndex = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= photos.length || to >= photos.length) {
      return;
    }
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null) {
      moveToIndex(dragIndex, targetIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  if (photos.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      <p className="text-xs text-gray-600 leading-relaxed">{t('form.photosDragHint')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {photos.map((photo, index) => {
          const isMain = index === 0;
          const isDragging = dragIndex === index;
          const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <div
              key={`${index}-${photo.slice(0, 48)}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => {
                if (overIndex === index) setOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(index);
              }}
              className={[
                'relative group rounded-xl overflow-hidden border-2 bg-white transition-all cursor-grab active:cursor-grabbing',
                isMain ? 'border-amber-400 ring-2 ring-amber-200' : 'border-blue-200',
                isDragging ? 'opacity-50 scale-95' : '',
                isOver ? 'border-indigo-500 ring-2 ring-indigo-300' : '',
              ].join(' ')}
            >
              <img
                src={photo}
                alt=""
                className="w-full h-32 sm:h-40 object-cover pointer-events-none select-none"
                draggable={false}
              />

              {isMain && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  <Star className="w-3 h-3 fill-current" />
                  {t('form.mainPhoto')}
                </span>
              )}

              <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                <span
                  className="p-1 rounded-md bg-black/50 text-white"
                  title={t('form.dragHandle')}
                  aria-hidden
                >
                  <GripVertical className="w-4 h-4" />
                </span>
              </div>

              <div className="absolute bottom-0 inset-x-0 flex gap-1 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                {!isMain && (
                  <button
                    type="button"
                    onClick={() => setAsMain(index)}
                    className="flex-1 text-[10px] sm:text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-md py-1 px-1.5"
                  >
                    {t('form.setAsMain')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="p-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
                  aria-label={t('form.removePhoto')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
