import DefaultTheme from 'vitepress/theme'
import { inBrowser, withBase, type Theme } from 'vitepress'

const languagePreferenceKey = 'api-datamodel-docs-language'
type Language = 'zh-CN' | 'en-US'

function getLanguage(pathname: string, base: string): Language {
  const relativePath = pathname.startsWith(base)
    ? pathname.slice(base.length - 1)
    : pathname
  return relativePath === '/en' || relativePath.startsWith('/en/')
    ? 'en-US'
    : 'zh-CN'
}

function getSavedLanguage(): Language | undefined {
  try {
    const language = localStorage.getItem(languagePreferenceKey)
    return language === 'zh-CN' || language === 'en-US'
      ? language
      : undefined
  } catch {
    return undefined
  }
}

function saveLanguage(language: Language) {
  try {
    localStorage.setItem(languagePreferenceKey, language)
  } catch {
    // 隐私模式或浏览器禁用存储时，仍允许按系统语言完成本次跳转。
  }
}

function getSystemLanguage(): Language {
  return navigator.languages.some((language) =>
    language.toLowerCase().startsWith('zh'),
  )
    ? 'zh-CN'
    : 'en-US'
}

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ router, siteData }) {
    if (!inBrowser) return

    const base = siteData.value.base
    const pathname = location.pathname
    const isRoot = pathname === base || pathname === base.slice(0, -1)

    if (isRoot) {
      // 仅在根首页自动识别，避免覆盖用户主动访问某个语言页面的意图。
      const language = getSavedLanguage() ?? getSystemLanguage()
      saveLanguage(language)
      if (language === 'en-US') {
        location.replace(`${withBase('/en/')}${location.search}${location.hash}`)
        return
      }
    } else {
      // 直接访问具体语言页面也视为一次明确选择。
      saveLanguage(getLanguage(pathname, base))
    }

    const onAfterRouteChange = router.onAfterRouteChange
    router.onAfterRouteChange = async (to) => {
      await onAfterRouteChange?.(to)
      saveLanguage(getLanguage(new URL(to, location.origin).pathname, base))
    }
  },
}

export default theme
