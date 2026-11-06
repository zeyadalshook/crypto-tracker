import { SmartAlert } from '../types/crypto';

const STORAGE_KEY = 'crypto_smart_alerts';
const NOTIFICATION_HISTORY_KEY = 'crypto_alert_dispatch_history';

export interface AlertNotificationPayload {
  alertId: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  condition: 'price_above' | 'price_below';
  channels: {
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
    telegram?: boolean;
  };
  recipientEmail?: string;
  recipientPhone?: string;
  note?: string;
}

export const loadStoredAlerts = (): SmartAlert[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse stored alerts:', err);
  }
  return [];
};

export const saveStoredAlerts = (alerts: SmartAlert[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.warn('Failed to save alerts to storage:', err);
  }
};

export const playAlertSound = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // ignore
  }
};

export const dispatchAlertNotification = async (
  payload: AlertNotificationPayload
): Promise<any> => {
  try {
    const res = await fetch('/api/alerts/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data.receipts;
    }
  } catch (err) {
    console.error('Alert notification dispatch error:', err);
  }
  return null;
};

/**
 * Checks all active price alerts against current prices.
 * Triggers alerts when price condition is met and dispatches notifications via selected channels (Email, SMS, In-App).
 */
export const evaluatePriceAlerts = async (
  currentPrices: Record<string, number>,
  onTriggered?: (alert: SmartAlert, price: number) => void
): Promise<SmartAlert[]> => {
  const alerts = loadStoredAlerts();
  let hasUpdates = false;
  const newlyTriggered: SmartAlert[] = [];

  for (const alert of alerts) {
    if (!alert.active || alert.triggered) continue;

    const sym = alert.symbol.toUpperCase();
    const livePrice = currentPrices[sym];
    if (livePrice === undefined || livePrice <= 0 || !alert.targetValue) continue;

    let conditionMet = false;
    if (alert.type === 'price_above' && livePrice >= alert.targetValue) {
      conditionMet = true;
    } else if (alert.type === 'price_below' && livePrice <= alert.targetValue) {
      conditionMet = true;
    }

    if (conditionMet) {
      alert.triggered = true;
      alert.triggeredAt = new Date().toISOString();
      hasUpdates = true;
      newlyTriggered.push(alert);

      // Dispatch to backend (handles Email, SMS, Webhook logging)
      try {
        const receipts = await dispatchAlertNotification({
          alertId: alert.id,
          symbol: alert.symbol,
          targetPrice: alert.targetValue,
          currentPrice: livePrice,
          condition: alert.type as 'price_above' | 'price_below',
          channels: alert.channels || { inApp: true, email: !!alert.email, sms: !!alert.phone },
          recipientEmail: alert.email,
          recipientPhone: alert.phone,
          note: alert.note,
        });

        if (receipts) {
          alert.deliveryStatus = {
            emailSent: !!receipts.email?.sent,
            smsSent: !!receipts.sms?.sent,
            timestamp: receipts.timestamp,
            details: receipts.formattedTime,
          };
        }
      } catch (e) {
        console.warn('Dispatch notification failed for alert:', alert.id, e);
      }

      if (onTriggered) {
        onTriggered(alert, livePrice);
      }
    }
  }

  if (hasUpdates) {
    saveStoredAlerts(alerts);
  }

  return newlyTriggered;
};
