import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();
 
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
          allowedOrigins: ["192.168.0.75"]
        }
      },
      async redirects() {
        return [
          {
            source: '/:lang',
            destination: '/:lang/now',
            permanent: true,
          },
        ]
      },
};
 

export default withNextIntl(nextConfig);