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
    ],
  },
};

export default nextConfig;
