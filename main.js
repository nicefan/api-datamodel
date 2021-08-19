import { mountApp, router } from 'core'
import { menu } from 'sub'

mountApp(menu)

console.log(router.getRoutes())