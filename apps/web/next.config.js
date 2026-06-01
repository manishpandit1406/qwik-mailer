/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@qwikmailer/types"],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
