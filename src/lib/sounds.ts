"use client";
import type { AlertSound } from "./types";

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

export async function unlockAudio() {
  const c = getAudioContext();
  if (c.state === "suspended") await c.resume();
  // Play a near-silent blip so mobile browsers fully unlock the output.
  const osc = c.createOscillator();
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.05);
}

function tone(c: AudioContext, freq: number, start: number, duration: number, peak = 0.22) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + start);
  gain.gain.linearRampToValueAtTime(peak, c.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

export function playAlertSound(sound: AlertSound) {
  const c = getAudioContext();
  if (sound === "chime") {
    tone(c, 880, 0, 0.35);
    tone(c, 1318.5, 0.12, 0.4);
  } else if (sound === "bell") {
    tone(c, 987.77, 0, 0.6, 0.25);
    tone(c, 1975.53, 0, 0.6, 0.08);
  } else {
    tone(c, 1200, 0, 0.15, 0.18);
    tone(c, 1200, 0.18, 0.15, 0.18);
  }
}
