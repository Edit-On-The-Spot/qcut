/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // TypeScript errors should fail the build to catch type issues early
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
}

export default nextConfig