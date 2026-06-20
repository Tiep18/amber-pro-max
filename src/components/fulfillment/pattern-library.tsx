import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {CustomerPatternLibraryItem} from '@/fulfillment/account-queries';
import {PatternLibraryCard} from './pattern-library-card';

type Labels = {
  title: string;
  empty: string;
  purchases: string;
  latest: string;
  download: string;
  inactive: string;
};

export function PatternLibrary({patterns, labels}: {patterns: CustomerPatternLibraryItem[]; labels: Labels}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{labels.empty}</p>
        ) : (
          <div className="grid gap-3">
            {patterns.map((pattern) => (
              <PatternLibraryCard key={pattern.productId} pattern={pattern} labels={labels} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
