import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Globe, Loader2 } from "lucide-react";

interface StatsResponse {
  characters?: number;
  chats?: number;
  worldinfo?: number;
  [key: string]: unknown;
}

function StatsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value !== undefined ? value : "\u2014"}
        </div>
      </CardContent>
    </Card>
  );
}

export function Component() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/v1/stats/get"],
    queryFn: async () => {
      const res = await fetch("/api/v1/stats/get");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const { data: characters } = useQuery({
    queryKey: ["/api/v1/characters/all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/characters/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shallow: true }),
      });
      if (!res.ok) throw new Error("Failed to fetch characters");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const { data: chats } = useQuery({
    queryKey: ["/api/v1/chats/all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/chats/all");
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const { data: worldinfo } = useQuery({
    queryKey: ["/api/v1/worldinfo/all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/worldinfo/all");
      if (!res.ok) throw new Error("Failed to fetch worldinfo");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const charCount = Array.isArray(characters) ? characters.length : 0;
  const chatCount = Array.isArray(chats) ? chats.length : 0;
  const wiCount = Array.isArray(worldinfo) ? worldinfo.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your SlopForge workspace
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Characters" value={charCount} icon={Users} />
        <StatsCard title="Chats" value={chatCount} icon={MessageSquare} />
        <StatsCard title="World Info" value={wiCount} icon={Globe} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate({ to: "/characters" })}
            >
              <Users className="mr-2 h-4 w-4" />
              Browse Characters
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate({ to: "/chats" })}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Browse Chats
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate({ to: "/worldinfo" })}
            >
              <Globe className="mr-2 h-4 w-4" />
              Browse World Info
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Characters</CardTitle>
          </CardHeader>
          <CardContent>
            {charCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                No characters yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {Array.isArray(characters) &&
                  characters
                    .slice(0, 5)
                    .map((c: { id: number; name: string }) => (
                      <li
                        key={c.id}
                        className="text-sm cursor-pointer hover:underline"
                        onClick={() => navigate({ to: "/characters" })}
                      >
                        {c.name}
                      </li>
                    ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
