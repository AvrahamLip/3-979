import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    base: '/3-979/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                zama: resolve(__dirname, 'zama.html'),
            },
        },
    },
})
