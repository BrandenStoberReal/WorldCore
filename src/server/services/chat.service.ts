import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { db } from '@/server/db/client';
import { chats } from '@/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getUserChatPath, getUserGroupChatPath } from '@/server/storage/paths';
import { readJsonl, writeJsonl, appendJsonlLine } from '@/server/storage/jsonl';
import { listFiles, removeFile, exists } from '@/server/storage/fs';
import { assertValidFileId } from '@/server/util/ids';
import type {
  ChatMetadata,
  ChatMessage,
  ChatInfo,
  SearchChatResult,
  RecentChat,
} from '@/shared/types/chat';

export class ChatService {
  async save(
    userId: string,
    characterName: string,
    userName: string = 'User',
    characterId?: number,
  ): Promise<string> {
    const fileId = randomUUID();
    const fileName = `${fileId}.jsonl`;
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, fileName);

    const metadata: ChatMetadata = {
      user_name: userName,
      character_name: characterName,
    };

    await writeJsonl<ChatMetadata | ChatMessage>(filePath, [metadata]);

    await db.insert(chats).values({
      fileId,
      fileName,
      characterId: characterId ?? null,
      groupId: null,
      fileSize: 0,
      messageCount: 0,
      lastMessage: '',
      lastMesDate: Date.now(),
      userId,
    });

