/**
 * One-shot Cloudflare R2 setup for the Raven media library.
 *
 * Usage:
 *   R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
 *     node scripts/setup-r2.mjs [--bucket raven-media] [--origin https://your-app.vercel.app]
 *
 * Creates the bucket (if missing) and sets the CORS policy that lets the
 * browser and the iOS Shortcut PUT files straight to R2 via presigned URLs.
 *
 * After running, two clicks remain in the Cloudflare dashboard (not possible
 * via the S3 API): R2 → bucket → Settings → enable "Public access" (r2.dev)
 * or connect a custom domain — then set that URL as R2_PUBLIC_BASE in Vercel.
 */
import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY first.');
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const bucket = flag('bucket', 'raven-media');
const origin = flag('origin', '*');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`bucket "${bucket}" already exists`);
} catch {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`created bucket "${bucket}"`);
}

await s3.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origin === '*' ? ['*'] : [origin],
          AllowedMethods: ['GET', 'PUT', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
console.log(`CORS set (origins: ${origin})`);
console.log('\nRemaining manual steps:');
console.log('  1. Cloudflare dashboard → R2 → ' + bucket + ' → Settings → enable Public access');
console.log('     (or connect a custom domain like media.yourdomain.com)');
console.log('  2. In Vercel env vars set:');
console.log('     R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,');
console.log(`     R2_BUCKET=${bucket}, R2_PUBLIC_BASE=<the public URL from step 1>,`);
console.log('     RAVEN_UPLOAD_TOKEN=<any long random string, for the iOS Shortcut>');
