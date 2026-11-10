import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ModulePlaceholderProps {
  title: string;
  phase: string;
  summary: string;
  planned: string[];
}

/**
 * Explicit placeholder for a module that is not built yet. It deliberately
 * contains no interactive controls and writes no data.
 */
export function ModulePlaceholder({ title, phase, summary, planned }: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Badge variant="warning">Not implemented yet</Badge>
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{summary}</p>

      <Card>
        <CardHeader>
          <CardTitle>Planned for {phase}</CardTitle>
          <CardDescription>
            This screen is a placeholder. Nothing here is wired to the database or to an AI provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {planned.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="text-muted-foreground">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
