const frameworkSteps = [
  {
    step: 1,
    title: '基本方向',
    subtitle: '判断胜平负基础倾向',
    description: '基于球队实力、主客场优势、历史交锋记录，初步判断比赛的基本走向。综合考虑近期状态、进球能力、失球情况等因素，给出胜平负的基础概率评估。',
    factors: ['球队实力对比', '主客场因素', '历史交锋', '近期状态'],
  },
  {
    step: 2,
    title: '比赛节奏',
    subtitle: '判断快节奏还是慢节奏',
    description: '分析两队的比赛风格，判断比赛可能的节奏。进攻型球队对攻往往产生快节奏高比分比赛，防守型球队交锋则可能是慢节奏低比分。考虑战术安排和比赛重要性。',
    factors: ['进攻风格', '防守组织', '战术倾向', '比赛重要性'],
  },
  {
    step: 3,
    title: '进球中心',
    subtitle: '判断大小球与比分范围',
    description: '基于双方进攻火力和防守稳定性，预测比赛总进球数。结合主要得分手状态、定位球能力、防线完整性等因素，给出可能的比分范围建议。',
    factors: ['进攻效率', '防守稳定性', '定位球', '得分手状态'],
  },
  {
    step: 4,
    title: '条件融合',
    subtitle: '融合伤停、天气、赛程、战意',
    description: '将伤病情况、天气条件、赛程密度、战意等外部因素纳入分析。主力伤停可能显著改变球队实力，恶劣天气影响技术发挥，密集赛程影响体能，不同战意影响投入程度。',
    factors: ['伤病报告', '天气预报', '赛程密度', '战意评估'],
  },
  {
    step: 5,
    title: '资金分层',
    subtitle: '根据风险分配金额',
    description: '基于前面步骤的分析结果，对不同比赛和投注方向进行风险评估，合理分配资金。高信心低风险的比赛可以分配更多资金，低信心高风险的比赛应控制投入。',
    factors: ['信心指数', '风险等级', '预期回报', '资金比例'],
  },
  {
    step: 6,
    title: '关联检查',
    subtitle: '避免票组之间高度重复和风险集中',
    description: '最后检查整个票组组合，确保没有过度集中在某一种结果或某一场比赛上。合理的票组应该有适度的多样性，避免单一风险因子导致整体失败。',
    factors: ['多样性检查', '风险分散', '相关性分析', '组合优化'],
  },
];

export default function SixStepFramework() {
  return (
    <section id="framework" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">六步分析框架</h2>
        <p className="text-text-secondary">系统化的比赛分析方法论</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {frameworkSteps.map(step => (
          <div key={step.step} className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold">
                {step.step}
              </div>
              <div>
                <h3 className="font-bold text-primary">{step.title}</h3>
                <p className="text-xs text-text-secondary">{step.subtitle}</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              {step.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {step.factors.map((factor, i) => (
                <span key={i} className="px-2 py-1 bg-bg rounded-lg text-xs text-text-secondary">
                  {factor}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
