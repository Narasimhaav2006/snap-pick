import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [tailwindcss()],
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:5000',
            '/uploads': 'http://127.0.0.1:5000',
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                household: resolve(__dirname, 'household.html'),
                admin: resolve(__dirname, 'admin.html'),
                collector: resolve(__dirname, 'collector.html'),
                login: resolve(__dirname, 'login.html'),
                loginHousehold: resolve(__dirname, 'login-household.html'),
                loginAdmin: resolve(__dirname, 'login-admin.html'),
                loginCollector: resolve(__dirname, 'login-collector.html'),
                registerAdmin: resolve(__dirname, 'register-admin.html'),
            },
        },
    },
});