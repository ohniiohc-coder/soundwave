/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    API_URL: process.env.API_URL || "http://backend:8000",
  },
  images: {
    // Docker 환경에서 Next.js 이미지 최적화는 컨테이너 내부에서 localhost에 접근하므로
    // 브라우저가 직접 이미지 URL로 접근하도록 최적화를 비활성화
    unoptimized: true,
  },
};

module.exports = nextConfig;
