/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'image.pollinations.ai',
      'assets.coingecko.com',
    ],
  },
  webpack: (config) => {
    // Fix Solana wallet adapter SSR
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }

    // Fix MetaMask SDK pulling in React Native deps
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }

    return config
  },
}

module.exports = nextConfig
