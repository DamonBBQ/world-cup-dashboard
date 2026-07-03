export default function ResponsibleNotice() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="text-3xl">⚠️</div>
          <div>
            <h3 className="font-bold text-yellow-800 mb-3">合规声明与理性提示</h3>
            <div className="space-y-2 text-sm text-yellow-700 leading-relaxed">
              <p>
                <strong>本工具仅用于赛事数据整理、模拟分析和个人记录</strong>，不提供任何真实交易、支付、下注或购彩平台入口。
              </p>
              <p>
                所有模拟结果均不构成投注建议。请遵守所在地法律法规，理性参与，未成年人禁止使用相关功能。
              </p>
              <p>
                本工具中的概率分析、预测洞察、推荐出票等功能均为基于公开数据的算法模拟，
                实际比赛结果受多种不确定因素影响，预测结果仅供参考，不构成任何投资或投注建议。
              </p>
              <p className="font-medium mt-4">
                🔞 未成年人禁止参与 · 请理性对待 · 量力而行
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
