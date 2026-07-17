import { withPayload } from "@payloadcms/next/withPayload";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
};

export default withPayload(nextConfig);
