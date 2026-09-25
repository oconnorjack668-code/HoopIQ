// src/app/.well-known/assetlinks.json/route.ts
// Digital Asset Links: proves the Play Store app (a Trusted Web Activity built with PWABuilder)
// and this website belong together, so the app opens full screen without a browser bar.
// Set in Vercel:
//   ANDROID_PACKAGE_NAME          e.g. ie.hoopiq.app (must match PWABuilder's "Package ID")
//   ANDROID_SHA256_FINGERPRINTS   comma-separated SHA-256 fingerprints (PWABuilder's signing key
//                                 AND the "App signing key" from Play Console → Setup → App signing)

export const dynamic = 'force-dynamic';

export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS || '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const body =
    packageName && fingerprints.length
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
          },
        ]
      : [];

  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
