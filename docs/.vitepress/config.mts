import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'api-datamodel',
  description: '面向业务 API 建模的 TypeScript 请求模型',
  base: process.env.DOCS_BASE || '/api-datamodel/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '手册', link: '/guide/introduction' },
      { text: 'GitHub', link: 'https://github.com/nicefan/api-datamodel' },
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '介绍', link: '/guide/introduction' },
          { text: '快速开始', link: '/guide/getting-started' },
        ],
      },
      {
        text: '核心使用',
        items: [
          { text: 'API 建模', link: '/guide/api-modeling' },
          { text: '请求处理', link: '/guide/request' },
        ],
      },
      {
        text: '底层与适配',
        items: [
          { text: '请求适配器', link: '/guide/adapter' },
          { text: '请求扩展', link: '/guide/extensions' },
        ],
      },
      {
        text: '自动生成',
        items: [
          { text: 'API Codegen', link: '/codegen/' },
          { text: '配置', link: '/codegen/config' },
          { text: '后端开发约定', link: '/codegen/backend-conventions' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/nicefan/api-datamodel' }],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
  },
})
