export default {
  id: 'p10',
  title: 'LLM 从零训练',
  preview: '从 tokenizer 到 0.1B 训练、数据管线与三条后训练路线',
  source: 'phases/10-llms-from-scratch',
  complete: false,
  lessons: [
    { id: 'hw1', tier: 't1', order: 1, title: 'Tokenizer 与 Transformer', componentId: 'hw1', acceptancePrefix: 'hw1' },
    { id: 'hw2', tier: 't1', order: 2, title: 'Triton Attention 内核', componentId: 'hw2', acceptancePrefix: 'hw2' },
    { id: 'hw3', tier: 't1', order: 3, title: '数据与 Scaling Law', componentId: 'hw3', acceptancePrefix: 'hw3' },
    { id: 'hw4', tier: 't1', order: 4, title: 'SFT / DPO / RLVR', componentId: 'hw4', acceptancePrefix: 'hw4' },
  ],
}
