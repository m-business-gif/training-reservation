import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  // Turbopack用の空設定を追加してエラーを回避
  turbopack: {},
};

export default withPWA(nextConfig);
