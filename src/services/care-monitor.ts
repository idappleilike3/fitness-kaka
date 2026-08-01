export type CareSignal =
  | {
      type: "inactive";
      severity: "medium";
      dedupeKey: string;
      reason: string;
      memberReply: string;
      adminRecommendation: string;
      evidence: Record<string, unknown>;
    }
  | {
      type: "low_intake";
      severity: "high";
      dedupeKey: string;
      reason: string;
      memberReply: string;
      adminRecommendation: string;
      evidence: Record<string, unknown>;
    };

export type CareMonitorContext = {
  memberName?: string | null;
  daysSinceLastMeal: number | null;
  lowIntakeConsecutiveDays: number;
  averageIntakeRatio: number | null;
};

function displayName(value?: string | null): string {
  return value?.trim() || "这位会员";
}

export function detectCareSignals(ctx: CareMonitorContext): CareSignal[] {
  const signals: CareSignal[] = [];
  const who = displayName(ctx.memberName);

  if (ctx.daysSinceLastMeal !== null && ctx.daysSinceLastMeal >= 3) {
    signals.push({
      type: "inactive",
      severity: "medium",
      dedupeKey: `inactive:${Math.min(ctx.daysSinceLastMeal, 7)}`,
      reason: `${who} 已连续 ${ctx.daysSinceLastMeal} 天没有新增饮食纪录，可能是工作忙、忘记纪录，或暂时失去节奏。`,
      memberReply: "最近是不是比较忙呢？不用补完前几天的纪录，从下一餐重新开始就好。你也可以告诉我是太忙、忘记拍，还是吃多了不想面对，我会帮你把步骤变简单。\n\n没有关系，我们从现在继续就好。",
      adminRecommendation: "建议先查看最近对话，再发送一次人工关怀；不要连续催促，也不要在这次关怀里推销方案。",
      evidence: { daysSinceLastMeal: ctx.daysSinceLastMeal },
    });
  }

  if (
    ctx.lowIntakeConsecutiveDays >= 3 &&
    ctx.averageIntakeRatio !== null &&
    ctx.averageIntakeRatio < 0.6
  ) {
    const ratioPercent = Math.round(ctx.averageIntakeRatio * 100);
    signals.push({
      type: "low_intake",
      severity: "high",
      dedupeKey: `low_intake:${ctx.lowIntakeConsecutiveDays}:${ratioPercent}`,
      reason: `${who} 已连续 ${ctx.lowIntakeConsecutiveDays} 天低于建议热量的 60%，平均约为目标的 ${ratioPercent}%，可能有过度节食风险。`,
      memberReply: "我注意到你这几天吃得比建议范围少很多。减脂不是吃得越少越好，长期反而更容易疲累、嘴馋或反弹。下一餐请正常吃，补一份主食和蛋白质就好。\n\n照顾好身体，比追求更低的数字重要。",
      adminRecommendation: "暂停进一步减量建议并人工确认近况；如涉及疾病、饮食失调或持续极端饮食，建议转介医师或合格营养师。",
      evidence: {
        lowIntakeConsecutiveDays: ctx.lowIntakeConsecutiveDays,
        averageIntakeRatio: ctx.averageIntakeRatio,
      },
    });
  }

  return signals;
}
