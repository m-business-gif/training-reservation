import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        destination: 'https://ssin-training-reservation.vercel.app/:path*',
        permanent: true,
      },
    ];
  },
  // Turbopack用の空設定を追加してエラーを回避
  turbopack: {},
};

export default withPWA(nextConfig);