    return fileId;
  }

  async getMessages(userId: string, fileId: string): Promise<ChatMessage[]> {
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    const allLines = await readJsonl<ChatMetadata | ChatMessage>(filePath);
    return allLines.slice(1) as ChatMessage[];
  }

  async getMetadata(userId: string, fileId: string): Promise<ChatMetadata | null> {
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    const allLines = await readJsonl<ChatMetadata | ChatMessage>(filePath);
    if (allLines.length === 0) return null;
    return allLines[0] as ChatMetadata;
  }

  async appendMessage(userId: string, fileId: string, message: ChatMessage): Promise<void> {
    assertValidFileId(fileId);
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    message.send_date = message.send_date || new Date().toISOString();
    await appendJsonlLine(filePath, message);
    await this.updateChatStats(userId, fileId);
  }

  async deleteMessage(userId: string, fileId: string, messageIndex: number): Promise<void> {
    assertValidFileId(fileId);
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    const allLines = await readJsonl<ChatMetadata | ChatMessage>(filePath);
    const metadata = allLines[0] as ChatMetadata;
    const messages = allLines.slice(1) as ChatMessage[];
    messages.splice(messageIndex, 1);
    await writeJsonl<ChatMetadata | ChatMessage>(filePath, [metadata, ...messages]);
    await this.updateChatStats(userId, fileId);
  }

  async editMessage(
    userId: string,
    fileId: string,
    messageIndex: number,
    updates: Partial<ChatMessage>,
  ): Promise<void> {
    assertValidFileId(fileId);
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    const allLines = await readJsonl<ChatMetadata | ChatMessage>(filePath);
    const messages = allLines.slice(1) as ChatMessage[];
    if (messageIndex < messages.length) {
      const original = messages[messageIndex]!;
      messages[messageIndex] = {
        name: updates.name ?? original.name,
        is_user: updates.is_user ?? original.is_user,
        mes: updates.mes ?? original.mes,
        send_date: updates.send_date ?? original.send_date,
        extra: updates.extra ?? original.extra,
        swipes: updates.swipes ?? original.swipes,
        swipes_data: updates.swipes_data ?? original.swipes_data,
        force_name2: updates.force_name2 ?? original.force_name2,
        is_system: updates.is_system ?? original.is_system,
      };
      await writeJsonl<ChatMetadata | ChatMessage>(filePath, [
        allLines[0] as ChatMetadata,
        ...messages,
      ]);
      await this.updateChatStats(userId, fileId);
    }
  }

  async rename(userId: string, fileId: string, newName: string): Promise<void> {
    assertValidFileId(fileId);
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    const allLines = await readJsonl<ChatMetadata | ChatMessage>(filePath);
    const metadata = allLines[0] as ChatMetadata;
    metadata.character_name = newName;
    await writeJsonl<ChatMetadata | ChatMessage>(filePath, [
      metadata,
      ...(allLines.slice(1) as ChatMessage[]),
    ]);
  }

  async delete(userId: string, fileId: string): Promise<void> {
    assertValidFileId(fileId);
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    await removeFile(filePath);
    await db.delete(chats).where(and(eq(chats.fileId, fileId), eq(chats.userId, userId)));
  }

  async listByCharacter(userId: string, characterName: string): Promise<ChatInfo[]> {
    const chatDir = getUserChatPath(userId);
    const files = await listFiles(chatDir, '.jsonl');
    const results: ChatInfo[] = [];

    for (const file of files) {
      const fileId = path.basename(file, '.jsonl');
      const filePath = path.join(chatDir, file);
      const stat = await fs.stat(filePath);
      const metadata = await this.getMetadata(userId, fileId);

      if (metadata && metadata.character_name === characterName) {
        const messages = await this.getMessages(userId, fileId);
        const lastMsg = messages[messages.length - 1];

        results.push({
          file_id: fileId,
          file_name: file,
          file_size: stat.size,
          chat_items: messages,
          mes: lastMsg?.mes?.slice(0, 100) || '',
          last_mes: lastMsg?.send_date || new Date(stat.mtimeMs).toISOString(),
          chat_metadata: metadata,
        });
      }
    }

    return results.sort((a, b) => {
      const aDate = new Date(a.last_mes).getTime();
      const bDate = new Date(b.last_mes).getTime();
      return bDate - aDate;
    });
  }

  async listAll(userId: string): Promise<ChatInfo[]> {
    const chatDir = getUserChatPath(userId);
    const files = await listFiles(chatDir, '.jsonl');
    const results: ChatInfo[] = [];

    for (const file of files) {
      const fileId = path.basename(file, '.jsonl');
      const filePath = path.join(chatDir, file);
      const stat = await fs.stat(filePath);
      const messages = await this.getMessages(userId, fileId);
      const metadata = await this.getMetadata(userId, fileId);
      const lastMsg = messages[messages.length - 1];

      results.push({
        file_id: fileId,
        file_name: file,
        file_size: stat.size,
        chat_items: messages,
        mes: lastMsg?.mes?.slice(0, 100) || '',
        last_mes: lastMsg?.send_date || new Date(stat.mtimeMs).toISOString(),
        chat_metadata: metadata || undefined,
      });
    }

    return results.sort((a, b) => {
      const aDate = new Date(a.last_mes).getTime();
      const bDate = new Date(b.last_mes).getTime();
      return bDate - aDate;
    });
  }

  async search(userId: string, query: string): Promise<SearchChatResult[]> {
    const chatDir = getUserChatPath(userId);
    const files = await listFiles(chatDir, '.jsonl');
    const results: SearchChatResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const file of files) {
      const fileId = path.basename(file, '.jsonl');
      const messages = await this.getMessages(userId, fileId);

      const match = messages.find((m) => m.mes.toLowerCase().includes(lowerQuery));
      if (match) {
        results.push({
          file_id: fileId,
          file_name: file,
          match: match.mes.slice(0, 200),
        });
      }
    }

    return results;
  }

  async getRecent(userId: string, limit: number = 10): Promise<RecentChat[]> {
    const chatDir = getUserChatPath(userId);
    const files = await listFiles(chatDir, '.jsonl');
    const recent: Array<{ file: string; mtime: number }> = [];

    for (const file of files) {
      const filePath = path.join(chatDir, file);
      try {
        const stat = await fs.stat(filePath);
        recent.push({ file, mtime: stat.mtimeMs });
      } catch {
        // Skip unreadable files
      }
    }

    recent.sort((a, b) => b.mtime - a.mtime);

    return recent.slice(0, limit).map((r) => {
      const fileId = path.basename(r.file, '.jsonl');
      return {
        file_id: fileId,
        file_name: r.file,
        last_mes: new Date(r.mtime).toISOString(),
        send_date: new Date(r.mtime).toISOString(),
      };
    });
  }

  async exportJsonl(userId: string, fileId: string): Promise<{ data: Buffer; fileName: string }> {
    assertValidFileId(fileId);
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, `${fileId}.jsonl`);
    const data = await fs.readFile(filePath);
    return { data: Buffer.from(data), fileName: `${fileId}.jsonl` };
  }

  async exportText(userId: string, fileId: string): Promise<{ data: Buffer; fileName: string }> {
    assertValidFileId(fileId);
    const messages = await this.getMessages(userId, fileId);
    const text = messages.map((m) => `${m.name}: ${m.mes}`).join('\n\n');
    return { data: Buffer.from(text), fileName: `${fileId}.txt` };
  }

  async saveImported(
    userId: string,
    messages: ChatMessage[],
    characterName: string,
    userName: string,
    groupId?: string,
  ): Promise<string> {
    const fileId = randomUUID();
    const fileName = `${fileId}.jsonl`;
    const chatDir = getUserChatPath(userId);
    const filePath = path.join(chatDir, fileName);

    const metadata: ChatMetadata = {
      user_name: userName,
      character_name: characterName,
    };
    if (groupId) {
      (metadata as Record<string, unknown>).group = groupId;
    }

    await writeJsonl<ChatMetadata | ChatMessage>(filePath, [metadata, ...messages]);
    await this.updateChatStats(userId, fileId);

    return fileId;
  }

  async saveGroupMessage(userId: string, groupId: string, message: ChatMessage): Promise<void> {
    const groupChat = await db
      .select()
      .from(chats)
      .where(and(eq(chats.groupId, groupId), eq(chats.userId, userId)))
      .orderBy(desc(chats.lastMesDate))
      .limit(1);

    if (groupChat.length === 0) {
      const fileId = randomUUID();
      const fileName = `${fileId}.jsonl`;
      const groupChatDir = getUserGroupChatPath(userId);
      const filePath = path.join(groupChatDir, fileName);

      const metadata: ChatMetadata = {
        user_name: 'User',
        character_name: `Group: ${groupId}`,
      };
      (metadata as Record<string, unknown>).group = groupId;

      await writeJsonl<ChatMetadata | ChatMessage>(filePath, [metadata, message]);

      await db.insert(chats).values({
        fileId,
        fileName,
        groupId,
        fileSize: 0,
        messageCount: 1,
        lastMessage: message.mes.slice(0, 100),
        lastMesDate: Date.now(),
        userId,
      });
    } else {
      const existing = groupChat[0]!;
      const groupChatDir = getUserGroupChatPath(userId);
      const filePath = path.join(groupChatDir, `${existing.fileId}.jsonl`);
      await appendJsonlLine(filePath, message);
      await this.updateChatStats(userId, existing.fileId);
    }
  }

  async listGroupChats(userId: string, groupId: string): Promise<ChatInfo[]> {
    const groupChatDir = getUserGroupChatPath(userId);
    const files = await listFiles(groupChatDir, '.jsonl');
    const results: ChatInfo[] = [];

    for (const file of files) {
      const fileId = path.basename(file, '.jsonl');
      const filePath = path.join(groupChatDir, file);
      const stat = await fs.stat(filePath);
      const metadata = await this.getMetadataFromPath(filePath);

      if (
        metadata &&
        typeof (metadata as Record<string, unknown>).group === 'string' &&
        (metadata as Record<string, unknown>).group === groupId
      ) {
        const messages = await this.getMessagesFromPath(filePath);
        const lastMsg = messages[messages.length - 1];

        results.push({
          file_id: fileId,
          file_name: file,
          file_size: stat.size,
          chat_items: messages,
          mes: lastMsg?.mes?.slice(0, 100) || '',
          last_mes: lastMsg?.send_date || new Date(stat.mtimeMs).toISOString(),
          chat_metadata: metadata,
        });
      }
    }

    return results;
  }

  private async getMetadataFromPath(filePath: string): Promise<ChatMetadata | null> {
    const allLines = await readJsonl<ChatMetadata | ChatMessage>(filePath);
    if (allLines.length === 0) return null;
    return allLines[0] as ChatMetadata;
  }

  private async getMessagesFromPath(filePath: string): Promise<ChatMessage[]> {
    const allLines = await readJsonl<ChatMetadata | ChatMessage>(filePath);
    return allLines.slice(1) as ChatMessage[];
  }

  private async updateChatStats(userId: string, fileId: string): Promise<void> {
    const chatDir = getUserChatPath(userId);
    const groupChatDir = getUserGroupChatPath(userId);

    const chatFile = path.join(chatDir, `${fileId}.jsonl`);
    const groupChatFile = path.join(groupChatDir, `${fileId}.jsonl`);

    let filePath: string | null = null;
    if (await exists(chatFile)) filePath = chatFile;
    else if (await exists(groupChatFile)) filePath = groupChatFile;

    if (!filePath) return;

    const stat = await fs.stat(filePath);
    const msgs = await this.getMessagesFromPath(filePath);
    const lastMsg = msgs[msgs.length - 1];

    await db
      .update(chats)
      .set({
        fileSize: stat.size,
        messageCount: msgs.length,
        lastMessage: lastMsg?.mes?.slice(0, 100) || '',
        lastMesDate: Date.now(),
      })
      .where(eq(chats.fileId, fileId));
  }
}

export const chatService = new ChatService();
