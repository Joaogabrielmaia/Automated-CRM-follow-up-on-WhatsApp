/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Os testes E2E fazem o build numa pasta própria para não pisar no `npm run dev` de quem está desenvolvendo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
