#!/usr/bin/env python3
"""
Football Data 同步脚本
从 football-data.org API 获取比赛数据，标准化后输出到前端可读的 JSON 文件。

使用方式:
  python3 scripts/ingest/fetch_football_data.py

环境变量:
  FOOTBALL_DATA_API_KEY - 从 .env 文件读取

输出:
  data/raw/football_data_org/<competition>.json        - 原始API响应
  data/processed/<competition>_matches.json            - 标准化比赛数据
  public/data/football_data_latest_matches.json         - 前端可读（全部比赛合并）
  public/data/football_data_competitions.json           - 前端可读（赛事列表）
  public/data/football_data_sync_status.json            - 前端可读（同步状态）
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ─── 配置 ────────────────────────────────────────────────
API_BASE = "https://api.football-data.org/v4"
COMPETITIONS = ["WC", "CL", "BL1", "DED", "BSA", "PD", "FL1", "ELC", "PPL", "EC", "SA", "PL"]
COMPETITION_NAMES = {
    "WC": "FIFA World Cup",
    "CL": "UEFA Champions League",
    "BL1": "Bundesliga",
    "DED": "Eredivisie",
    "BSA": "Campeonato Brasileiro Série A",
    "PD": "Primera Division (La Liga)",
    "FL1": "Ligue 1",
    "ELC": "Championship",
    "PPL": "Primeira Liga",
    "EC": "European Championship",
    "SA": "Serie A",
    "PL": "Premier League",
}

# 获取前后30天的日期范围
NOW = datetime.now(timezone.utc)
DATE_FROM = (NOW - timedelta(days=30)).strftime("%Y-%m-%d")
DATE_TO = (NOW + timedelta(days=30)).strftime("%Y-%m-%d")

# 路径
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "football_data_org"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"

# ─── 工具函数 ────────────────────────────────────────────

def load_api_key():
    """从 .env 文件读取 API Key"""
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return None, ".env 文件不存在"

    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if key == "FOOTBALL_DATA_API_KEY" and value:
                return value, None

    return None, ".env 中未找到 FOOTBALL_DATA_API_KEY"


def api_request(path, api_key, params=None):
    """发起 API 请求，返回 (data, error)"""
    url = f"{API_BASE}{path}"
    if params:
        query = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{url}?{query}"

    req = urllib.request.Request(url)
    req.add_header("X-Auth-Token", api_key)

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            remaining = resp.headers.get("X-Requests-Available", "?")
            reset = resp.headers.get("X-RequestCounter-Reset", "?")
            return data, None, {"remaining": remaining, "reset": reset}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        if e.code == 403:
            try:
                err_data = json.loads(error_body)
                msg = err_data.get("message", "权限不足")
            except json.JSONDecodeError:
                msg = "权限不足，可能免费版不支持该赛事"
            return None, f"403: {msg}", None
        elif e.code == 429:
            return None, "429: 请求频率限制，请稍后再试", None
        elif e.code == 404:
            return None, f"404: 资源不存在 ({path})", None
        else:
            return None, f"{e.code}: {error_body[:200]}", None
    except urllib.error.URLError as e:
        return None, f"网络错误: {e.reason}", None
    except Exception as e:
        return None, f"未知错误: {str(e)}", None


def normalize_match(match, competition_code):
    """将 API 比赛数据标准化为统一格式"""
    score = match.get("score", {})
    full_time = score.get("fullTime", {})
    home_score = full_time.get("home")
    away_score = full_time.get("away")

    if home_score is not None and away_score is not None:
        score_str = f"{home_score}-{away_score}"
    else:
        score_str = "VS"

    return {
        "competition": competition_code,
        "competitionName": COMPETITION_NAMES.get(competition_code, competition_code),
        "season": match.get("season", {}).get("startDate", ""),
        "utcDate": match.get("utcDate", ""),
        "homeTeam": match.get("homeTeam", {}).get("name", ""),
        "homeShortName": match.get("homeTeam", {}).get("shortName", ""),
        "homeTla": match.get("homeTeam", {}).get("tla", ""),
        "homeCrest": match.get("homeTeam", {}).get("crest", ""),
        "awayTeam": match.get("awayTeam", {}).get("name", ""),
        "awayShortName": match.get("awayTeam", {}).get("shortName", ""),
        "awayTla": match.get("awayTeam", {}).get("tla", ""),
        "awayCrest": match.get("awayTeam", {}).get("crest", ""),
        "status": match.get("status", ""),
        "score": score_str,
        "homeScore": home_score,
        "awayScore": away_score,
        "matchday": match.get("matchday", ""),
        "stage": match.get("stage", ""),
        "group": match.get("group"),
        "source": "football-data.org",
    }


# ─── 主同步逻辑 ──────────────────────────────────────────

def sync_competitions(api_key):
    """获取可用赛事列表"""
    print("📋 获取赛事列表...")
    data, error, meta = api_request("/competitions", api_key)

    if error:
        print(f"  ❌ 赛事列表获取失败: {error}")
        return None, error

    competitions = data.get("competitions", [])
    print(f"  ✅ 可用赛事: {len(competitions)} 个")

    # 保存原始数据
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with open(RAW_DIR / "competitions.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 标准化
    comp_list = []
    for c in competitions:
        comp_list.append({
            "id": c.get("id"),
            "name": c.get("name"),
            "code": c.get("code"),
            "area": c.get("area", {}).get("name"),
            "plan": c.get("plan", ""),
        })

    return comp_list, None


def sync_matches(api_key, competition_code):
    """获取指定赛事的比赛数据"""
    print(f"⚽ 同步 {competition_code} ({COMPETITION_NAMES.get(competition_code, '')}) 比赛...")

    params = {
        "dateFrom": DATE_FROM,
        "dateTo": DATE_TO,
    }
    data, error, meta = api_request(f"/competitions/{competition_code}/matches", api_key, params)

    if error:
        print(f"  ❌ {competition_code} 同步失败: {error}")
        return [], error

    matches = data.get("matches", [])
    print(f"  ✅ {competition_code}: {len(matches)} 场比赛 (范围: {DATE_FROM} ~ {DATE_TO})")

    if meta:
        print(f"     剩余请求: {meta['remaining']}  重置: {meta['reset']}s")

    # 保存原始数据
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with open(RAW_DIR / f"{competition_code}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 标准化
    normalized = [normalize_match(m, competition_code) for m in matches]

    # 保存标准化数据
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED_DIR / f"{competition_code}_matches.json", "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    return normalized, None


def main():
    print("=" * 60)
    print("  Football Data 同步脚本")
    print(f"  时间: {datetime.now(timezone.utc).isoformat()}")
    print(f"  日期范围: {DATE_FROM} ~ {DATE_TO}")
    print("=" * 60)
    print()

    # 1. 加载 API Key
    api_key, err = load_api_key()
    if not api_key:
        print(f"❌ API Key 加载失败: {err}")
        print("   请在 .env 文件中设置 FOOTBALL_DATA_API_KEY=your_key")
        write_sync_status(False, "API Key 缺失", [])
        sys.exit(1)

    print(f"✅ API Key 已加载: {api_key[:8]}...{api_key[-4:]}")
    print()

    # 2. 同步赛事列表
    competitions, err = sync_competitions(api_key)

    # 3. 同步各赛事比赛
    all_matches = []
    sync_results = []
    for code in COMPETITIONS:
        matches, error = sync_matches(api_key, code)
        status = "success" if not error else "failed"
        sync_results.append({
            "competition": code,
            "name": COMPETITION_NAMES.get(code, code),
            "matchCount": len(matches),
            "status": status,
            "error": error,
        })
        all_matches.extend(matches)
        # 礼貌延迟，避免触发频率限制
        time.sleep(1)

    # 4. 合并输出前端可读 JSON
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 全部比赛合并
    all_matches.sort(key=lambda m: m.get("utcDate", ""))
    with open(PUBLIC_DATA_DIR / "football_data_latest_matches.json", "w", encoding="utf-8") as f:
        json.dump({
            "totalMatches": len(all_matches),
            "lastSync": datetime.now(timezone.utc).isoformat(),
            "dateRange": {"from": DATE_FROM, "to": DATE_TO},
            "matches": all_matches,
        }, f, ensure_ascii=False, indent=2)
    print(f"\n📦 输出: football_data_latest_matches.json ({len(all_matches)} 场比赛)")

    # 赛事列表
    if competitions:
        with open(PUBLIC_DATA_DIR / "football_data_competitions.json", "w", encoding="utf-8") as f:
            json.dump({
                "total": len(competitions),
                "lastSync": datetime.now(timezone.utc).isoformat(),
                "competitions": competitions,
            }, f, ensure_ascii=False, indent=2)
        print(f"📦 输出: football_data_competitions.json ({len(competitions)} 个赛事)")

    # 5. 写入同步状态
    write_sync_status(True, None, sync_results, competitions)

    print(f"\n✅ 同步完成! 共 {len(all_matches)} 场比赛")
    print(f"   原始数据: data/raw/football_data_org/")
    print(f"   标准化数据: data/processed/")
    print(f"   前端数据: public/data/")


def write_sync_status(success, error_msg, sync_results, competitions=None):
    """写入同步状态文件"""
    status = {
        "source": "football-data.org",
        "subscription": "Free",
        "success": success,
        "error": error_msg,
        "lastSync": datetime.now(timezone.utc).isoformat(),
        "lastSyncLocal": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "availableCompetitions": COMPETITIONS,
        "competitionNames": COMPETITION_NAMES,
        "syncResults": sync_results,
        "totalCompetitions": len(COMPETITIONS),
        "successCount": sum(1 for r in sync_results if r["status"] == "success"),
        "failedCount": sum(1 for r in sync_results if r["status"] == "failed"),
        "totalMatches": sum(r["matchCount"] for r in sync_results),
    }
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(PUBLIC_DATA_DIR / "football_data_sync_status.json", "w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
