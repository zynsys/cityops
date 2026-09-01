import path from 'node:path';
import { fileURLToPath } from 'node:url';
import curriculum, { type RawLessonDefinition, type RawModuleDefinition, type RawTrackDefinition } from './curriculum';

export interface WorkshopLesson extends RawLessonDefinition {
  readonly url: string;
  readonly sourcePath: string;
  readonly lessonIndex: number;
  readonly trackIndex: number;
  readonly module: WorkshopModule;
  readonly track: WorkshopTrack;
  previousLesson: WorkshopLesson | null;
  nextLesson: WorkshopLesson | null;
}

export interface WorkshopModule extends Omit<RawModuleDefinition, 'lessons'> {
  readonly url: string;
  readonly moduleIndex: number;
  readonly lessons: WorkshopLesson[];
  readonly track: WorkshopTrack;
  previousModule: WorkshopModule | null;
  nextModule: WorkshopModule | null;
}

export interface WorkshopTrack extends RawTrackDefinition {
  readonly url: string;
  readonly firstModuleUrl: string;
  readonly modules: WorkshopModule[];
  readonly lessons: WorkshopLesson[];
}

export interface WorkshopData {
  readonly title: string;
  readonly repositoryUrl: string;
  readonly workshopRoot: string;
  readonly tracks: WorkshopTrack[];
  readonly modules: WorkshopModule[];
  readonly lessons: WorkshopLesson[];
}

const workshopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tracks: WorkshopTrack[] = curriculum.tracks.map((track) => ({
  ...track,
  url: `/tracks/${track.id}/`,
  firstModuleUrl: '',
  modules: [],
  lessons: [],
}));
const modules: WorkshopModule[] = [];
const lessons: WorkshopLesson[] = [];

for (const rawModule of curriculum.modules) {
  const track = tracks.find((candidate) => candidate.id === rawModule.platform);
  if (!track) throw new Error(`Unknown workshop track: ${rawModule.platform}`);

  const moduleIndex = track.modules.length;
  const workshopModule = {
    ...rawModule,
    url: `/modules/${rawModule.id}/`,
    moduleIndex,
    lessons: [] as WorkshopLesson[],
    track,
    previousModule: null,
    nextModule: null,
  } satisfies WorkshopModule;

  for (const [lessonIndex, rawLesson] of rawModule.lessons.entries()) {
    const workshopLesson: WorkshopLesson = {
      ...rawLesson,
      url: `/lessons/${rawLesson.id}/`,
      sourcePath: path.join(workshopRoot, rawLesson.file),
      lessonIndex,
      trackIndex: track.lessons.length,
      module: workshopModule,
      track,
      previousLesson: null,
      nextLesson: null,
    };
    workshopModule.lessons.push(workshopLesson);
    track.lessons.push(workshopLesson);
    lessons.push(workshopLesson);
  }

  track.modules.push(workshopModule);
  modules.push(workshopModule);
}

for (const track of tracks) {
  Object.defineProperty(track, 'firstModuleUrl', { value: track.modules[0]?.url ?? track.url });
  track.modules.forEach((module, index) => {
    module.previousModule = track.modules[index - 1] ?? null;
    module.nextModule = track.modules[index + 1] ?? null;
  });
  track.lessons.forEach((lesson, index) => {
    lesson.previousLesson = track.lessons[index - 1] ?? null;
    lesson.nextLesson = track.lessons[index + 1] ?? null;
  });
}

export const workshop: WorkshopData = {
  title: 'Master AI-Powered DevOps with CityOps',
  repositoryUrl: 'https://github.com/zynsys/cityops',
  workshopRoot,
  tracks,
  modules,
  lessons,
};

export function findTrack(id: string): WorkshopTrack | undefined {
  return tracks.find((track) => track.id === id);
}

export function findModule(id: string): WorkshopModule | undefined {
  return modules.find((module) => module.id === id);
}

export function findLesson(id: string): WorkshopLesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
