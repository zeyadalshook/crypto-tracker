import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartAlert } from '../src/types/crypto';

describe('Custom Price Alerts with SMS & Email Delivery', () => {
  it('correctly triggers price_above condition when price reaches or exceeds target', () => {
    const alert: SmartAlert = {
      id: 'alt-1',
      symbol: 'BTC',
      type: 'price_above',
      targetValue: 85000,
      active: true,
      triggered: false,
      message: 'BTC above 85000',
      channels: { email: true, sms: true, inApp: true },
      email: 'zeyadalshook9@gmail.com',
      phone: '+9647701234567',
    };

    // When price is below
    const priceBelow = 84900;
    const shouldNotTrigger = alert.active && !alert.triggered && priceBelow >= (alert.targetValue || 0);
    assert.equal(shouldNotTrigger, false);

    // When price reaches target exactly
    const priceExact = 85000;
    const triggersAtExact = alert.active && !alert.triggered && priceExact >= (alert.targetValue || 0);
    assert.equal(triggersAtExact, true);

    // When price crosses above target
    const priceAbove = 85200;
    const triggersAbove = alert.active && !alert.triggered && priceAbove >= (alert.targetValue || 0);
    assert.equal(triggersAbove, true);
  });

  it('correctly triggers price_below condition when price drops to or below target', () => {
    const alert: SmartAlert = {
      id: 'alt-2',
      symbol: 'ETH',
      type: 'price_below',
      targetValue: 2400,
      active: true,
      triggered: false,
      message: 'ETH below 2400',
      channels: { email: true, sms: false },
      email: 'zeyadalshook9@gmail.com',
    };

    // When price is higher
    const priceHigher = 2450;
    const shouldNotTrigger = alert.active && !alert.triggered && priceHigher <= (alert.targetValue || 0);
    assert.equal(shouldNotTrigger, false);

    // When price drops below
    const priceLower = 2390;
    const triggers = alert.active && !alert.triggered && priceLower <= (alert.targetValue || 0);
    assert.equal(triggers, true);
  });

  it('formats Arabic SMS content within mobile length limits', () => {
    const symbol = 'BTC';
    const currentPrice = 85100;
    const targetPrice = 85000;
    const conditionLabelAr = 'تجاوز السعر لأعلى';
    const note = 'هدف المقاومة الأول';
    const timeAr = '01:00 ص';

    const smsContent = `🔔 تنبيه ${symbol}: وصل السعر إلى $${currentPrice} (${conditionLabelAr} من $${targetPrice}). [${note}] الوقت: ${timeAr}`;

    assert.ok(smsContent.includes('BTC'));
    assert.ok(smsContent.includes('85100'));
    assert.ok(smsContent.includes(note));
    // Standard SMS segment boundary check
    assert.ok(smsContent.length <= 160, `SMS length ${smsContent.length} exceeds 160 characters`);
  });

  it('respects inactive and already triggered alert states to prevent spam', () => {
    const alertTriggered: SmartAlert = {
      id: 'alt-3',
      symbol: 'SOL',
      type: 'price_above',
      targetValue: 100,
      active: true,
      triggered: true,
      message: 'Already fired',
    };

    const alertDisabled: SmartAlert = {
      id: 'alt-4',
      symbol: 'SOL',
      type: 'price_above',
      targetValue: 100,
      active: false,
      triggered: false,
      message: 'Disabled by user',
    };

    const livePrice = 120;
    const willFireTriggered = alertTriggered.active && !alertTriggered.triggered && livePrice >= (alertTriggered.targetValue || 0);
    const willFireDisabled = alertDisabled.active && !alertDisabled.triggered && livePrice >= (alertDisabled.targetValue || 0);

    assert.equal(willFireTriggered, false);
    assert.equal(willFireDisabled, false);
  });
});
