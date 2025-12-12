import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ChatSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <Card className="max-w-[80%] p-4 bg-almanac-sage-100 border-almanac-sage-300">
          <Skeleton className="h-4 w-64 bg-almanac-sage-300" />
        </Card>
      </div>

      {/* AI response skeleton */}
      <div className="flex justify-start">
        <Card className="max-w-[85%] p-4 bg-card border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-6 w-6 rounded-full bg-almanac-sage-300" />
              <Skeleton className="h-4 w-32 bg-almanac-cream-200" />
            </div>
            <Skeleton className="h-4 w-full bg-almanac-cream-200" />
            <Skeleton className="h-4 w-full bg-almanac-cream-200" />
            <Skeleton className="h-4 w-3/4 bg-almanac-cream-200" />
            <div className="pt-2">
              <Skeleton className="h-3 w-24 bg-almanac-sage-200" />
            </div>
          </div>
        </Card>
      </div>

      {/* Typing indicator */}
      <div className="flex justify-start">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Skeleton className="h-2 w-2 rounded-full bg-almanac-sage-400 animate-pulse" />
              <Skeleton
                className="h-2 w-2 rounded-full bg-almanac-sage-400 animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <Skeleton
                className="h-2 w-2 rounded-full bg-almanac-sage-400 animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Consulting the almanac...
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
