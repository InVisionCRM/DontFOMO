import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_DISPLAY_NAME,
  displayNameFromHandle,
} from '../src/engine/profile/displayName';

describe('displayNameFromHandle', () => {
  it('title-cases slug handles', () => {
    expect(displayNameFromHandle('@john_doe')).toBe('John Doe');
  });

  it('handles bare slugs without @', () => {
    expect(displayNameFromHandle('ape_king')).toBe('Ape King');
  });

  it('returns default for pre-onboarding handle', () => {
    expect(displayNameFromHandle('@new_player')).toBe(DEFAULT_DISPLAY_NAME);
  });
});
