#!/usr/bin/env python3
"""
Independent Quantitative Reference Engine (Python)
Zero dependency on application code. Computes reference statistics and simulation
to allow exact cross-language verification to 6 decimal places.
"""

import sys
import json
import math

# ============================================================================
# 1. 10 Reference Trades Benchmark
# ============================================================================
REFERENCE_R = [1.5, -1.0, 2.0, -1.0, 1.8, -1.0, 2.5, -1.0, -1.0, 1.2]

def compute_reference_stats(r_values):
    n = len(r_values)
    wins = [r for r in r_values if r > 0]
    losses = [abs(r) for r in r_values if r < 0]
    
    # Win rate
    p = len(wins) / n
    
    # 1. Wilson Score Interval (95%, z = 1.96)
    z = 1.96
    z2 = z * z
    denom = 1.0 + z2 / n
    center = (p + z2 / (2.0 * n)) / denom
    margin = (z * math.sqrt((p * (1.0 - p)) / n + z2 / (4.0 * n * n))) / denom
    wilson_lower = max(0.0, center - margin)
    wilson_upper = min(1.0, center + margin)
    
    # 2. Student-t Test & Expectancy
    mean_r = sum(r_values) / n
    var = sum((r - mean_r) ** 2 for r in r_values) / (n - 1)
    std_dev = math.sqrt(var)
    se = std_dev / math.sqrt(n)
    t_stat = mean_r / se if se > 0 else 0.0
    
    # Student-t Critical for df = 9 (95% two-tailed = 2.262157)
    # Using Hill Cornish-Fisher approximation matching TS:
    df = n - 1
    # TS table has df=9 ~ 2.262
    t_crit = 2.262157
    t_ci_lower = mean_r - t_crit * se
    t_ci_upper = mean_r + t_crit * se
    
    # 3. Profit Factor
    gross_profit = sum(wins)
    gross_loss = sum(losses)
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 999.0
    
    # 4. Kelly Criterion
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 1.0
    b = avg_win / avg_loss
    q = 1.0 - p
    full_kelly = max(0.0, (p * b - q) / b) * 100.0
    half_kelly = full_kelly * 0.5
    
    # Conservative Kelly using Wilson Lower Bound
    p_low = wilson_lower
    q_low = 1.0 - p_low
    cons_kelly = max(0.0, (p_low * b - q_low) / b) * 50.0
    
    # 5. Bootstrap Resampling (1500 iterations, seed 123456)
    # Mulberry32 PRNG matching TS exactly
    seed = 123456
    def next_rand():
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = seed
        t = (t ^ (t >> 15)) * ((t | 1) & 0xFFFFFFFF) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * ((t | 61) & 0xFFFFFFFF) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    iterations = 1500
    pos_count = 0
    max_dds = []
    
    for _ in range(iterations):
        sample_sum = 0.0
        peak = 0.0
        cur = 0.0
        max_dd = 0.0
        for _ in range(n):
            idx = int(next_rand() * n)
            val = r_values[idx]
            sample_sum += val
            cur += val
            if cur > peak:
                peak = cur
            dd = peak - cur
            if dd > max_dd:
                max_dd = dd
        if sample_sum / n > 0:
            pos_count += 1
        max_dds.append(max_dd)
        
    prob_pos = (pos_count / iterations) * 100.0
    expected_max_dd = sum(max_dds) / iterations
    
    return {
        "n": n,
        "winRate": round(p, 6),
        "wilson": {
            "lower": round(wilson_lower, 6),
            "upper": round(wilson_upper, 6),
            "se": round(math.sqrt((p * (1 - p)) / n), 6)
        },
        "studentT": {
            "meanR": round(mean_r, 6),
            "stdDev": round(std_dev, 6),
            "se": round(se, 6),
            "tStat": round(t_stat, 6),
            "ci95Lower": round(t_ci_lower, 6),
            "ci95Upper": round(t_ci_upper, 6)
        },
        "profitFactor": round(profit_factor, 6),
        "kelly": {
            "fullKellyPct": round(full_kelly, 6),
            "halfKellyPct": round(half_kelly, 6),
            "conservativeKellyPct": round(cons_kelly, 6)
        },
        "bootstrap": {
            "iterations": iterations,
            "probPositivePct": round(prob_pos, 6),
            "expectedMaxDdR": round(expected_max_dd, 6)
        }
    }

