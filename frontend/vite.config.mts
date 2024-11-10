import {defineConfig} from 'vite';
import {configDefaults as testConfigDefaults} from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import pluginRewriteAll from 'vite-plugin-rewrite-all';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Convert all environment variables to the required format
dotenv.config();
const envVariables = Object.keys(process.env).reduce((acc, key) => {
    acc[`process.env.${key}`] = JSON.stringify(process.env[key]);
    return acc;
}, {});

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    return {
        plugins: [pluginRewriteAll(), react()],
        esbuild: {
            loader: 'tsx',
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        css: {
            modules: {
                localsConvention: 'camelCaseOnly',
            },
        },
        define: {
            ...envVariables,
        },
        server: {
            port: 3000,
            https: fs.existsSync('./cert.pem')
                ? {
                      key: fs.readFileSync('./key.pem'),
                      cert: fs.readFileSync('./cert.pem'),
                  }
                : false,
        },
        build: {
            outDir: 'build',
        },
        test: {
            environment: 'happy-dom',
            exclude: [...testConfigDefaults.exclude],
        },
    };
});
