/**
 * Deliberately invisible. Its only job is to give Next.js a Suspense
 * boundary under the analytics tab bar, so the four dynamic dashboard
 * routes can be prefetched (layout → this boundary) and their content
 * streamed in, instead of blocking navigation on the full server round trip.
 * See node_modules/next/dist/docs/01-app/02-guides/prefetching.md.
 */
export default function AdminAnalyticsLoading() {
  return <div className="min-h-screen" aria-hidden />;
}
