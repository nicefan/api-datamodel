import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'api-datamodel',
  description: '面向业务资源组织前端接口的 TypeScript 请求模型',
  base: process.env.DOCS_BASE || '/api-datamodel/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/guide/api-reference' },
      { text: 'API Codegen', link: '/swagger/' },
      { text: 'GitHub', link: 'https://github.com/nicefan/api-datamodel' }
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '运行时模型', link: '/guide/datamodel' },
          { text: 'Service 与 Resource', link: '/guide/resource' },
          { text: 'API Reference', link: '/guide/api-reference' }
        ]
      },
      {
        text: '工具',
        items: [
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
