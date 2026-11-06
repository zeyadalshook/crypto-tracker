import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Watchlist Favorites & 24H Sparklines', () => {
  it('calculates 24-hour percentage change and trend correctly from hourly closes', () => {
    // 24 simulated closes from 80000 to 82000 (+2.5%)
    const closes = Array.from({ length: 24 }, (_, i) => 80000 + i * (2000 / 23));
    const open24h = closes[0];
    const currentPrice = closes[closes.length - 1];
    const change24h = ((currentPrice - open24h) / open24h) * 100;
    const isPositive = change24h >= 0;

    assert.equal(closes.length, 24);
    assert.equal(Math.round(change24h * 100) / 100, 2.5);
    assert.equal(isPositive, true);
  });

  it('correctly detects negative 24-hour return and tags as red/negative', () => {
    const closes = Array.from({ length: 24 }, (_, i) => 2500 - i * (100 / 23));
    const open24h = closes[0];
    const currentPrice = closes[closes.length - 1];
    const change24h = ((currentPrice - open24h) / open24h) * 100;
    const isPositive = change24h >= 0;

    assert.equal(closes.length, 24);
    assert.equal(change24h < 0, true);
    assert.equal(isPositive, false);
  });

  it('normalizes SVG coordinates with padding within bounded viewBox', () => {
    const data = [10, 15, 8, 22, 19, 25];
    const width = 100;
    const height = 30;
    const paddingY = 4;
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const normalizedY = (val - minVal) / range;
      const y = height - paddingY - normalizedY * (height - paddingY * 2);
      return { x, y };
    });

    assert.equal(points.length, 6);
    points.forEach((p) => {
      assert.ok(p.x >= 0 && p.x <= width, `x=${p.x} out of bounds`);
      assert.ok(p.y >= paddingY && p.y <= height - paddingY, `y=${p.y} out of bounds`);
    });
  });

  it('manages favorite toggle list immutably', () => {
    let favorites = ['BTC', 'ETH', 'SOL', 'PYTH'];
    const toggle = (list: string[], sym: string) =>
      list.includes(sym) ? list.filter((s) => s !== sym) : [...list, sym];

    // Add NEAR
    favorites = toggle(favorites, 'NEAR');
    assert.deepEqual(favorites, ['BTC', 'ETH', 'SOL', 'PYTH', 'NEAR']);

    // Remove ETH
    favorites = toggle(favorites, 'ETH');
    assert.deepEqual(favorites, ['BTC', 'SOL', 'PYTH', 'NEAR']);

    // Re-add ETH
    favorites = toggle(favorites, 'ETH');
    assert.deepEqual(favorites, ['BTC', 'SOL', 'PYTH', 'NEAR', 'ETH']);
  });
});
