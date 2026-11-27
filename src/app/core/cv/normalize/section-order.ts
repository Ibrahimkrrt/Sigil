import { Archetype } from '@domain/models/archetype';
import { SectionType } from '@domain/models/section-type';

/** Default chapter order per archetype. The content decides what leads the story. */
export const SECTION_ORDER: Readonly<Record<Archetype, readonly SectionType[]>> = {
  designer: ['hero', 'summary', 'projects', 'experience', 'roles', 'achievements', 'milestones', 'skills', 'education', 'awards', 'custom', 'interests', 'contact'],
  engineer: ['hero', 'summary', 'skills', 'achievements', 'experience', 'roles', 'projects', 'milestones', 'education', 'awards', 'custom', 'interests', 'contact'],
  manager: ['hero', 'summary', 'achievements', 'experience', 'roles', 'milestones', 'projects', 'skills', 'education', 'awards', 'custom', 'interests', 'contact'],
  consultant: ['hero', 'summary', 'experience', 'roles', 'achievements', 'projects', 'skills', 'milestones', 'education', 'awards', 'custom', 'interests', 'contact'],
  generalist: ['hero', 'summary', 'experience', 'roles', 'achievements', 'projects', 'milestones', 'skills', 'education', 'awards', 'custom', 'interests', 'contact'],
};
