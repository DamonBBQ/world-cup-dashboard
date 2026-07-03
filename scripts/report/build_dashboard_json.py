#!/usr/bin/env python3
"""
生成前端 Dashboard JSON - 供前端 fetch 读取
"""

import json
import shutil
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent.parent

def build_dashboard_json(results, registry, window="3y", bankroll=500):
    """生成前端可读取的 JSON 并复制到 public/data/"""

    # 构建排行榜
    by_max_bankroll = sorted(results, key=lambda x: x["final_bankroll"], reverse=True)
    by_valid_sample = sorted([r for r in results if r["ticket_count"] >= 10], key=lambda x: x["ticket_count"], reverse=True)
    by_risk_qualified = sorted(
        [r for r in results if r["max_drawdown"] >= -0.30 and r["roi"] > 0 and r["ticket_count"] >= 10],
        key=lambda x: x["roi"], reverse=True
    )
    accepted = [r for r in results if r["absorption_status"] == "accepted"]

    summary = {
        "generated_at": datetime.now().isoformat(),
        "window": window,
        "initial_bankroll": bankroll,
        "strategies": results,
        "rankings": {
            "by_max_bankroll": [
                {"strategy_name": s["strategy_name"], "final_bankroll": s["final_bankroll"], "status": s["absorption_status"]}
                for s in by_max_bankroll
            ],
            "by_valid_sample": [
                {"strategy_name": s["strategy_name"], "ticket_count": s["ticket_count"], "status": s["absorption_status"]}
                for s in by_valid_sample
            ],
            "by_risk_qualified": [
                {"strategy_name": s["strategy_name"], "max_drawdown": s["max_drawdown"], "roi": s["roi"], "status": s["absorption_status"]}
                for s in by_risk_qualified
            ],
            "by_accepted": [
                {"strategy_name": s["strategy_name"], "final_bankroll": s["final_bankroll"], "roi": s["roi"], "status": "accepted"}
                for s in accepted
            ]
        },
        "model_feedback": {
            "learned": [
                "三场胜平负串关全中率只有约12.44%，不能把三串一方向票作为默认主结构",
                "当前最有效的信号来自'进球节奏 + 赔率EV'，不是单纯球队方向判断",
                "意甲在本回测窗口里方向表现和进球误差相对更可控，适合先单独作为策略域",
                "法甲在前次分赛事资金模拟中拖累明显，不应和意甲混成同一套节奏策略",
                "小样本高收益候选不能直接吸收，例如9张票以内的高盈利结果只能记录观察"
            ],
            "rejected_reasons": [
                f"{s['strategy_name']}：{s['reason']}" for s in results if s["absorption_status"] == "rejected"
            ],
            "observed_reasons": [
                f"{s['strategy_name']}：{s['reason']}" for s in results if s["absorption_status"] == "observed"
            ],
            "accepted_reasons": [
                f"{s['strategy_name']}：{s['reason']}" for s in results if s["absorption_status"] == "accepted"
            ],
            "next_validation": [
                "更长时间窗口验证，例如5年、10年",
                "单独做2024-2026留出测试，避免在同一测试期反复调参",
                "检查意甲节奏票的失败样本，尤其是总进球模型偏大/偏小的触发原因",
                "如果未来样本回撤超过30%，自动降到2%-3%仓位"
            ]
        },
        "policy": {
            "min_observation_tickets": 10,
            "min_absorption_tickets": 30,
            "min_roi": 0,
            "max_drawdown_limit": -0.30,
            "allow_absorb_small_sample_profit": False,
            "require_positive_final_bankroll": True,
            "require_drawdown_recovery": True
        }
    }

    # 写入 exports/dashboard
    exports_path = ROOT / "exports" / "dashboard" / "latest_backtest_summary.json"
    with open(exports_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"  exports/dashboard/latest_backtest_summary.json 已更新")

    # 写入 registry JSON
    registry_path = ROOT / "exports" / "dashboard" / "latest_strategy_registry.json"
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            **registry
        }, f, ensure_ascii=False, indent=2)
    print(f"  exports/dashboard/latest_strategy_registry.json 已更新")

    # 复制到 public/data/
    public_dir = ROOT / "public" / "data"
    public_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy2(exports_path, public_dir / "latest_backtest_summary.json")
    shutil.copy2(registry_path, public_dir / "latest_strategy_registry.json")
    print(f"  public/data/ 已同步")

    return summary

if __name__ == "__main__":
    from evaluate_candidate_strategy import evaluate_all_candidates
    from update_strategy_registry import update_registry
    results = evaluate_all_candidates()
    registry = update_registry(results)
    build_dashboard_json(results, registry)
