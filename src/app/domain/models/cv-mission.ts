/** One line of work. `roles` is null when the line inherits the roles of its experience entry. */
export interface CvMission {
  readonly text: string;
  readonly roles: readonly string[] | null;
}
