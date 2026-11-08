/* 课节点 → 正文组件。数据层只存 componentId，正文仍留在原章节文件里。 */
import { HW1, HW2 } from './part1.jsx'
import { HW3, HW4, Final } from './part2.jsx'

export const COMPONENTS = { hw1: HW1, hw2: HW2, hw3: HW3, hw4: HW4, final: Final }
