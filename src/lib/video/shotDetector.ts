// src/lib/video/shotDetector.ts
// Turns per-frame ball detections into shots, using a rim position the player taps once.
// Coordinates are normalised to the frame (0..1, y grows downward).

export interface Rim {
  x: number; // centre
  y: number; // rim height
  width: number; // rim width (normalised to frame width)
}

export interface BallObservation {
  t: number; // milliseconds
  ball: { x: number; y: number } | null;
}

export interface DetectedShot {
  t: number; // time the shot was decided (ms)
  made: boolean;
  confident: boolean; // false when the result was inferred without seeing the ball cross the rim
}

const COOLDOWN_MS = 1200; // ignore rim bounces / put-backs right after a decision
const LOST_BALL_MS = 1500; // armed shot with the ball out of view this long -> miss
const MAX_FLIGHT_MS = 3500;
const APPROACH_WIDTHS = 3; // ball must be within this many rim widths sideways to count as a shot

export class ShotDetector {
  private armedAt: number | null = null;
  private lastAbove: { t: number; x: number; y: number } | null = null;
  private lastSeen = 0;
  private cooldownUntil = 0;
  readonly shots: DetectedShot[] = [];

  constructor(private rim: Rim) {}

  setRim(rim: Rim) {
    this.rim = rim;
  }

  /** Feed one frame. Returns a shot when one is decided on this frame. */
  push(obs: BallObservation): DetectedShot | null {
    const { rim } = this;
    const halfRim = rim.width / 2;

    if (obs.t < this.cooldownUntil) return null;

    // Armed shot but the ball vanished (went behind the backboard, out of frame...)
    if (this.armedAt !== null && !obs.ball) {
      if (obs.t - this.lastSeen > LOST_BALL_MS) return this.decide(obs.t, false, false);
      return null;
    }
    if (!obs.ball) return null;

    const { x, y } = obs.ball;
    this.lastSeen = obs.t;
    const sideways = Math.abs(x - rim.x);
    const aboveRim = y < rim.y - halfRim * 0.3;

    if (aboveRim && sideways < rim.width * APPROACH_WIDTHS) {
      if (this.armedAt === null) this.armedAt = obs.t;
      this.lastAbove = { t: obs.t, x, y };
      return null;
    }

    if (this.armedAt === null) return null;

    // Ball has come down to rim level: did it pass through the rim?
    if (y >= rim.y && this.lastAbove) {
      const prev = this.lastAbove;
      const fraction = (rim.y - prev.y) / Math.max(y - prev.y, 1e-6);
      const crossX = prev.x + (x - prev.x) * Math.min(1, Math.max(0, fraction));
      const throughRim = Math.abs(crossX - rim.x) <= halfRim * 1.1;
      const confident = obs.t - prev.t <= 250;
      return this.decide(obs.t, throughRim, confident);
    }

    if (sideways > rim.width * (APPROACH_WIDTHS + 1) || obs.t - this.armedAt > MAX_FLIGHT_MS) {
      return this.decide(obs.t, false, false);
    }
    return null;
  }

  private decide(t: number, made: boolean, confident: boolean): DetectedShot {
    const shot = { t, made, confident };
    this.shots.push(shot);
    this.armedAt = null;
    this.lastAbove = null;
    this.cooldownUntil = t + COOLDOWN_MS;
    return shot;
  }
}
