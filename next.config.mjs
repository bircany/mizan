import { withPayload } from "@payloadcms/next/withPayload";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/kurban/odeme",
        destination: "/odeme",
        permanent: true,
      },
      {
        source: "/kurban/sonuc",
        destination: "/odeme/sonuc",
        permanent: true,
      },
      {
        source: "/kurban/takip/:token",
        destination: "/video/:token",
        permanent: false,
      },
      {
        source: "/panel/kurban/:path*",
        destination: "/panel/video-teslimat",
        permanent: false,
      },
      {
        source: "/panel/saha/:path*",
        destination: "/panel/video-teslimat",
        permanent: false,
      },
    ];
  },
  experimental: {
    proxyClientMaxBodySize: "11mb",
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  turbopack: {
    root: projectRoot,
  },
  transpilePackages: [
    '@payloadcms/richtext-lexical',
    '@payloadcms/next',
    '@payloadcms/plugin-seo',
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "ihh.org.tr" },
      ...(supabaseHostname ? [{ protocol: "https", hostname: supabaseHostname }] : []),
    ],
  },
};

export default withPayload(nextConfig);
