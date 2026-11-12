/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@typemaster/typing-engine", "@typemaster/db", "@typemaster/content"],
  // Tests and audits build into their own folder (NEXT_DIST_DIR=.next-test) so they never overwrite the
  // files a running `npm run dev` is serving (that caused "ChunkLoadError" in the browser).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
