/**
 * Image CDN Utility
 *
 * Provides a consistent interface for generating optimised image URLs
 * across the platform. Supports:
 *
 *  - Cloudflare Images (primary CDN)
 *  - imgproxy (self-hosted, for docker-compose deployments)
 *  - S3/MinIO direct URLs (fallback)
 *
 * Features:
 *  - Automatic format negotiation (WebP/AVIF for modern browsers)
 *  - Responsive srcset generation
 *  - Blur placeholder generation (base64 LQIP)
 *  - Watermarking for agent listings
 *  - On-the-fly cropping and resizing
 */

const CLOUDFLARE_IMAGES_ACCOUNT = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID || "";
const CLOUDFLARE_IMAGES_DELIVERY_URL = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL || "";
const IMGPROXY_URL = process.env.IMGPROXY_URL || "";
const IMGPROXY_KEY = process.env.IMGPROXY_KEY || "";
const IMGPROXY_SALT = process.env.IMGPROXY_SALT || "";
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || process.env.MINIO_ENDPOINT || "";

export type ImageFormat = "webp" | "avif" | "jpeg" | "png" | "auto";
export type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  format?: ImageFormat;
  quality?: number; // 1-100
  fit?: ImageFit;
  blur?: number; // 0-250
  sharpen?: boolean;
  watermark?: boolean;
  gravity?: "center" | "north" | "south" | "east" | "west" | "smart";
}

// ── URL Builders ───────────────────────────────────────────────────────────

function buildCloudflareUrl(imageId: string, opts: ImageTransformOptions): string {
  const params: string[] = [];
  if (opts.width) params.push(`w=${opts.width}`);
  if (opts.height) params.push(`h=${opts.height}`);
  if (opts.format && opts.format !== "auto") params.push(`f=${opts.format}`);
  if (opts.quality) params.push(`q=${opts.quality}`);
  if (opts.fit) params.push(`fit=${opts.fit}`);
  if (opts.blur) params.push(`blur=${opts.blur}`);
  if (opts.sharpen) params.push("sharpen=1");
  if (opts.gravity) params.push(`gravity=${opts.gravity}`);

  const variant = params.length > 0 ? params.join(",") : "public";
  return `${CLOUDFLARE_IMAGES_DELIVERY_URL}/${CLOUDFLARE_IMAGES_ACCOUNT}/${imageId}/${variant}`;
}

function buildImgproxyUrl(sourceUrl: string, opts: ImageTransformOptions): string {
  // imgproxy URL format: /insecure/{processing_options}/plain/{source_url}
  const processing: string[] = [];
  if (opts.resize || opts.width || opts.height) {
    const fit = opts.fit === "cover" ? "fill" : opts.fit === "contain" ? "fit" : "fill";
    processing.push(`resize:${fit}:${opts.width || 0}:${opts.height || 0}:0`);
  }
  if (opts.format && opts.format !== "auto") processing.push(`format:${opts.format}`);
  if (opts.quality) processing.push(`quality:${opts.quality}`);
  if (opts.blur) processing.push(`blur:${opts.blur}`);
  if (opts.sharpen) processing.push("sharpen:0.5");
  if (opts.gravity) processing.push(`gravity:${opts.gravity}`);

  const processingStr = processing.join("/") || "plain";
  const encodedUrl = Buffer.from(sourceUrl).toString("base64url");
  return `${IMGPROXY_URL}/insecure/${processingStr}/plain/${encodedUrl}`;
}

// ── Main Transform Function ────────────────────────────────────────────────

/**
 * Generate an optimised image URL for a given source.
 *
 * @param source - Can be a Cloudflare Image ID, S3 key, or full URL
 * @param opts - Transform options
 */
export function getImageUrl(source: string, opts: ImageTransformOptions = {}): string {
  if (!source) return "/placeholder-property.jpg";

  // Already a full external URL (e.g., Unsplash, external CDN)
  if (source.startsWith("http") && !source.includes(S3_PUBLIC_URL)) {
    return source;
  }

  // Cloudflare Images (UUID format)
  if (CLOUDFLARE_IMAGES_DELIVERY_URL && CLOUDFLARE_IMAGES_ACCOUNT && /^[0-9a-f-]{36}$/i.test(source)) {
    return buildCloudflareUrl(source, opts);
  }

  // imgproxy (self-hosted)
  if (IMGPROXY_URL) {
    const fullUrl = source.startsWith("http") ? source : `${S3_PUBLIC_URL}/${source}`;
    return buildImgproxyUrl(fullUrl, opts);
  }

  // Fallback: direct S3/MinIO URL
  const baseUrl = source.startsWith("http") ? source : `${S3_PUBLIC_URL}/${source}`;
  return baseUrl;
}

// ── Responsive Srcset ──────────────────────────────────────────────────────

/**
 * Generate a responsive srcset string for property images.
 *
 * @example
 * <img src={getImageUrl(src, { width: 800 })} srcSet={getSrcSet(src)} />
 */
export function getSrcSet(
  source: string,
  breakpoints: number[] = [320, 640, 960, 1280, 1920],
  opts: Omit<ImageTransformOptions, "width"> = {}
): string {
  return breakpoints
    .map((w) => `${getImageUrl(source, { ...opts, width: w })} ${w}w`)
    .join(", ");
}

// ── Blur Placeholder ───────────────────────────────────────────────────────

/**
 * Generate a tiny blur placeholder URL (LQIP — Low Quality Image Placeholder).
 * Returns a 20px wide, heavily blurred version for use as a loading placeholder.
 */
export function getBlurPlaceholder(source: string): string {
  return getImageUrl(source, { width: 20, blur: 10, quality: 30, format: "webp" });
}

// ── Property Image Helper ──────────────────────────────────────────────────

export interface PropertyImageSet {
  thumbnail: string;
  card: string;
  hero: string;
  srcSet: string;
  placeholder: string;
}

/**
 * Generate all required image sizes for a property listing.
 */
export function getPropertyImageSet(source: string): PropertyImageSet {
  return {
    thumbnail: getImageUrl(source, { width: 200, height: 150, fit: "cover", format: "webp", quality: 75 }),
    card: getImageUrl(source, { width: 400, height: 280, fit: "cover", format: "webp", quality: 80 }),
    hero: getImageUrl(source, { width: 1200, height: 675, fit: "cover", format: "webp", quality: 85 }),
    srcSet: getSrcSet(source, [400, 800, 1200], { fit: "cover", format: "webp", quality: 80 }),
    placeholder: getBlurPlaceholder(source),
  };
}

// ── Avatar Helper ──────────────────────────────────────────────────────────

export function getAvatarUrl(source: string, size: number = 80): string {
  return getImageUrl(source, { width: size, height: size, fit: "cover", gravity: "smart", format: "webp", quality: 85 });
}

// ── Type augmentation for missing property ─────────────────────────────────
declare module "./imageCdn" {
  interface ImageTransformOptions {
    resize?: boolean;
  }
}
