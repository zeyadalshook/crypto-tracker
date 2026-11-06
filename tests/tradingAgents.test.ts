import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runTradingAgentsPipeline } from '../src/utils/tradingAgentsEngine';
import { CoinDetail, TechnicalAnalysisResult } from '../src/types/crypto';

const mockCoin: CoinDetail = {
  id: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  image: '',
  current_price: 68500,
  market_cap: 1350000000000,
  market_cap_rank: 1,
  fully_diluted_valuation: 1438500000000,
  total_volume: 42000000000,
  high_24h: 69400,
  low_24h: 67200,
  price_change_24h: 1200,
  price_change_percentage_24h: 1.78,
  circulating_supply: 19700000,
  total_supply: 21000000,
  max_supply: 21000000,
  ath: 73750,
  ath_change_percentage: -7.1,
  ath_date: '2024-03-14',
  atl: 67.81,
  atl_change_percentage: 100000,
  atl_date: '2013-07-06',
  last_updated: new Date().toISOString(),
};

const mockBullishAnalysis: TechnicalAnalysisResult = {
  trend: 'صاعد',
  recommendation: 'شراء قوي',
  momentumScore: 84,
  pivots: {
    pp: 68200,
    r1: 70000,
    r2: 72500,
    s1: 67000,
    s2: 65500,
    target: 71500,
    ema200: 61500,
    ema50: 66200,
    sma20: 67800,
  },
  distanceToR1Percent: 2.19,
  distanceToS1Percent: -2.19,
  distanceToTargetPercent: 4.38,
  rsi14: 56,
  macd: { macd: 420, signal: 310, histogram: 110 },
  adx14: 28,
  stochastic: { k: 62, d: 58 },
  cci20: 85,
  williamsR: -32,
  momentum10: 1100,
  annualizedVolatility: 45,
  bollingerBands: { upper: 71000, middle: 67500, lower: 64000 },
  atr14: 1450,
  supertrend: { trend: 'صاعد', value: 66400 },
  maConsensus: { buyCount: 10, neutralCount: 1, sellCount: 1, overall: 'شراء قوي', items: [] },
  oscillatorsConsensus: { buyCount: 6, neutralCount: 3, sellCount: 1, overall: 'شراء', items: [] },
  positivePoints: ['زخم إيجابي'],
  cautionPoints: [],
  isMixedPicture: false,
  volumeTrend: { currentVsAvgPercent: 25, isDeclining: false, isSurging: true },
  candlestickPatterns: [],
  chartPatterns: [],
  monthlyVolumes: [],
};

describe('TauricResearch / TradingAgents Multi-Agent Pipeline', () => {
  it('generates 4 specialized Analyst reports and 3 dialectical Bull vs Bear debate rounds', () => {
    const result = runTradingAgentsPipeline({
      coin: mockCoin,
      analysis: mockBullishAnalysis,
      riskProfile: 'balanced',
      killSwitchActive: false,
    });

    assert.equal(result.analysts.length, 4);
    assert.deepEqual(
      result.analysts.map((a) => a.id),
      ['technical', 'fundamental', 'sentiment', 'news']
    );
    assert.equal(result.debate.rounds.length, 3);
    assert.equal(result.debate.bullConvictionPct + result.debate.bearConvictionPct, 100);
    assert.equal(result.fundManager.finalAction, 'ENTER_LONG');
    assert.ok(result.fundManager.approvedRiskPct > 0);
  });

  it('enforces Risk Management Team VETO when Kill Switch is active', () => {
    const result = runTradingAgentsPipeline({
      coin: mockCoin,
      analysis: mockBullishAnalysis,
      riskProfile: 'aggressive',
      killSwitchActive: true,
    });

    assert.equal(result.riskReview.status, 'VETOED');
    assert.equal(result.fundManager.finalAction, 'HOLD_WAIT');
    assert.equal(result.fundManager.approvedRiskPct, 0);
  });

  it('enforces Risk Management Team VETO on severe negative security/regulatory news', () => {
    const result = runTradingAgentsPipeline({
      coin: mockCoin,
      analysis: mockBullishAnalysis,
      news: [
        {
          id: 'n1',
          title: 'Major bridge exploit and hack reported',
          source: 'CryptoAlert',
          url: '#',
          published_at: new Date().toISOString(),
          sentiment: 'negative',
          confidence: 95,
          arabic_summary: 'تم رصد اختراق أمني خطير',
        },
      ],
      riskProfile: 'balanced',
      killSwitchActive: false,
    });

    assert.equal(result.riskReview.status, 'VETOED');
    assert.equal(result.fundManager.finalAction, 'HOLD_WAIT');
  });
});