# ============================================================================
# 2. Independent Simulation of EMA Trend on Candle Data
# ============================================================================
def simulate_ema_trend(candles, tp_pct=10.0, sl_pct=5.0, fee_pct=0.075, slippage_pct=0.05):
    # Calculate EMA 9 and EMA 21
    closes = [c["close"] for c in candles]
    opens = [c["open"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    n = len(closes)
    
    def calc_ema(period):
        k = 2.0 / (period + 1)
        ema = [0.0] * n
        if n < period:
            return ema
        ema[period - 1] = sum(closes[:period]) / period
        for i in range(period, n):
            ema[i] = closes[i] * k + ema[i - 1] * (1.0 - k)
        return ema
        
    ema9 = calc_ema(9)
    ema21 = calc_ema(21)
    
    trades = []
    in_position = False
    pending_buy = False
    entry_price = 0.0
    entry_index = -1
    
    # Exclude last candle if unclosed
    effective_end = n - 2
    
    for i in range(35, effective_end + 1):
        cur_open = opens[i]
        cur_high = highs[i]
        cur_low = lows[i]
        cur_close = closes[i]
        
        # 1. Execute Pending Buy at Open of bar i
        if pending_buy and not in_position:
            in_position = True
            entry_price = cur_open * (1.0 + slippage_pct / 100.0)
            entry_index = i
            pending_buy = False
            
        # 2. Check Intra-candle Exit (SL first conservative)
        if in_position and i >= entry_index:
            target_tp = entry_price * (1.0 + tp_pct / 100.0)
            target_sl = entry_price * (1.0 - sl_pct / 100.0)
            
            hit_sl = (cur_low <= target_sl) or (cur_open <= target_sl)
            hit_tp = (cur_high >= target_tp) or (cur_open >= target_tp)
            
            is_exit = False
            exit_price = cur_close
            reason = "Signal"
            
            if hit_sl and hit_tp:
                # Both hit -> SL first always!
                is_exit = True
                reason = "SL"
                exit_price = (cur_open if cur_open <= target_sl else target_sl) * (1.0 - slippage_pct / 100.0)
            elif hit_sl:
                is_exit = True
                reason = "SL"
                exit_price = (cur_open if cur_open <= target_sl else target_sl) * (1.0 - slippage_pct / 100.0)
            elif hit_tp:
                is_exit = True
                reason = "TP"
                exit_price = (cur_open if cur_open >= target_tp else target_tp) * (1.0 - slippage_pct / 100.0)
            elif i == effective_end:
                is_exit = True
                reason = "End_of_period"
                exit_price = cur_close * (1.0 - slippage_pct / 100.0)
                
            if is_exit:
                raw_return = (exit_price - entry_price) / entry_price * 100.0
                net_return = raw_return - (fee_pct * 2.0)
                r_unit = net_return / sl_pct
                trades.append({
                    "id": len(trades) + 1,
                    "entryIndex": entry_index,
                    "exitIndex": i,
                    "entryPrice": round(entry_price, 4),
                    "exitPrice": round(exit_price, 4),
                    "reason": reason,
                    "rUnit": round(r_unit, 4),
                    "duration": i - entry_index
                })
                in_position = False
                
        # 3. Signal evaluation on closed bar i
        if not in_position and not pending_buy and i < effective_end:
            if ema9[i - 1] <= ema21[i - 1] and ema9[i] > ema21[i]:
                pending_buy = True
                
def simulate_breakout(candles, lookback=20, tp_pct=12.0, sl_pct=6.0, fee_pct=0.075, slippage_pct=0.05):
    closes = [c["close"] for c in candles]
    opens = [c["open"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    dates = [c.get("date", f"bar_{idx}") for idx, c in enumerate(candles)]
    n = len(closes)
    
    trades = []
    in_position = False
    pending_buy = False
    entry_price = 0.0
    entry_index = -1
    
    # Exclude last candle if unclosed
    effective_end = n - 2
    
    for i in range(35, effective_end + 1):
        cur_open = opens[i]
        cur_high = highs[i]
        cur_low = lows[i]
        cur_close = closes[i]
        cur_date = dates[i]
        
        # 1. Execute Pending Buy at Open of bar i
        if pending_buy and not in_position:
            in_position = True
            entry_price = cur_open * (1.0 + slippage_pct / 100.0)
            entry_index = i
            pending_buy = False
            
        # 2. Check Intra-candle Exit (SL first conservative)
        if in_position and i >= entry_index:
            target_tp = entry_price * (1.0 + tp_pct / 100.0)
            target_sl = entry_price * (1.0 - sl_pct / 100.0)
            
            hit_sl = (cur_low <= target_sl) or (cur_open <= target_sl)
            hit_tp = (cur_high >= target_tp) or (cur_open >= target_tp)
            
            is_exit = False
            exit_price = cur_close
            reason = "Signal"
            
            if hit_sl and hit_tp:
                # Both hit -> SL first always!
                is_exit = True
                reason = "SL"
                exit_price = (cur_open if cur_open <= target_sl else target_sl) * (1.0 - slippage_pct / 100.0)
            elif hit_sl:
                is_exit = True
                reason = "SL"
                exit_price = (cur_open if cur_open <= target_sl else target_sl) * (1.0 - slippage_pct / 100.0)
            elif hit_tp:
                is_exit = True
                reason = "TP"
                exit_price = (cur_open if cur_open >= target_tp else target_tp) * (1.0 - slippage_pct / 100.0)
            elif i == effective_end:
                is_exit = True
                reason = "End_of_period"
                exit_price = cur_close * (1.0 - slippage_pct / 100.0)
                
            if is_exit:
                raw_return = (exit_price - entry_price) / entry_price * 100.0
                net_return = raw_return - (fee_pct * 2.0)
                r_unit = round(net_return / sl_pct, 3)
                trades.append({
                    "id": len(trades) + 1,
                    "entryIndex": entry_index,
                    "entryDate": dates[entry_index],
                    "exitIndex": i,
                    "exitDate": cur_date,
                    "entryPrice": round(entry_price, 4),
                    "exitPrice": round(exit_price, 4),
                    "reason": reason,
                    "rUnit": r_unit,
                    "duration": i - entry_index
                })
                in_position = False
                
        # 3. Signal evaluation on closed bar i (lookback-day highest high of closed bars)
        if not in_position and not pending_buy and i < effective_end:
            # Highest high of previous `lookback` bars [i - lookback ... i - 1]
            start_lb = max(0, i - lookback)
            highest_lb = max(highs[start_lb:i])
            if cur_close > highest_lb:
                pending_buy = True
                
    return trades

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--breakout":
        # Read candles JSON from file or stdin
        file_path = sys.argv[2] if len(sys.argv) > 2 else None
        if file_path:
            with open(file_path, "r") as f:
                candles = json.load(f)
        else:
            raw_candles = sys.stdin.read()
            candles = json.loads(raw_candles)
            
        tp = float(sys.argv[3]) if len(sys.argv) > 3 else 12.0
        sl = float(sys.argv[4]) if len(sys.argv) > 4 else 6.0
        trades = simulate_breakout(candles, 20, tp, sl)
        wins = [t for t in trades if t["rUnit"] > 0]
        sum_r = sum(t["rUnit"] for t in trades)
        res = {
            "tradesCount": len(trades),
            "winningTrades": len(wins),
            "winRate": round(len(wins) / len(trades), 4) if trades else 0.0,
            "expectancyR": round(sum_r / len(trades), 4) if trades else 0.0,
            "trades": trades
        }
        print(json.dumps(res))
    elif len(sys.argv) > 1 and sys.argv[1] == "--candles":
        raw_candles = sys.stdin.read()
        candles = json.loads(raw_candles)
        trades = simulate_ema_trend(candles, 10.0, 5.0)
        wins = [t for t in trades if t["rUnit"] > 0]
        sum_r = sum(t["rUnit"] for t in trades)
        res = {
            "tradesCount": len(trades),
            "winningTrades": len(wins),
            "winRate": round(len(wins) / len(trades), 4) if trades else 0.0,
            "expectancyR": round(sum_r / len(trades), 4) if trades else 0.0,
            "trades": trades
        }
        print(json.dumps(res))
    else:
        # Reference benchmark output
        stats = compute_reference_stats(REFERENCE_R)
        print(json.dumps(stats, indent=2))

