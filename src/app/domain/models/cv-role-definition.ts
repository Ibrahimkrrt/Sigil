import { CvRolePart } from './cv-role-part';

export interface CvRoleDefinition {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly parts: readonly CvRolePart[];
}
