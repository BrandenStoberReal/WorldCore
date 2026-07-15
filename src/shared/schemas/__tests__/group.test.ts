import { describe, expect, it } from 'bun:test';
import { GroupSchema, GroupCreateInputSchema } from '@/shared/schemas/group';

describe('Group parsing', () => {
  it('parses valid group', () => {
    const result = GroupSchema.safeParse({
      id: 'group_001',
      name: 'Test Group',
      members: ['char_001', 'char_002', 'char_003'],
      avatar_url: 'group_avatar.png',
      allow_self_responses: false,
      activation_strategy: 1,
      generation_mode: 0,
      disabled_members: [],
      fav: true,
      chat_id: 'chat_001',
      chats: ['chat_001', 'chat_002'],
      auto_mode_delay: 5,
      generation_mode_join_prefix: '[Joins]',
      generation_mode_join_suffix: '[Leaves]',
      date_added: '2024-01-15T10:00:00.000Z',
      create_date: '2024-01-15T10:00:00.000Z',
      date_last_chat: '2024-01-16T12:00:00.000Z',
      chat_size: 2048,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('group_001');
      expect(result.data.name).toBe('Test Group');
      expect(result.data.members.length).toBe(3);
      expect(result.data.fav).toBe(true);
    }
  });

  it('parses group with minimal fields using defaults', () => {
    const result = GroupSchema.safeParse({
      id: 'group_002',
      name: 'Minimal Group',
      members: ['char_001'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activation_strategy).toBe(0);
      expect(result.data.disabled_members).toEqual([]);
      expect(result.data.fav).toBe(false);
    }
  });
});

describe('GroupCreateInput parsing', () => {
  it('parses valid create input', () => {
    const result = GroupCreateInputSchema.safeParse({
      name: 'New Group',
      members: ['char_001', 'char_002'],
      avatar_url: 'new_avatar.png',
      activation_strategy: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('New Group');
      expect(result.data.members.length).toBe(2);
    }
  });

  it('rejects missing required fields', () => {
    const result = GroupCreateInputSchema.safeParse({
      name: 'Incomplete',
    });
    expect(result.success).toBe(false);
  });
});
