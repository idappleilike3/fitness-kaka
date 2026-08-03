import { describe, expect, it } from "vitest";
import { createInitialChatState, kakaChatReducer } from "@/app/kaka-chat-state";

describe("Kaka chatbot state", () => {
  it("opens with a friendly greeting and approved suggestions", () => {
    const state = kakaChatReducer(createInitialChatState(true), { type: "open" });
    expect(state.isOpen).toBe(true);
    expect(state.messages[0].text).toContain("我是卡卡");
    expect(state.followUps).toContain("trial");
  });

  it("moves from a visitor question through thinking to a local reply", () => {
    let state = createInitialChatState(false);
    state = kakaChatReducer(state, { type: "ask", text: "便利商店怎麼吃" });
    expect(state.isThinking).toBe(true);
    expect(state.messages.at(-1)).toMatchObject({ role: "user", text: "便利商店怎麼吃" });
    state = kakaChatReducer(state, { type: "answer" });
    expect(state.isThinking).toBe(false);
    expect(state.messages.at(-1)?.text).toContain("超商");
    expect(state.followUps.length).toBe(3);
  });

  it("routes unsafe questions to the fixed Fitness Kaka LINE without a network request", () => {
    let state = kakaChatReducer(createInitialChatState(false), { type: "ask", text: "我有糖尿病可以停藥嗎" });
    state = kakaChatReducer(state, { type: "answer" });
    expect(state.lineUrl).toBe("https://lin.ee/5rxQDpa");
    expect(state.messages.at(-1)?.text).toContain("醫師");
  });

  it("toggles sound without changing the conversation", () => {
    const before = createInitialChatState(true);
    const after = kakaChatReducer(before, { type: "toggle-sound" });
    expect(after.soundOn).toBe(false);
    expect(after.messages).toEqual(before.messages);
  });
});
