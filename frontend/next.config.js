/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gibs.earthdata.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "earthdata.nasa.gov",
      },
    ],
  },
};

module.exports = nextConfig;