// Build identity used by the Android WebView to refresh only after a new deployment.
// Do not expose environment variables other than the public Git commit identifier.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  return Response.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown' },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
  );
}
