export default {
  id: 'p10',
  title: 'LLM 从零训练',
  preview: '从 tokenizer 到 0.1B 训练、数据管线与三条后训练路线',
  source: 'phases/10-llms-from-scratch',
  complete: true,
  lessons: [
    { id: 'hw1', title: 'Tokenizer 与 Transformer', componentId: 'hw1', acceptancePrefix: 'hw1' },
    { id: 'hw2', title: 'Triton Attention 内核', componentId: 'hw2', acceptancePrefix: 'hw2' },
    { id: 'hw3', title: '数据与 Scaling Law', componentId: 'hw3', acceptancePrefix: 'hw3' },
    { id: 'hw4', title: 'SFT / DPO / RLVR', componentId: 'hw4', acceptancePrefix: 'hw4' },
  ],
}
