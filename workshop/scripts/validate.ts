import fs from 'node:fs';
import path from 'node:path';
import { workshop } from '../lib/workshop-data';

const errors: string[] = [];
const ids = new Set<string>();

for (const track of workshop.tracks) {
  track.modules.forEach((module, index) => {
    if (module.sequence !== index + 1)
      errors.push(`${track.name}: module ${module.id} has sequence ${module.sequence}; expected ${index + 1}`);
    if (module.lessons.length === 0) errors.push(`${module.id}: module has no lessons`);
    if (module.lessons[0]?.title !== 'Getting Started')
      errors.push(`${module.id}: first lesson must be Getting Started`);
  });
}

for (const lesson of workshop.lessons) {
  if (ids.has(lesson.id)) errors.push(`${lesson.id}: duplicate lesson ID`);
  ids.add(lesson.id);
  if (!fs.existsSync(lesson.sourcePath)) errors.push(`${lesson.id}: missing ${lesson.file}`);
  if (path.extname(lesson.sourcePath).toLowerCase() !== '.md') errors.push(`${lesson.id}: source is not Markdown`);
}

const expectedRoutes = 1 + workshop.tracks.length + workshop.modules.length + workshop.lessons.length;
if (expectedRoutes !== 64) errors.push(`curriculum defines ${expectedRoutes} content routes; expected exactly 64`);
if (workshop.tracks.length !== 2 || workshop.modules.length !== 15 || workshop.lessons.length !== 46) {
  errors.push(
    `expected 2 tracks, 15 modules, and 46 lessons; found ${workshop.tracks.length}, ${workshop.modules.length}, and ${workshop.lessons.length}`,
  );
}

if (errors.length > 0) {
  console.error(`Workshop validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Workshop validation passed: ${workshop.tracks.length} tracks, ${workshop.modules.length} modules, ${workshop.lessons.length} lessons/previews, ${expectedRoutes} routes.`,
  );
}
