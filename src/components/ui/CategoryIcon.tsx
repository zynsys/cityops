import {
  PiCarDuotone,
  PiLightbulbFilamentDuotone,
  PiMapPinDuotone,
  PiPaintBrushDuotone,
  PiParkDuotone,
  PiRecycleDuotone,
  PiRoadHorizonDuotone,
  PiSpeakerHighDuotone,
  PiWavesDuotone,
} from 'react-icons/pi';
import type { IconType } from 'react-icons';

const CATEGORY_ICONS: Record<string, IconType> = {
  'road-pavement': PiRoadHorizonDuotone,
  'street-lighting': PiLightbulbFilamentDuotone,
  'graffiti-vandalism': PiPaintBrushDuotone,
  'drainage-flooding': PiWavesDuotone,
  'waste-recycling': PiRecycleDuotone,
  'parks-green-spaces': PiParkDuotone,
  'noise-pollution': PiSpeakerHighDuotone,
  'abandoned-vehicles': PiCarDuotone,
};

const CATEGORY_TONES: Record<string, string> = {
  'road-pavement': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-400/15 dark:text-zinc-200',
  'street-lighting': 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
  'graffiti-vandalism': 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200',
  'drainage-flooding': 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200',
  'waste-recycling': 'bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200',
  'parks-green-spaces': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
  'noise-pollution': 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200',
  'abandoned-vehicles': 'bg-stone-200 text-stone-700 dark:bg-stone-400/15 dark:text-stone-200',
};

export function getCategoryTone(slug?: string | null): string {
  return slug && Object.hasOwn(CATEGORY_TONES, slug) ? CATEGORY_TONES[slug] : 'bg-muted text-muted-foreground';
}

/** Duotone category pictograms; the adjacent category name provides the label. */
export function CategoryIcon({
  slug,
  size = 22,
  className,
}: {
  slug?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = slug && Object.hasOwn(CATEGORY_ICONS, slug) ? CATEGORY_ICONS[slug] : PiMapPinDuotone;
  return <Icon size={size} className={className} aria-hidden="true" focusable="false" />;
}
