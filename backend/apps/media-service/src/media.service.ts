import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { AppConfigService, TenantContext, rpcError } from '@app/common';
import { Media, MediaKind } from './schemas/media.schema';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB cap
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Brand kits additionally allow SVG (seals/logos) — sanitized at confirm.
const BRAND_ALLOWED_TYPES = [...ALLOWED_TYPES, 'image/svg+xml'];
const PRESIGN_TTL_SECONDS = 600;

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectModel(Media.name) private readonly media: Model<Media>,
    private readonly config: AppConfigService,
  ) {
    this.bucket = config.get('S3_BUCKET');
    this.s3 = new S3Client({
      endpoint: config.require('S3_ENDPOINT'),
      region: config.get('S3_REGION'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE'),
      credentials: {
        accessKeyId: config.require('S3_ACCESS_KEY'),
        secretAccessKey: config.require('S3_SECRET_KEY'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3
        .send(new CreateBucketCommand({ Bucket: this.bucket }))
        .then(() => this.logger.log(`Created bucket ${this.bucket}`))
        .catch((e: Error) => this.logger.warn(`Bucket check failed: ${e.message}`));
    }
    // Objects are rendered directly by the apps (report photos, CMS heroes,
    // POI images) — download-only public policy; writes stay presigned.
    await this.s3
      .send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`],
              },
            ],
          }),
        }),
      )
      .catch((e: Error) => this.logger.warn(`Bucket policy failed: ${e.message}`));
  }

  async presign(tenant: TenantContext, userId: string, contentType: string, kind: MediaKind) {
    const allowed = kind === 'brand' ? BRAND_ALLOWED_TYPES : ALLOWED_TYPES;
    if (!allowed.includes(contentType)) {
      rpcError(400, `Unsupported content type: ${contentType}`);
    }
    const ext = contentType === 'image/svg+xml' ? 'svg' : contentType.split('/')[1];
    const key = `${tenant.tenantId}/${kind}/${randomUUID()}.${ext}`;
    const doc = await this.media.create({
      tenantId: tenant.tenantId,
      userId,
      key,
      kind,
      contentType,
      status: 'pending',
    });
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: PRESIGN_TTL_SECONDS },
    );
    return {
      media_id: String(doc._id),
      upload_url: uploadUrl,
      key,
      max_bytes: MAX_UPLOAD_BYTES,
      expires_in: PRESIGN_TTL_SECONDS,
    };
  }

  /** After client upload: enforce the size cap, strip EXIF, mark ready. */
  async confirm(tenant: TenantContext, userId: string, mediaId: string) {
    const doc = await this.media.findOne({
      _id: mediaId,
      tenantId: tenant.tenantId,
      userId,
    });
    if (!doc) rpcError(404, 'Media not found');
    const head = await this.s3
      .send(new HeadObjectCommand({ Bucket: this.bucket, Key: doc.key }))
      .catch(() => null);
    if (!head) rpcError(400, 'Object has not been uploaded');
    if ((head.ContentLength ?? 0) > MAX_UPLOAD_BYTES) {
      rpcError(413, `Upload exceeds ${MAX_UPLOAD_BYTES} bytes`);
    }

    const obj = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: doc.key }));
    const bytes = Buffer.from(await obj.Body!.transformToByteArray());
    let cleaned: Buffer;
    if (doc.contentType === 'image/svg+xml') {
      // SVG (brand seals/logos): strip scripts/event handlers — DOMPurify with
      // the SVG profile — since these render in the app's image surfaces.
      const { JSDOM } = await import('jsdom');
      const createDOMPurify = (await import('dompurify')).default;
      const purify = createDOMPurify(new JSDOM('').window);
      cleaned = Buffer.from(
        purify.sanitize(bytes.toString('utf8'), { USE_PROFILES: { svg: true, svgFilters: true } }),
        'utf8',
      );
    } else {
      // EXIF strip: decode & re-encode without metadata (auto-rotates first so
      // orientation survives the strip).
      cleaned = await sharp(bytes).rotate().toBuffer();
    }
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: doc.key,
        Body: cleaned,
        ContentType: doc.contentType,
      }),
    );
    doc.status = 'ready';
    doc.sizeBytes = cleaned.length;
    await doc.save();
    return { media_id: String(doc._id), key: doc.key, url: this.publicUrl(doc.key), status: 'ready' };
  }

  publicUrl(key: string): string {
    const base = this.config.get('S3_PUBLIC_ENDPOINT') ?? this.config.require('S3_ENDPOINT');
    return `${base}/${this.bucket}/${key}`;
  }
}
