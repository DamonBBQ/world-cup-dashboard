#!/usr/bin/env python3
"""
策略自我进化流水线 - 主入口
用法：
  python scripts/evolution/run_strategy_evolution.py --window 3y --bankroll 500
  python scripts/evolution/run_strategy_evolution.py --window 5y --bankroll 500
  python scripts/evolution/run_strategy_evolution.py --window 10y --bankroll 500
"""

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "evolution"))

from evaluate_candidate_strategy import evaluate_all_candidates
from update_strategy_registry import update_registry

def main():
    parser = argparse.ArgumentParser(description="策略自我进化流水线")
    parser.add_argument("--window", choices=["3y", "5y", "10y"], default="3y", help="回测时间窗口")
    parser.add_argument("--bankroll", type=float, default=500, help="初始资金")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  策略自我进化流水线启动")
    print(f"  窗口: {args.window} | 初始资金: {args.bankroll}元")
    print(f"  时间: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    # Step 1: 评估所有候选策略
    print("[1/4] 评估候选策略...")
    results = evaluate_all_candidates(args.window, args.bankroll)
    print(f"  → 共评估 {len(results)} 个策略\n")

    # Step 2: 更新策略注册表
    print("[2/4] 更新策略注册表...")
    registry = update_registry(results)
    accepted = len(registry.get("accepted", []))
    observed = len(registry.get("observed", []))
    rejected = len(registry.get("rejected", []))
    print(f"  → 正式吸收: {accepted} | 观察: {observed} | 淘汰: {rejected}\n")

    # Step 3: 生成前端 JSON
    print("[3/4] 生成前端 JSON...")
    from pathlib import Path as P
    import importlib.util

    report_script = ROOT / "scripts" / "report" / "build_dashboard_json.py"
    spec = importlib.util.spec_from_file_location("build_dashboard_json", report_script)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.build_dashboard_json(results, registry, args.window, args.bankroll)
    print(f"  → exports/dashboard/ 已更新\n")

    # Step 4: 生成 Markdown 报告
    print("[4/4] 生成 Markdown 报告...")
    report_script2 = ROOT / "scripts" / "report" / "build_backtest_report.py"
    spec2 = importlib.util.spec_from_file_location("build_backtest_report", report_script2)
    mod2 = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(mod2)
    mod2.build_report(results, registry, args.window, args.bankroll)
    print(f"  → exports/backtests/ 已更新\n")

    print(f"{'='*60}")
    print(f"  进化完成！")
    print(f"  正式吸收: {accepted} 个策略")
    print(f"  观察: {observed} 个策略")
    print(f"  淘汰: {rejected} 个策略")
    print(f"{'='*60}\n")

    print("⚠️ 所有结果均为模拟回测，不构成投注建议。")
    print("⚠️ 历史表现不代表未来结果。")

if __name__ == "__main__":
    main()
