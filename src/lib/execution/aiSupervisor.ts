// Read-Only AI Supervisor (المشرف الذكي للمراقبة وكشف الشذوذ)
// Strictly post-decision read-only role with ZERO authority to place orders or modify limits

export interface SupervisorDailyDigest {
  dateStr: string;
  totalIntentsGenerated: number;
  approvedCount: number;
  rejectedCount: number;
  executedTradesCount: number;
  totalPnlAmount: number;
  totalPnlR: number;
  riskStatusSummaryAr: string;
  detectedAnomalies: string[];
  digestTextAr: string;
  generatedAt: number;
  disclaimer: string;
}

export function generateSupervisorDigest(input: {
  intentsCount: number;
  approvedCount: number;
  rejectedCount: number;
  rejectionReasons: string[];
  dailyPnlAmount: number;
  dailyPnlR: number;
  dailyLossConsumedPct: number;
  avgSlippagePct: number;
  backtestExpectedSlippagePct: number;
}): SupervisorDailyDigest {
  const {
    intentsCount,
    approvedCount,
    rejectedCount,
    rejectionReasons,
    dailyPnlAmount,
    dailyPnlR,
    dailyLossConsumedPct,
    avgSlippagePct,
    backtestExpectedSlippagePct,
  } = input;

  const detectedAnomalies: string[] = [];

  // 1. Check slippage drift anomaly
  if (avgSlippagePct > backtestExpectedSlippagePct * 2 && avgSlippagePct > 0.08) {
    detectedAnomalies.push(
      `انحراف في الانزلاق السعري الفعلي (${avgSlippagePct.toFixed(2)}%) مقارنة بالباك تست (${backtestExpectedSlippagePct.toFixed(2)}%).`
    );
  }

  // 2. Check high rejection rate anomaly
  if (intentsCount >= 5 && rejectedCount / intentsCount > 0.7) {
    detectedAnomalies.push(
      `نسبة رفض غير معتادة من طبقة المخاطر (${Math.round((rejectedCount / intentsCount) * 100)}% من النوايا رُفضت).`
    );
  }

  // 3. Loss limit approach
  if (dailyLossConsumedPct >= 70) {
    detectedAnomalies.push(
      `اقتراب شديد من حد الخسارة اليومي: تم استهلاك ${dailyLossConsumedPct.toFixed(0)}% من السقف.`
    );
  }

  const riskStatusSummaryAr =
    dailyLossConsumedPct >= 70
      ? 'تحذير: استهلاك مرتفع لحد الخسارة اليومي'
      : dailyLossConsumedPct >= 40
      ? 'معتدل: المخاطرة ضمن النطاق الطبيعي'
      : 'آمن: الحساب بعيد تماماً عن حدود الخسارة';

  const digestTextAr = `
📊 ملخص التداول الآلي اليومي:
• عدد النوايا المتولدة: ${intentsCount} (مقبولة: ${approvedCount}، مرفوضة: ${rejectedCount}).
• النتيجة الصافية: ${dailyPnlAmount >= 0 ? '+' : ''}$${dailyPnlAmount.toFixed(2)} (${dailyPnlR >= 0 ? '+' : ''}${dailyPnlR.toFixed(2)} R).
• استهلاك حد الخسارة اليومي: ${dailyLossConsumedPct.toFixed(1)}%.
• متوسط الانزلاق المنفّذ: ${avgSlippagePct.toFixed(3)}% (مقابل متوقع ${backtestExpectedSlippagePct.toFixed(3)}%).
${
  detectedAnomalies.length > 0
    ? `\n⚠️ ملاحظات وشذوذ مرصود:\n` + detectedAnomalies.map((a) => `- ${a}`).join('\n')
    : `\n✅ لا توجد أي تشوهات تشغيلية؛ جميع الأوامر متطابقة مع افتراضات الباك تست.`
}
  `.trim();

  return {
    dateStr: new Date().toISOString().slice(0, 10),
    totalIntentsGenerated: intentsCount,
    approvedCount,
    rejectedCount,
    executedTradesCount: approvedCount,
    totalPnlAmount: dailyPnlAmount,
    totalPnlR: dailyPnlR,
    riskStatusSummaryAr,
    detectedAnomalies,
    digestTextAr,
    generatedAt: Date.now(),
    disclaimer: 'مولَّد بالذكاء الاصطناعي، للمراجعة والرقابة فقط - لا يملك أي صلاحيات تنفيذ.',
  };
}
