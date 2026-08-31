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
        text: 'API 建模',
        items: [
          { text: 'Service 与业务 API', link: '/guide/service-api' },
          { text: '服务前缀与模块路径', link: '/guide/request-path' },
        ],
      },
      {
        text: '请求处理',
        items: [
          { text: '请求与响应', link: '/guide/request' },
          { text: '请求批次管理', link: '/guide/request-feedback' },
        ],
      },
      {
        text: '底层能力',
        items: [
          { text: '上传、适配与请求扩展', link: '/guide/extensions' },
        ],
      },
      {
        text: '自动生成',
        items: [
          { text: 'API Codegen', link: '/codegen/' },
          { text: '配置', link: '/codegen/config' },
          { text: '生成规则', link: '/codegen/generation-rules' },
          { text: 'OpenAPI 编写规范', link: '/codegen/openapi-conventions' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/nicefan/api-datamodel' }],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
  },
})
