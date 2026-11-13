import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { SITE } from './src/site.js'

/* 把站点身份注入 index.html：静态 HTML 无法 import 配置，用占位符保持单一真源 */
const siteIdentity = () => ({
  name: 'site-identity',
  transformIndexHtml: html =>
    html
      .replaceAll('%SITE_NAME%', SITE.name)
      .replaceAll('%SITE_DESCRIPTION%', SITE.description)
      .replaceAll('%SITE_URL%', SITE.siteUrl),
})

export default defineConfig({
  plugins: [react(), siteIdentity()],
  base: './',
})
