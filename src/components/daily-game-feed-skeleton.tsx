import { Skeleton } from "./ui/skeleton";

/*
The score strip's shape before the strip itself exists — the Suspense fallback
the prerendered routes render in its place. Once the feed is mounted it shows
its own loading state, with the date controls live and the tiles as skeletons;
this stands in only for the moment before that, so the two are deliberately
close but not the same markup.

It lives in its own module rather than beside the feed so that the shell can
render it without importing the feed: `main-layout.tsx` loads the feed through
`next/dynamic` precisely to keep the game tiles, the scroll area and the date
picker's calendar out of the bundle every route downloads, and a static import
of a sibling export would pull all of it back in.

The geometry mirrors the real strip — a 36px nav row over a 74px tile row —
because this stands in for it on the prerendered routes, where the page's HTML
is built before the feed exists. Matching the heights is what keeps the strip
filling in from shifting the page under it.
*/
export default function DailyGameFeedSkeleton() {
  return (
    <div className="m-2">
      <div className="flex items-center justify-center gap-1 text-center">
        <Skeleton className="size-9 shrink-0 rounded-md" />
        <Skeleton className="h-9 w-[144px] rounded-md sm:w-[200px]" />
        <Skeleton className="size-9 shrink-0 rounded-md" />
      </div>
      <div className="mt-2 flex gap-2 py-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] w-[80px] shrink-0 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
