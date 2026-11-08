/* 内容结构校验入口：用 Vite 的 SSR 加载器读入内容模块（能处理 JSX 与 CSS 导入），
   再交给 validate 检查。失败时以非零码退出，供 npm run check:content 与 CI 使用。 */
import { createServer } from 'vite'

const server = await createServer({
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

let errors = []
try {
  const { PHASES } = await server.ssrLoadModule('/src/content/phases/index.js')
  const { CHECKS } = await server.ssrLoadModule('/src/content/registry.jsx')
  const { COMPONENTS } = await server.ssrLoadModule('/src/content/components.jsx')
  const { validate } = await server.ssrLoadModule('/src/content/phases/validate.js')
  errors = validate(PHASES, CHECKS, COMPONENTS)

  if (!errors.length) {
    const lessons = PHASES.reduce((n, p) => n + p.lessons.length, 0)
    console.log(`content ok · ${PHASES.length} phases · ${lessons} lessons · ${Object.keys(CHECKS).length} acceptance groups`)
  }
} finally {
  await server.close()
}

if (errors.length) {
  console.error(`content check failed · ${errors.length} 处`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
