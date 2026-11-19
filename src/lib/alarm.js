/*
 * Timer alarm: a generated beep (no sound file) plus vibration where
 * supported. iPhones only allow sound after the page has played audio
 * during a tap, so call unlockAudio() inside the tap that starts a timer.
 * Every call fails silently; the on-screen alert is the fallback.
 */

let ctx = null
let repeat = null

function getContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null
    ctx = new AudioContextClass()
  }
  return ctx
}

export function unlockAudio() {
  try {
    // Newer iOS: play through the silent switch, like a media app
    if (navigator.audioSession) navigator.audioSession.type = 'playback'
    const c = getContext()
    if (!c) return
    if (c.state !== 'running') c.resume()
    const source = c.createBufferSource()
    source.buffer = c.createBuffer(1, 1, 22050)
    source.connect(c.destination)
    source.start(0)
  } catch {
    // no sound available
  }
}

function beep() {
  try {
    const c = getContext()
    if (c) {
      if (c.state !== 'running') c.resume()
      const t = c.currentTime
      for (const offset of [0, 0.3, 0.6]) {
        const osc = c.createOscillator()
        const gain = c.createGain()
        osc.type = 'square'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, t + offset)
        gain.gain.exponentialRampToValueAtTime(0.3, t + offset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.2)
        osc.connect(gain).connect(c.destination)
        osc.start(t + offset)
        osc.stop(t + offset + 0.22)
      }
    }
  } catch {
    // no sound available
  }
  try {
    navigator.vibrate?.([400, 200, 400])
  } catch {
    // no vibration (all iPhones)
  }
}

export function startAlarm() {
  if (repeat) return
  beep()
  repeat = setInterval(beep, 1200)
}

export function stopAlarm() {
  clearInterval(repeat)
  repeat = null
  try {
    navigator.vibrate?.(0)
  } catch {
    // no vibration
  }
}
