/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "https://ungloved-translate-certainty.ngrok-free.dev",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
};

export default nextConfig;
