import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, surfaceCard } from '@/lib/utils';
import { apiPost } from '@/lib/api';
import { Database, Server, FileJson, ArrowRight, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type BackendChoice = 'sqlite' | 'mongodb' | 'jsonfiles';

const BACKENDS: Array<{
  id: BackendChoice;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}> = [
  {
    id: 'sqlite',
    label: 'SQLite',
    description: 'Embedded database. Fast, reliable, zero setup. Recommended for most users.',
    icon: Database,
    recommended: true,
  },
  {
    id: 'mongodb',
    label: 'MongoDB',
    description: 'External MongoDB server. Requires a running MongoDB instance.',
    icon: Server,
  },
  {
    id: 'jsonfiles',
    label: 'JSON Files',
    description: 'Plain JSON files on disk. Simple but slower for large datasets.',
    icon: FileJson,
  },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'backend' | 'persona'>('backend');
  const [selected, setSelected] = useState<BackendChoice>('sqlite');
  const [mongodbUri, setMongodbUri] = useState('mongodb://localhost:27017/worldcore');
  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (selected === 'mongodb' && !mongodbUri.trim()) {
      setError('MongoDB URI is required');
      return;
    }
    setError(null);
    setStep('persona');
  };

  const handleBack = () => {
    setError(null);
    setStep('backend');
  };

  const handleSubmit = async () => {
    if (!personaName.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiPost('/onboarding/complete', {
        backend: selected,
        mongodbUri: selected === 'mongodb' ? mongodbUri : undefined,
        personaName: personaName.trim(),
        personaDescription: personaDescription.trim(),
      });
      onComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="display-host text-3xl font-semibold tracking-tight">
            Welcome to WorldCore
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">
            {step === 'backend'
              ? "Choose how you'd like to store your data. You can change this later in settings."
              : 'Set up your user persona. This is how the AI will know who you are.'}
          </p>
        </div>

        {step === 'backend' && (
          <div className="space-y-3">
            {BACKENDS.map((backend) => {
              const Icon = backend.icon;
              const isSelected = selected === backend.id;

              return (
                <Card
                  key={backend.id}
                  className={cn(
                    surfaceCard,
                    'cursor-pointer rounded-md transition-all',
                    isSelected && 'ring-ember/50 ring-2',
                    'hover:border-border/80',
                  )}
                  onClick={() => setSelected(backend.id)}
                >
                  <CardContent className="flex items-start gap-4 px-4 py-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                        isSelected
                          ? 'bg-ember/10 text-ember'
                          : 'bg-accent/40 text-muted-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">{backend.label}</span>
                        {backend.recommended && (
                          <span className="mono-tag bg-ember/15 text-ember text-[10px]">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">
                        {backend.description}
                      </p>

                      {backend.id === 'mongodb' && isSelected && (
                        <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <Label htmlFor="mongodb-uri" className="text-foreground/80 text-[12px]">
                            Connection URI
                          </Label>
                          <Input
                            id="mongodb-uri"
                            value={mongodbUri}
                            onChange={(e) => setMongodbUri(e.target.value)}
                            placeholder="mongodb://localhost:27017/worldcore"
                            className="h-8 rounded-md text-[13px]"
                          />
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        'mt-1 h-4 w-4 shrink-0 rounded-full border-2',
                        isSelected ? 'border-ember bg-ember' : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && (
                        <div className="flex h-full items-center justify-center">
                          <div className="bg-background h-1.5 w-1.5 rounded-full" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {step === 'persona' && (
          <div className="space-y-4">
            <Card className={cn(surfaceCard, 'rounded-md')}>
              <CardContent className="space-y-4 px-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="persona-name" className="text-foreground text-sm font-medium">
                    Your Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="persona-name"
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    placeholder="What should the AI call you?"
                    className="h-9 rounded-md text-[13px]"
                    autoFocus
                  />
                  <p className="text-muted-foreground text-[12px]">
                    This becomes your user persona name in chats.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="persona-description"
                    className="text-foreground text-sm font-medium"
                  >
                    Description{' '}
                    <span className="text-muted-foreground text-[12px]">(optional)</span>
                  </Label>
                  <Textarea
                    id="persona-description"
                    value={personaDescription}
                    onChange={(e) => setPersonaDescription(e.target.value)}
                    placeholder="Physical appearance, personality, background..."
                    rows={4}
                    className="rounded-md text-[13px]"
                  />
                  <p className="text-muted-foreground text-[12px]">
                    Helps the AI understand who you are. Used in prompt context via persona macro.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <div className="border-destructive/40 bg-destructive/5 rounded-md border p-3">
            <p className="text-destructive text-[13px]">{error}</p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          {step === 'persona' && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="h-10 rounded-md px-6 text-[13px] font-medium"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back
            </Button>
          )}

          {step === 'backend' ? (
            <Button
              onClick={handleNext}
              className="bg-ember hover:bg-ember/90 h-10 rounded-md px-8 text-[13px] font-medium"
            >
              Next
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !personaName.trim()}
              className="bg-ember hover:bg-ember/90 h-10 rounded-md px-8 text-[13px] font-medium"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Starting...</span>
                </>
              ) : (
                <span>Get Started</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
