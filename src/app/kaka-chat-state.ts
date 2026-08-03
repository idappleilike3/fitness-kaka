import { KAKA_LINE_URL, KAKA_SUGGESTIONS, KakaTopicId, matchKakaAnswer } from "./kaka-chat-rules";

export type ChatMessage = { id: number; role: "coach" | "user"; text: string };

export type KakaChatState = {
  isOpen: boolean;
  soundOn: boolean;
  isThinking: boolean;
  pendingQuestion: string;
  messages: ChatMessage[];
  followUps: KakaTopicId[];
  lineUrl?: string;
};

export type KakaChatAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "toggle-sound" }
  | { type: "ask"; text: string }
  | { type: "answer" };

export function createInitialChatState(soundOn: boolean): KakaChatState {
  return {
    isOpen: false,
    soundOn,
    isThinking: false,
    pendingQuestion: "",
    messages: [{ id: 1, role: "coach", text: "嗨，我是卡卡！想健康減脂，不用一開始就做到滿分。選一個問題，我陪你找今天最簡單的下一步。" }],
    followUps: ["healthy-loss", "today-meal", "trial"],
  };
}

export function kakaChatReducer(state: KakaChatState, action: KakaChatAction): KakaChatState {
  if (action.type === "open") return { ...state, isOpen: true };
  if (action.type === "close") return { ...state, isOpen: false };
  if (action.type === "toggle-sound") return { ...state, soundOn: !state.soundOn };
  if (action.type === "ask") {
    const text = action.text.trim();
    if (!text || state.isThinking) return state;
    return {
      ...state,
      isOpen: true,
      isThinking: true,
      pendingQuestion: text,
      lineUrl: undefined,
      messages: [...state.messages, { id: Date.now(), role: "user", text }],
    };
  }
  if (action.type === "answer" && state.isThinking) {
    const reply = matchKakaAnswer(state.pendingQuestion);
    return {
      ...state,
      isThinking: false,
      pendingQuestion: "",
      lineUrl: reply.lineUrl,
      followUps: reply.followUps,
      messages: [...state.messages, { id: Date.now() + 1, role: "coach", text: reply.answer }],
    };
  }
  return state;
}

export function questionForTopic(id: KakaTopicId): string {
  return KAKA_SUGGESTIONS.find((item) => item.id === id)?.label ?? "怎麼健康減脂？";
}

export { KAKA_LINE_URL };
