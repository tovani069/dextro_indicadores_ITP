/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Este projeto é a raiz do workspace (evita o Next inferir uma pasta acima).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
