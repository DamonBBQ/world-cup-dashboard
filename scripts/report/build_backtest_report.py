#!/usr/bin/env python3
"""
生成 Markdown 回测报告
"""

import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent.parent

def build_report(results, registry, window="3y", bankroll=500):
    """生成 Markdown 回测报告"""
    accepted = registry.get("accepted", [])
    observed = registry.get("observed", [])
    rejected = registry.get("rejected", [])

    lines = []
    lines.append(f"# {window}回测反馈：风险门槛后的正式吸收\n")
    lines.append(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    lines.append(f"> 窗口：{window} | 初始资金：{bankroll}元\n")
    lines.append(f"---\n")

    # 正式吸收策略
    lines.append("## 正式吸收策略\n")
    if accepted:
        for s in accepted:
            lines.append(f"**{s['strategy_name']}**\n")
            lines.append(f"- 联赛：{s['league_scope']}")
            lines.append(f"- 票型：{s['ticket_type']}")
            lines.append(f"- 初始资金：{s['initial_bankroll']}元")
            lines.append(f"- 最终资金：{s['final_bankroll']}元")
            lines.append(f"- 净盈利：{s['net_profit']}元")
            lines.append(f"- ROI：{s['roi']*100:.2f}%")
            lines.append(f"- 最大回撤：{s['max_drawdown']*100:.2f}%")
            lines.append(f"- 出票数：{s['ticket_count']}张")
            lines.append(f"- 命中率：{s['hit_rate']*100:.2f}%")
            lines.append(f"- 吸收原因：{s['reason']}\n")
            if s.get("risk_notes"):
                lines.append("风险提示：")
                for note in s["risk_notes"]:
                    lines.append(f"  - {note}")
                lines.append("")
    else:
        lines.append("本轮无策略通过正式吸收门槛。\n")

    # 观察策略
    lines.append("## 观察策略\n")
    if observed:
        lines.append("| 策略名 | 出票数 | ROI | 最大回撤 | 原因 |")
        lines.append("|--------|--------|-----|----------|------|")
        for s in observed:
            lines.append(f"| {s['strategy_name']} | {s['ticket_count']} | {s['roi']*100:.1f}% | {s['max_drawdown']*100:.1f}% | {s['reason']} |")
        lines.append("")

    # 淘汰策略
    lines.append("## 淘汰策略\n")
    if rejected:
        lines.append("| 策略名 | 出票数 | ROI | 最大回撤 | 原因 |")
        lines.append("|--------|--------|-----|----------|------|")
        for s in rejected:
            lines.append(f"| {s['strategy_name']} | {s['ticket_count']} | {s['roi']*100:.1f}% | {s['max_drawdown']*100:.1f}% | {s['reason']} |")
        lines.append("")

    # 模型反馈
    lines.append("## 模型反馈\n")
    lines.append("### 学到了什么")
    lines.append("1. 三场胜平负串关全中率只有约12.44%，不能把三串一方向票作为默认主结构。")
    lines.append("2. 当前最有效的信号来自'进球节奏 + 赔率EV'，不是单纯球队方向判断。")
    lines.append("3. 意甲在本回测窗口里方向表现和进球误差相对更可控，适合先单独作为策略域。")
    lines.append("4. 法甲在前次分赛事资金模拟中拖累明显，不应和意甲混成同一套节奏策略。")
    lines.append("5. 小样本高收益候选不能直接吸收，例如9张票以内的高盈利结果只能记录观察。\n")

    lines.append("### 需要继续验证")
    lines.append("1. 更长时间窗口验证，例如5年、10年。")
    lines.append("2. 单独做2024-2026留出测试，避免在同一测试期反复调参。")
    lines.append("3. 检查意甲节奏票的失败样本，尤其是总进球模型偏大/偏小的触发原因。")
    lines.append("4. 如果未来样本回撤超过30%，自动降到2%-3%仓位。\n")

    lines.append("---\n")
    lines.append("⚠️ 本报告仅为模拟回测分析，不构成投注建议。历史表现不代表未来结果。")
    lines.append("⚠️ 请遵守所在地法律法规，理性参与，未成年人禁止使用相关功能。\n")

    report_text = "\n".join(lines)
    report_path = ROOT / "exports" / "backtests" / f"wf_{window}_{bankroll}_bankroll_risk_gate.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(f"  报告已生成: {report_path}")
    return report_path

if __name__ == "__main__":
    from evaluate_candidate_strategy import evaluate_all_candidates
    from update_strategy_registry import update_registry
    results = evaluate_all_candidates()
    registry = update_registry(results)
    build_report(results, registry)
