"use client";

import Image from "next/image";
import { FormEvent, useEffect, useReducer, useRef, useState } from "react";
import { getKakaSuggestion } from "./kaka-chat-rules";
import { createInitialChatState, kakaChatReducer, questionForTopic } from "./kaka-chat-state";
import styles from "./page.module.css";

type Props = { lineUrl: string };

function playKakaChime() {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + .11);
  gain.gain.setValueAtTime(.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.075, context.currentTime + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .2);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + .21);
  oscillator.addEventListener("ended", () => void context.close(), { once: true });
}

export function KakaChatbot({ lineUrl }: Props) {
  const [state, dispatch] = useReducer(kakaChatReducer, undefined, () => createInitialChatState(false));
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("kaka-chat-sound");
    if (stored === "on") dispatch({ type: "toggle-sound" });
  }, []);

  useEffect(() => {
    if (!state.isThinking) return;
    const timer = window.setTimeout(() => dispatch({ type: "answer" }), 620);
    return () => window.clearTimeout(timer);
  }, [state.isThinking, state.pendingQuestion]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [state.messages, state.isThinking]);

  const ask = (text: string) => {
    if (!text.trim()) return;
    dispatch({ type: "ask", text });
    setInput("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  const toggleSound = () => {
    const next = !state.soundOn;
    dispatch({ type: "toggle-sound" });
    window.localStorage.setItem("kaka-chat-sound", next ? "on" : "off");
    if (next) playKakaChime();
  };

  const open = () => {
    dispatch({ type: "open" });
    if (state.soundOn) playKakaChime();
  };

  return (
    <div className={styles.kakaChatRoot}>
      {state.isOpen && (
        <section className={styles.kakaChatPanel} aria-label="卡卡健康減脂問答" data-tilt>
          <header className={styles.kakaChatHeader}>
            <span className={styles.kakaChatAvatar}><Image src="/images/coach-portrait.webp" alt="Q 版卡卡教練" fill sizes="48px" /></span>
            <div><strong>卡卡問答</strong><small><i /> 免費規則回答・不使用付費 AI</small></div>
            <button type="button" onClick={toggleSound} aria-label={state.soundOn ? "關閉卡卡提示音" : "開啟卡卡提示音"}>{state.soundOn ? "🔊" : "🔇"}</button>
            <button type="button" onClick={() => dispatch({ type: "close" })} aria-label="關閉卡卡問答">×</button>
          </header>

          <div className={styles.kakaChatLog} ref={logRef} aria-live="polite">
            {state.messages.map((message) => (
              <div key={message.id} className={message.role === "coach" ? styles.kakaCoachMessage : styles.kakaUserMessage}>
                {message.text}
              </div>
            ))}
            {state.isThinking && <div className={styles.kakaThinking}><i /><i /><i /><span>卡卡正在想</span></div>}
          </div>

          <div className={styles.kakaSuggestions} aria-label="推薦問題">
            {state.followUps.map((id) => {
              const item = getKakaSuggestion(id);
              return <button key={id} type="button" disabled={state.isThinking} onClick={() => ask(questionForTopic(id))}>{item.label}</button>;
            })}
          </div>

          {state.lineUrl && <a className={styles.kakaLineAction} href={lineUrl} target="_blank" rel="noopener noreferrer">到 LINE 找卡卡真人聊聊</a>}

          <form className={styles.kakaChatForm} onSubmit={submit}>
            <label className={styles.srOnly} htmlFor="kaka-question">輸入健康減脂問題</label>
            <input id="kaka-question" value={input} onChange={(event) => setInput(event.target.value)} maxLength={80} placeholder="也可以自己輸入問題…" />
            <button type="submit" disabled={!input.trim() || state.isThinking} aria-label="送出問題">➜</button>
          </form>
          <p className={styles.kakaChatNotice}>一般生活指引，不提供疾病診斷或藥物建議。</p>
        </section>
      )}

      {!state.isOpen && <div className={styles.kakaChatNudge}>不知道怎麼開始？問卡卡</div>}
      <button className={styles.kakaChatLauncher} type="button" onClick={open} aria-label="開啟卡卡健康減脂問答" aria-expanded={state.isOpen}>
        <span><Image src="/images/coach-portrait.webp" alt="" fill sizes="66px" /></span>
        <i aria-hidden>?</i>
      </button>
    </div>
  );
}
