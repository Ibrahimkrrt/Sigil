import { Injectable, signal } from '@angular/core';

/** Carries a request to open one role's deep dive from anywhere on the page to the roles chapter. */
@Injectable({ providedIn: 'root' })
export class RoleFocus {
  private readonly requested = signal<{ readonly id: string } | null>(null);

  /** The latest request. A new object each time, so asking twice for the same role still counts. */
  readonly request = this.requested.asReadonly();

  open(roleId: string): void {
    this.requested.set({ id: roleId });
  }
}
