import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/stores";
import { CharacterSelector } from "@/components/CharacterSelector";
import { ChatView } from "@/components/ChatView";
import { MessageSquare } from "lucide-react";

export function Component() {
  const { activeCharacterId, setActiveCharacter } = useChatStore();
  const [sidebarWidth, setSidebarWidth] = useState(260);

  const handleSelectCharacter = (id: number) => {
    setActiveCharacter(id);
  };

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeCharacterId) {
        setActiveCharacter(null);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeCharacterId, setActiveCharacter]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Character Sidebar */}
      <div
        className="shrink-0 border-r bg-sidebar"
        style={{ width: activeCharacterId ? sidebarWidth : "100%" }}
      >
        <CharacterSelector
          selectedId={activeCharacterId}
          onSelect={handleSelectCharacter}
        />
      </div>

      {/* Main Chat Area */}
      {activeCharacterId ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatView characterId={activeCharacterId} />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-background">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">Select a Character</h3>
            <p className="text-sm text-muted-foreground">
              Choose a character from the sidebar to start chatting.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
