#!/usr/bin/env python3
"""
更新策略注册表 - 将评估结果写入 accepted/observed/rejected 分类
"""

import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent.parent

def update_registry(results):
    """根据评估结果更新策略注册表"""
    accepted = []
    observed = []
    rejected = []

    for r in results:
        status = r["absorption_status"]
        if status == "accepted":
            accepted.append(r)
        elif status == "observed":
            observed.append(r)
        else:
            rejected.append(r)

    registry = {
        "accepted": accepted,
        "observed": observed,
        "rejected": rejected,
        "metadata": {
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "total_accepted": len(accepted),
            "total_observed": len(observed),
            "total_rejected": len(rejected),
        }
    }

    # 写入 strategy_registry
    accepted_path = ROOT / "data" / "strategy_registry" / "accepted_strategies.json"
    observed_path = ROOT / "data" / "strategy_registry" / "observed_strategies.json"

    with open(accepted_path, "w", encoding="utf-8") as f:
        json.dump({
            "accepted": accepted,
            "metadata": registry["metadata"]
        }, f, ensure_ascii=False, indent=2)

    with open(observed_path, "w", encoding="utf-8") as f:
        json.dump({
            "observed": observed,
            "metadata": {
                "last_updated": registry["metadata"]["last_updated"],
                "total_observed": len(observed)
            }
        }, f, ensure_ascii=False, indent=2)

    # 写入 exports/dashboard
    dashboard_path = ROOT / "exports" / "dashboard" / "latest_strategy_registry.json"
    with open(dashboard_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            **registry
        }, f, ensure_ascii=False, indent=2)

    return registry

if __name__ == "__main__":
    from evaluate_candidate_strategy import evaluate_all_candidates
    results = evaluate_all_candidates()
    registry = update_registry(results)
    print(f"Accepted: {len(registry['accepted'])}")
    print(f"Observed: {len(registry['observed'])}")
    print(f"Rejected: {len(registry['rejected'])}")
