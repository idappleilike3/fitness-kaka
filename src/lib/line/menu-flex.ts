import type { GeneratedMenu } from "@/lib/menu/generator";

export function menuDeliveryFlex(menu: GeneratedMenu, menuUrl: string) {
  const first = menu.days[0];
  return {
    type: "flex",
    altText: "你的 7 天个人化减脂菜单准备好了",
    contents: {
      type: "bubble",
      styles: { header: { backgroundColor: "#315C46" } },
      header: { type: "box", layout: "vertical", contents: [
        { type: "text", text: "FITNESS KAKA", color: "#FFFFFF", weight: "bold", size: "sm" },
        { type: "text", text: "你的 7 天个人化菜单", color: "#FFFFFF", weight: "bold", size: "xl", margin: "sm" },
      ] },
      body: { type: "box", layout: "vertical", spacing: "md", contents: [
        { type: "text", text: `每日目标约 ${menu.calorieTarget} kcal・蛋白质 ${menu.proteinTarget}g`, wrap: true, color: "#315C46", weight: "bold" },
        { type: "text", text: `Day 1｜${first?.title ?? "从适合你的第一餐开始"}`, wrap: true, weight: "bold" },
        { type: "text", text: "不用每餐都完美，先照自己的生活做得到就很好。", wrap: true, color: "#666666" },
      ] },
      footer: { type: "box", layout: "vertical", contents: [{ type: "button", style: "primary", color: "#315C46", action: { type: "uri", label: "查看完整 Day 1～Day 7", uri: menuUrl } }] },
    },
  };
}
