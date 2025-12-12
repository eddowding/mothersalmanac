import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function WikiPageSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Title Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-12 w-3/4 bg-almanac-cream-200" />
        <Skeleton className="h-6 w-1/2 bg-almanac-cream-100" />
      </div>

      {/* Metadata Bar */}
      <div className="flex items-center gap-4 pb-4 border-b border-border">
        <Skeleton className="h-5 w-32 bg-almanac-sage-200" />
        <Skeleton className="h-5 w-24 bg-almanac-sage-200" />
        <Skeleton className="h-5 w-28 bg-almanac-sage-200" />
      </div>

      {/* Content Paragraphs */}
      <div className="space-y-6">
        {/* First paragraph */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-5/6 bg-almanac-cream-200" />
        </div>

        {/* Section heading */}
        <Skeleton className="h-8 w-2/3 bg-almanac-earth-100" />

        {/* Second paragraph */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-4/5 bg-almanac-cream-200" />
          <Skeleton className="h-4 w-11/12 bg-almanac-cream-200" />
        </div>

        {/* Infobox or card */}
        <Card className="p-6 bg-almanac-cream-50">
          <Skeleton className="h-6 w-40 mb-4 bg-almanac-sage-200" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-almanac-sage-100" />
            <Skeleton className="h-4 w-full bg-almanac-sage-100" />
            <Skeleton className="h-4 w-3/4 bg-almanac-sage-100" />
          </div>
        </Card>

        {/* Third paragraph */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-2/3 bg-almanac-cream-200" />
        </div>

        {/* Another section */}
        <Skeleton className="h-8 w-1/2 bg-almanac-earth-100" />

        {/* Final paragraph */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-full bg-almanac-cream-200" />
          <Skeleton className="h-4 w-3/5 bg-almanac-cream-200" />
        </div>
      </div>

      {/* Related Links Section */}
      <div className="space-y-4 pt-6 border-t border-border">
        <Skeleton className="h-6 w-32 bg-almanac-earth-100" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 bg-almanac-sage-100 rounded-md" />
          <Skeleton className="h-10 bg-almanac-sage-100 rounded-md" />
          <Skeleton className="h-10 bg-almanac-sage-100 rounded-md" />
          <Skeleton className="h-10 bg-almanac-sage-100 rounded-md" />
        </div>
      </div>
    </div>
  );
}
