import { describe, it, expect, beforeEach } from 'bun:test';
import { useNavStore } from '../src/lib/navStore';

describe('useNavStore', () => {
  beforeEach(() => {
    useNavStore.setState({
      sectionId: 'welcome',
      topDrawer: null,
      charactersOpen: false,
    });
  });

  it('defaults to welcome section with no drawers open', () => {
    const state = useNavStore.getState();
    expect(state.sectionId).toBe('welcome');
    expect(state.topDrawer).toBeNull();
    expect(state.charactersOpen).toBe(false);
  });

  it('openSection sets sectionId', () => {
    useNavStore.getState().openSection('characters');
    expect(useNavStore.getState().sectionId).toBe('characters');
  });

  it('openTopDrawer is mutually exclusive (last wins)', () => {
    useNavStore.getState().openTopDrawer('worldinfo');
    expect(useNavStore.getState().topDrawer).toBe('worldinfo');
    useNavStore.getState().openTopDrawer('extensions');
    expect(useNavStore.getState().topDrawer).toBe('extensions');
  });

  it('top drawer and characters sidebar are independent', () => {
    useNavStore.getState().openTopDrawer('settings');
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().topDrawer).toBe('settings');
    expect(useNavStore.getState().charactersOpen).toBe(true);
  });

  it('closeTopDrawer sets topDrawer to null', () => {
    useNavStore.getState().openTopDrawer('worldinfo');
    useNavStore.getState().closeTopDrawer();
    expect(useNavStore.getState().topDrawer).toBeNull();
  });

  it('toggleCharacters toggles characters sidebar', () => {
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(true);
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(false);
  });

  it('openSection welcome returns to welcome from any section', () => {
    useNavStore.getState().openSection('characters');
    useNavStore.getState().openSection('welcome');
    expect(useNavStore.getState().sectionId).toBe('welcome');
  });
});
