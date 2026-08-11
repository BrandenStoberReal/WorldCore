import { describe, it, expect } from 'bun:test';
import { parseOutfitChanges } from '@/server/services/outfit-analyzer';

const emptyOutfit: Record<string, string> = {
  head: '',
  face: '',
  neck: '',
  undergarment_top: '',
  torso_top: '',
  torso_outer: '',
  arms: '',
  hands: '',
  undergarment_bottom: '',
  lower_body: '',
  legs: '',
  socks: '',
  feet: '',
  accessories: '',
};

describe('parseOutfitChanges', () => {
  describe('single changes', () => {
    it('parses PUT_ON action', () => {
      const result = parseOutfitChanges('PUT_ON("leather jacket") SLOT(torso_outer)', emptyOutfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        slot: 'torso_outer',
        action: 'add',
        description: 'leather jacket',
      });
      expect(result.updatedOutfit.torso_outer).toBe('leather jacket');
    });

    it('parses TAKE_OFF action', () => {
      const outfit = { ...emptyOutfit, head: 'hat' };
      const result = parseOutfitChanges('TAKE_OFF("hat") SLOT(head)', outfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        slot: 'head',
        action: 'remove',
        description: '',
      });
      expect(result.updatedOutfit.head).toBe('');
    });

    it('parses CHANGE action', () => {
      const outfit = { ...emptyOutfit, torso_top: 'blue shirt' };
      const result = parseOutfitChanges('CHANGE("red dress") SLOT(torso_top)', outfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        slot: 'torso_top',
        action: 'change',
        description: 'red dress',
      });
      expect(result.updatedOutfit.torso_top).toBe('red dress');
    });
  });

  describe('multiple changes', () => {
    it('parses multiple actions on separate lines', () => {
      const response = `TAKE_OFF("jacket") SLOT(torso_outer)
PUT_ON("scarf") SLOT(neck)`;
      const result = parseOutfitChanges(response, emptyOutfit);
      expect(result.changes).toHaveLength(2);
      expect(result.changes[0]?.slot).toBe('torso_outer');
      expect(result.changes[0]?.action).toBe('remove');
      expect(result.changes[1]?.slot).toBe('neck');
      expect(result.changes[1]?.action).toBe('add');
    });

    it('parses three actions', () => {
      const response = `TAKE_OFF("hat") SLOT(head)
TAKE_OFF("jacket") SLOT(torso_outer)
PUT_ON("gloves") SLOT(arms)`;
      const result = parseOutfitChanges(response, emptyOutfit);
      expect(result.changes).toHaveLength(3);
    });
  });

  describe('NO_CHANGE', () => {
    it('returns empty changes for NO_CHANGE', () => {
      const result = parseOutfitChanges('NO_CHANGE', emptyOutfit);
      expect(result.changes).toHaveLength(0);
      expect(result.updatedOutfit).toEqual(emptyOutfit);
    });

    it('ignores NO_CHANGE when real changes exist', () => {
      const response = `PUT_ON("hat") SLOT(head)
NO_CHANGE`;
      const result = parseOutfitChanges(response, emptyOutfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.slot).toBe('head');
    });
  });

  describe('case insensitivity', () => {
    it('parses lowercase actions', () => {
      const result = parseOutfitChanges('put_on("hat") SLOT(head)', emptyOutfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.action).toBe('add');
    });

    it('parses mixed case actions', () => {
      const result = parseOutfitChanges('Put_On("hat") SLOT(head)', emptyOutfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.action).toBe('add');
    });

    it('parses lowercase slot names', () => {
      const result = parseOutfitChanges('PUT_ON("hat") SLOT(Head)', emptyOutfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.slot).toBe('head');
    });
  });

  describe('flexible whitespace', () => {
    it('handles spaces around parentheses', () => {
      const result = parseOutfitChanges('PUT_ON ( "hat" ) SLOT ( head )', emptyOutfit);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.slot).toBe('head');
    });

    it('handles extra spaces in description', () => {
      const result = parseOutfitChanges(
        'PUT_ON("  leather jacket  ") SLOT(torso_outer)',
        emptyOutfit,
      );
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.description).toBe('  leather jacket  ');
    });
  });

  describe('all valid slots', () => {
    const slots = [
      'head',
      'face',
      'neck',
      'undergarment_top',
      'torso_top',
      'torso_outer',
      'arms',
      'hands',
      'undergarment_bottom',
      'lower_body',
      'legs',
      'socks',
      'feet',
      'accessories',
    ];

    for (const slot of slots) {
      it(`accepts slot: ${slot}`, () => {
        const result = parseOutfitChanges(`PUT_ON("test") SLOT(${slot})`, emptyOutfit);
        expect(result.changes).toHaveLength(1);
        expect(result.changes[0]?.slot).toBe(slot);
      });
    }
  });

  describe('invalid input handling', () => {
    it('ignores invalid slot names', () => {
      const result = parseOutfitChanges('PUT_ON("hat") SLOT(invalid_slot)', emptyOutfit);
      expect(result.changes).toHaveLength(0);
    });

    it('ignores malformed lines', () => {
      const result = parseOutfitChanges('This is not a valid format', emptyOutfit);
      expect(result.changes).toHaveLength(0);
    });

    it('ignores empty lines', () => {
      const result = parseOutfitChanges('\n\n\n', emptyOutfit);
      expect(result.changes).toHaveLength(0);
    });

    it('ignores lines with missing parts', () => {
      const result = parseOutfitChanges('PUT_ON("hat")', emptyOutfit);
      expect(result.changes).toHaveLength(0);
    });
  });

  describe('outfit state updates', () => {
    it('adds item to empty outfit', () => {
      const result = parseOutfitChanges('PUT_ON("boots") SLOT(feet)', emptyOutfit);
      expect(result.updatedOutfit.feet).toBe('boots');
    });

    it('removes item from outfit', () => {
      const outfit = { ...emptyOutfit, feet: 'boots' };
      const result = parseOutfitChanges('TAKE_OFF("boots") SLOT(feet)', outfit);
      expect(result.updatedOutfit.feet).toBe('');
    });

    it('replaces item in outfit', () => {
      const outfit = { ...emptyOutfit, feet: 'boots' };
      const result = parseOutfitChanges('CHANGE("sandals") SLOT(feet)', outfit);
      expect(result.updatedOutfit.feet).toBe('sandals');
    });

    it('preserves other outfit items', () => {
      const outfit = { ...emptyOutfit, head: 'hat', torso_top: 'shirt' };
      const result = parseOutfitChanges('PUT_ON("jacket") SLOT(torso_outer)', outfit);
      expect(result.updatedOutfit.head).toBe('hat');
      expect(result.updatedOutfit.torso_top).toBe('shirt');
      expect(result.updatedOutfit.torso_outer).toBe('jacket');
    });
  });
});
