/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@qwikmailer/types"],
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
