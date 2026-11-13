/* 站点身份单一真源：改名只改这里。
   index.html 中的 %SITE_*% 占位符由 vite.config.js 注入；README 由 check:content 比对。 */
export const SITE = {
  name: '从零构建 AI · 全栈自学',
  tagline: '按 20 个 phase 组织的 LLM 全栈路线',
  description: '从数学基础到 Agent 工程，按 20 个 phase 组织的 LLM 全栈自学站：每个阶段都有可验收的终点，进度只留在本机浏览器。',
  siteUrl: 'https://llm-course-tsinghua.pages.dev/',
  sources: {
    course: '清华 KEG《高级机器学习》（2026 秋）作业框架（公开转述，课件未公开）',
    upstream: 'AI Engineering from Scratch（MIT，rohitg00/ai-engineering-from-scratch）',
  },
}
