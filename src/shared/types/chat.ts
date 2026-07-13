import type { z } from "zod";
import {
  ChatMetadataSchema,
  ChatMessageSchema,
  ChatInfoSchema,
  SearchChatResultSchema,
  RecentChatSchema,
  ChatImportFormatSchema,
} from "@/shared/schemas/chat";

export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatInfo = z.infer<typeof ChatInfoSchema>;
export type SearchChatResult = z.infer<typeof SearchChatResultSchema>;
export type RecentChat = z.infer<typeof RecentChatSchema>;
export type ChatImportFormat = z.infer<typeof ChatImportFormatSchema>;
