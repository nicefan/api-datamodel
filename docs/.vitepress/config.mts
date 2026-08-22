import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'api-datamodel',
  description: '轻量级 TypeScript API 分层管理库',
  base: process.env.DOCS_BASE || '/api-datamodel/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'CacheResult', link: '/cache/' },
      { text: 'API Codegen', link: '/swagger/' },
      { text: 'GitHub', link: 'https://github.com/nicefan/api-datamodel' }
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: 'DataModel', link: '/guide/datamodel' },
          { text: 'Resource', link: '/guide/resource' }
        ]
      },
      {
        text: '工具',
        items: [
          { text: 'CacheResult', link: '/cache/' },
          { text: 'API Codegen', link: '/swagger/' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/nicefan/api-datamodel' }
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3] }
  }
})
