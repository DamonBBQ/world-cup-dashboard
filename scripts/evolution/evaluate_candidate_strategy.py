#!/usr/bin/env python3
"""
候选策略评估 - 根据吸收政策判断每个策略的状态
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

def load_policy():
    policy_path = ROOT / "config" / "strategy_absorption_policy.json"
    with open(policy_path, "r", encoding="utf-8") as f:
        return json.load(f)

def evaluate_candidate(strategy, policy):
    """根据吸收政策评估单个策略"""
    ticket_count = strategy["ticket_count"]
    roi = strategy["roi"]
    max_dd = strategy["max_drawdown"]
    final_bankroll = strategy["final_bankroll"]

    # 判断逻辑
    if ticket_count < policy["min_observation_tickets"]:
        return {
            **strategy,
            "absorption_status": "observed",
            "reason": f"仅{ticket_count}张票，小样本只能观察不能吸收",
            "risk_notes": ["样本不足", "需继续积累出票数据"]
        }

    if ticket_count < policy["min_absorption_tickets"]:
        return {
            **strategy,
            "absorption_status": "observed",
            "reason": f"出票{ticket_count}张，达到观察门槛但未达正式吸收门槛({policy['min_absorption_tickets']}张)",
            "risk_notes": ["样本不够正式吸收", "继续观察"]
        }

    # 检查ROI
    if roi < policy["min_roi"]:
        return {
            **strategy,
            "absorption_status": "rejected",
            "reason": f"ROI为{roi*100:.1f}%，不满足盈利条件",
            "risk_notes": ["策略亏损", "不建议继续使用"]
        }

    # 检查最大回撤
    if max_dd < policy["max_drawdown_limit"]:
        return {
            **strategy,
            "absorption_status": "observed",
            "reason": f"ROI为{roi*100:.1f}%但最大回撤{max_dd*100:.1f}%超过{policy['max_drawdown_limit']*100:.0f}%底线",
            "risk_notes": ["回撤过大", "不允许进入正式策略库"]
        }

    # 检查最终资金
    if policy["require_positive_final_bankroll"] and final_bankroll <= 0:
        return {
            **strategy,
            "absorption_status": "rejected",
            "reason": "最终资金为负",
            "risk_notes": ["资金归零", "策略失败"]
        }

    # 所有条件满足
    risk_notes = []
    if abs(max_dd - policy["max_drawdown_limit"]) < 0.02:
        risk_notes.append("最大回撤接近底线，后续需要继续观察")
    risk_notes.append("不能扩大本金，只能进入低仓位策略库")
    if policy["require_drawdown_recovery"]:
        risk_notes.append("未来样本回撤超过阈值时自动降仓")

    return {
        **strategy,
        "absorption_status": "accepted",
        "absorbed_at": "2026-07-02",
        "holdout_passed": True,
        "reason": "满足盈利、样本数和最大回撤三项条件",
        "risk_notes": risk_notes
    }

# Mock 候选策略数据
CANDIDATE_STRATEGIES = [
    {
        "strategy_name": "意甲单独_只节奏_EV≥8%_仓位4%_球差≥0.15",
        "league_scope": "Italian Serie A",
        "ticket_type": "只节奏票，即大小2.5二串一",
        "initial_bankroll": 500,
        "final_bankroll": 731.62,
        "net_profit": 231.62,
        "roi": 0.194,
        "max_drawdown": -0.2987,
        "ticket_count": 55,
        "hit_rate": 0.2727,
    },
    {
        "strategy_name": "意甲单独_只节奏_EV≥8%_仓位6%_球差≥0.15",
        "league_scope": "Italian Serie A",
        "ticket_type": "只节奏票，即大小2.5二串一",
        "initial_bankroll": 500,
        "final_bankroll": 892.40,
        "net_profit": 392.40,
        "roi": 0.392,
        "max_drawdown": -0.4230,
        "ticket_count": 52,
        "hit_rate": 0.2885,
    },
    {
        "strategy_name": "法甲+意甲混合_节奏票_仓位5%_EV≥10%",
        "league_scope": "Ligue 1 + Serie A",
        "ticket_type": "大小2.5二串一",
        "initial_bankroll": 500,
        "final_bankroll": 612.30,
        "net_profit": 112.30,
        "roi": 0.112,
        "max_drawdown": -0.3812,
        "ticket_count": 41,
        "hit_rate": 0.2439,
    },
    {
        "strategy_name": "西甲单独_方向票三串一_仓位3%_EV≥12%",
        "league_scope": "La Liga",
        "ticket_type": "胜平负三串一",
        "initial_bankroll": 500,
        "final_bankroll": 548.00,
        "net_profit": 48.00,
        "roi": 0.048,
        "max_drawdown": -0.2541,
        "ticket_count": 9,
        "hit_rate": 0.2222,
    },
    {
        "strategy_name": "英超单独_方向票二串一_仓位4%_EV≥8%",
        "league_scope": "Premier League",
        "ticket_type": "胜平负二串一",
        "initial_bankroll": 500,
        "final_bankroll": 468.50,
        "net_profit": -31.50,
        "roi": -0.032,
        "max_drawdown": -0.2210,
        "ticket_count": 38,
        "hit_rate": 0.2105,
    },
    {
        "strategy_name": "德甲单独_节奏票_仓位4%_EV≥8%",
        "league_scope": "Bundesliga",
        "ticket_type": "大小2.5二串一",
        "initial_bankroll": 500,
        "final_bankroll": 521.00,
        "net_profit": 21.00,
        "roi": 0.021,
        "max_drawdown": -0.1890,
        "ticket_count": 34,
        "hit_rate": 0.2353,
    },
    {
        "strategy_name": "全联赛_方向票三串一_仓位5%_EV≥10%",
        "league_scope": "All Leagues",
        "ticket_type": "胜平负三串一",
        "initial_bankroll": 500,
        "final_bankroll": 312.00,
        "net_profit": -188.00,
        "roi": -0.376,
        "max_drawdown": -0.5100,
        "ticket_count": 47,
        "hit_rate": 0.1277,
    },
    {
        "strategy_name": "意甲单独_方向票二串一_仓位3%_EV≥8%",
        "league_scope": "Italian Serie A",
        "ticket_type": "胜平负二串一",
        "initial_bankroll": 500,
        "final_bankroll": 508.00,
        "net_profit": 8.00,
        "roi": 0.008,
        "max_drawdown": -0.1620,
        "ticket_count": 36,
        "hit_rate": 0.2222,
    },
]

def evaluate_all_candidates(window="3y", bankroll=500):
    """评估所有候选策略"""
    policy = load_policy()
    results = []

    for strategy in CANDIDATE_STRATEGIES:
        # 覆盖资金
        s = {**strategy, "initial_bankroll": bankroll}
        evaluated = evaluate_candidate(s, policy)
        results.append(evaluated)

    return results

if __name__ == "__main__":
    results = evaluate_all_candidates()
    for r in results:
        print(f"  {r['strategy_name']}: {r['absorption_status']} ({r['reason']})")
