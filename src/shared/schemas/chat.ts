import { z } from 'zod';

export const ChatMetadataSchema = z
  .object({
    integrity: z.boolean().optional(),
    group: z.unknown().optional(),
    agent_avatar: z.string().optional(),
    typing: z.boolean().optional(),
    custom: z.unknown().optional(),
    user_name: z.string(),
    character_name: z.string(),
  })
  .catchall(z.unknown());

export const ChatMessageSchema = z
  .object({
    name: z.string(),
    is_user: z.boolean(),
    send_date: z.string().datetime().optional(),
    mes: z.string(),
    extra: z
      .object({
        name2: z.string().optional(),
        swipes: z.array(z.string()).optional(),
        swipes_data: z.array(z.unknown()).optional(),
        currentSwipe: z.number().optional(),
        isGroup: z.boolean().optional(),
        isMesExample: z.boolean().optional(),
      })
      .catchall(z.unknown()),
    swipes: z.array(z.string()).optional(),
    swipes_data: z.array(z.unknown()).optional(),
    force_name2: z.string().optional(),
    is_system: z.boolean().optional(),
  })
  .catchall(z.unknown());

export const ChatInfoSchema = z.object({
  file_id: z.string(),
  file_name: z.string(),
  file_size: z.number(),
  chat_items: z.array(ChatMessageSchema),
  mes: z.string(),
  last_mes: z.string(),
  chat_metadata: ChatMetadataSchema.optional(),
  match: z.unknown().optional(),
});

export const SearchChatResultSchema = z.object({
  file_id: z.string(),
  file_name: z.string(),
  match: z.string(),
});

export const RecentChatSchema = z.object({
  file_id: z.string(),
  file_name: z.string(),
  last_mes: z.string(),
  send_date: z.string().datetime().optional(),
});

export const ChatImportFormatSchema = z.enum([
  'tavern',
  'venicewatch',
  'agitchat',
  'chathub',
  'messenger',
  'unknown',
]);
