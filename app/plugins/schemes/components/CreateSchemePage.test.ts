import { describe, expect, it } from 'vitest';

import {
  getSchemeTermCalendarSetupMessage,
  SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE,
} from './CreateSchemePage';

const incompleteTerm = { is_calendar_setup_complete: false };
const completeTerm = { is_calendar_setup_complete: true };

describe('create scheme term calendar setup copy', () => {
  it('keeps institution teacher wording when the term calendar is incomplete', () => {
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: incompleteTerm,
      selfManagedTeachingAdmin: false,
      isTeachingActor: true,
    })).toBe('Your admin needs to complete the term calendar before schemes can be generated.');
  });

  it('uses owner wording for self-managed teaching workspaces', () => {
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: incompleteTerm,
      selfManagedTeachingAdmin: true,
      isTeachingActor: true,
    })).toBe(SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE);
  });

  it('does not show a prerequisite error once the calendar setup is complete', () => {
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: completeTerm,
      selfManagedTeachingAdmin: true,
      isTeachingActor: true,
    })).toBeNull();
  });
});
