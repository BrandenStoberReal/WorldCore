import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { ChatMetadataSchema, ChatMessageSchema, ChatInfoSchema } from '@/shared/schemas/chat';

describe('ChatMetadata parsing', () => {
  it('parses valid chat metadata', () => {
    const result = ChatMetadataSchema.safeParse({
      user_name: 'TestUser',
      character_name: 'TestChar',
      integrity: true,
      typing: false,
      agent_avatar: 'avatar.png',
      custom_field: 'preserved',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user_name).toBe('TestUser');
      expect(result.data.character_name).toBe('TestChar');
      const rawData = result.data as Record<string, unknown>;
      expect(rawData.custom_field).toBe('preserved');
    }
  });

  it('rejects missing required fields', () => {
    const result = ChatMetadataSchema.safeParse({
      user_name: 'TestUser',
    });
    expect(result.success).toBe(false);
  });
});

describe('ChatMessage parsing', () => {
  it('parses valid chat message from fixture', () => {
    const jsonl = readFileSync('tests/fixtures/chats/sample.jsonl', 'utf-8');
    const lines = jsonl.trim().split('\n');
    const firstLine = JSON.parse(lines[0]!);

    const result = ChatMessageSchema.safeParse(firstLine);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('User');
      expect(result.data.is_user).toBe(true);
      expect(result.data.mes).toBe('Hello there!');
    }
  });

  it('parses message with extra fields', () => {
    const result = ChatMessageSchema.safeParse({
      name: 'TestChar',
      is_user: false,
      mes: 'Hello!',
      send_date: '2024-01-15T10:30:05.000Z',
      extra: {
        name2: 'TestChar',
        swipes: ['swipe1'],
        currentSwipe: 0,
        isGroup: false,
        custom_extra: 'preserved',
      },
      swipes: ['swipe1'],
      force_name2: 'TestChar',
      is_system: false,
      unknown_field: 'preserved',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra.name2).toBe('TestChar');
      const rawData = result.data as Record<string, unknown>;
      expect(rawData.unknown_field).toBe('preserved');
    }
  });
});

describe('ChatInfo parsing', () => {
  it('parses valid chat info', () => {
    const result = ChatInfoSchema.safeParse({
      file_id: 'chat_001',
      file_name: 'sample_chat.txt',
      file_size: 1024,
      chat_items: [
        {
          name: 'User',
          is_user: true,
          mes: 'Hello',
          extra: {},
        },
      ],
      mes: 'Hello',
      last_mes: 'Hello',
      chat_metadata: {
        user_name: 'TestUser',
        character_name: 'TestChar',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.file_id).toBe('chat_001');
      expect(result.data.chat_items.length).toBe(1);
    }
  });
});
