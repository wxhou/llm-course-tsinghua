/* 内容结构校验入口：用 Vite 的 SSR 加载器读入内容模块（能处理 JSX 与 CSS 导入），
   再交给 validate 检查；另做站点身份一致性检查。失败时以非零码退出。 */
import { createServer } from 'vite'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const LEGACY_NAME = '从零训练大模型'

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(p, out)
    else out.push(p)
  }
  return out
}

/* 节的两侧对照：正文里的 <Section id> 与节数据必须一一对应；每个 grader 必须真实存在。
   正文 id 在 JSX 里是字面量，直接扫源码即可——不渲染组件，因此不受 hooks / localStorage 影响。 */
async function sectionErrors(sections) {
  const errors = []
  const refs = new Set()
  for (const file of ['src/content/part1.jsx', 'src/content/part2.jsx']) {
    const text = await readFile(path.join(ROOT, file), 'utf8')
    for (const m of text.matchAll(/<Section id="([^"]+)"/g)) refs.add(m[1])
  }
  const declared = new Set(sections.map(s => s.id))
  for (const id of refs) {
    if (!declared.has(id)) errors.push(`正文 <Section id="${id}"> 在节数据里不存在`)
  }
  for (const id of declared) {
    if (!refs.has(id)) errors.push(`节 ${id} 已声明但正文没有 <Section id="${id}">`)
  }
  for (const s of sections) {
    const g = s.check?.grader
    if (!g) continue
    try {
      await stat(path.join(ROOT, g))
    } catch {
      errors.push(`节 ${s.id} 的 grader 不存在：${g}`)
    }
  }
  return errors
}

async function identityErrors(site) {
  const errors = []

  const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8')
  const title = (readme.match(/^#\s+(.+)$/m) || [])[1]?.trim()
  if (!title) errors.push('README.md: 找不到一级标题')
  else if (title !== site.name) {
    errors.push(`README.md: 标题「${title}」与 SITE.name「${site.name}」不一致`)
  }

  const files = [...(await walk(path.join(ROOT, 'src'))), path.join(ROOT, 'index.html')]
  for (const file of files) {
    const text = await readFile(file, 'utf8')
    if (text.includes(LEGACY_NAME)) {
      errors.push(`${path.relative(ROOT, file)}: 仍残留旧站名「${LEGACY_NAME}」`)
    }
  }

  return errors
}

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
  const { SITE } = await server.ssrLoadModule('/src/site.js')
  const { SECTIONS } = await server.ssrLoadModule('/src/content/sections.js')

  errors = [
    ...validate(PHASES, CHECKS, COMPONENTS),
    ...(await sectionErrors(SECTIONS)),
    ...(await identityErrors(SITE)),
  ]

  if (!errors.length) {
    const lessons = PHASES.reduce((n, p) => n + p.lessons.length, 0)
    console.log(`content ok · ${PHASES.length} phases · ${lessons} lessons · ${SECTIONS.length} sections · ${Object.keys(CHECKS).length} acceptance groups · site「${SITE.name}」`)
  }
} finally {
  await server.close()
}

if (errors.length) {
  console.error(`content check failed · ${errors.length} 处`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
