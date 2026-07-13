import { User, Bot } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/shared/types/chat";

interface ChatMessageProps {
  msg: ChatMessageType;
  characterAvatar?: string;
}

export function ChatMessage({ msg, characterAvatar }: ChatMessageProps) {
  const isUser = msg.is_user;

  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          {characterAvatar ? (
            <img
              src={characterAvatar}
              alt={msg.name}
              className="h-8 w-8 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Bot className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="max-w-[75%]">
        <div className="flex items-center gap-1.5 mb-1">
          {isUser ? (
            <User className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Bot className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-muted-foreground">{msg.name}</span>
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{msg.mes}</p>
        </div>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <User className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  );
}
