/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export -> drop the `out/` folder on S3 + CloudFront.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // hackathon deliverable: don't let a stray lint rule block the static export
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
