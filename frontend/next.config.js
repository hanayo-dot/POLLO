/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    domains: ["gibs.earthdata.nasa.gov", "earthdata.nasa.gov"],
  },
};

module.exports = nextConfig;
