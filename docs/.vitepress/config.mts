import { defineConfig } from 'vitepress'

const commonThemeConfig = {
  socialLinks: [{ icon: 'github' as const, link: 'https://github.com/nicefan/api-datamodel' }],
  search: { provider: 'local' as const },
  outline: { level: [2, 3] as [number, number] },
}

const zhThemeConfig = {
  ...commonThemeConfig,
  nav: [
    { text: '手册', link: '/guide/introduction' },
    { text: 'GitHub', link: 'https://github.com/nicefan/api-datamodel' },
  ],
  sidebar: [
    { text: '开始', items: [
      { text: '介绍', link: '/guide/introduction' },
      { text: '快速开始', link: '/guide/getting-started' },
    ] },
    { text: '核心使用', items: [
      { text: 'API 建模', link: '/guide/api-modeling' },
      { text: '请求处理', link: '/guide/request' },
    ] },
    { text: '底层与适配', items: [
      { text: '请求适配器', link: '/guide/adapter' },
      { text: '请求扩展', link: '/guide/extensions' },
    ] },
    { text: '自动生成', items: [
      { text: 'API Codegen', link: '/codegen/' },
      { text: '配置', link: '/codegen/config' },
      { text: '后端开发约定', link: '/codegen/backend-conventions' },
    ] },
  ],
}

const enThemeConfig = {
  ...commonThemeConfig,
  nav: [
    { text: 'Guide', link: '/en/guide/introduction' },
    { text: 'GitHub', link: 'https://github.com/nicefan/api-datamodel' },
  ],
  sidebar: [
    { text: 'Getting Started', items: [
      { text: 'Introduction', link: '/en/guide/introduction' },
      { text: 'Quick Start', link: '/en/guide/getting-started' },
    ] },
    { text: 'Core Usage', items: [
      { text: 'API Modeling', link: '/en/guide/api-modeling' },
      { text: 'Request Handling', link: '/en/guide/request' },
    ] },
    { text: 'Internals and Adapters', items: [
      { text: 'Request Adapters', link: '/en/guide/adapter' },
      { text: 'Request Extensions', link: '/en/guide/extensions' },
    ] },
    { text: 'Code Generation', items: [
      { text: 'API Codegen', link: '/en/codegen/' },
      { text: 'Configuration', link: '/en/codegen/config' },
      { text: 'Backend Conventions', link: '/en/codegen/backend-conventions' },
    ] },
  ],
}

export default defineConfig({
  base: process.env.DOCS_BASE || '/api-datamodel/',
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'api-datamodel',
      description: '面向业务 API 建模的 TypeScript 请求模型',
      themeConfig: zhThemeConfig,
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'api-datamodel',
      description: 'TypeScript request models for business API modeling',
      themeConfig: enThemeConfig,
    },
  },
  themeConfig: zhThemeConfig,
})
