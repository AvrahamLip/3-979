import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        proxy: {
            '/api-webhook': {
                target: 'https://151.145.89.228.sslip.io',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api-webhook/, ''),
                secure: false
            }
        }
    }
})
