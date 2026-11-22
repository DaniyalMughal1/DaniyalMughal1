// The master timeline. Every beat of the short is placed here in absolute seconds.
//
//  0.0  ACT 1  the duel begins        run-ins, first red bolt dodged (hits ")"), duck + jump, slide, parry into "Covalent"
//  4.0  ACT 2  escalation             near miss, deflection, hop, forward roll, backflip, cover behind "GTM", the beam clash
//  8.6         the hit                hero blasted through "GTM"/"Math", lands face down
//  9.4  ACT 3  silence + comeback     villain gloats, dusts off, walks away; a twitch; the slow rise; the wand drops
// 13.3  ACT 4  super saiyan           hair sprouts, grows, flickers gold; aura; flash; perfect stillness
// 16.1  ACT 5  kamehameha charge      cupped hands, growing orb, villain's panicked spells get swallowed
// 18.9  ACT 6  the beam               villain silhouetted, text shaken loose
// 20.6  ACT 7  skeleton               pause, crack, tilt, arm falls off, dust, puff
// 23.2  ACT 8  the cleanup            looks around, puts a "G" back, the "T" falls on his head, awkward look, zip!
// 27.0         page restores itself   loop
import { DURATION, FLOOR, HERO_DIMS, VILLAIN_DIMS, W, type Theme } from "./config";
import { add, angleOf, clamp, dist, E, lerp, mix, rng, sub, wrapDeg, type V2 } from "./core/math";
import { attr, n1, translate } from "./core/svg";
import { Letter } from "./env/letters";
import { findGlyph, layoutText, wordGlyphs } from "./env/typography";
import { beam as kameBeam, chargeOrb, type KamePlan } from "./fx/kame";
import { debris, dustPuff, glowFx, impactStar, ringFx, sparks } from "./fx/particles";
import { aura, cracks, floatingDebris, hairNode, lightning, risingLines, type HairPlan } from "./fx/power";
import { rodNode, rodSim } from "./fx/props";
import { skeleton, type SkeletonPlan } from "./fx/skeleton";
import { beam as wandBeam, bolt, clashBall, impact } from "./fx/spells";
import { Fighter } from "./rig/fighter";
import { Scene } from "./scene";
import { figureNode } from "./render/figure";

/** Times worth inspecting (contact sheet, review). */
export const BEATS: [number, string][] = [
  [0.4, "opening"], [1.5, "face-off"], [2.12, "first red spell"], [2.3, "letter hit"], [2.62, "duck"],
  [2.98, "jump"], [3.4, "slide + cast"], [3.62, "parry"], [4.4, "near miss"], [5.3, "forward roll"],
  [5.85, "backflip"], [6.45, "cover"], [7.4, "clash"], [8.2, "green wins"], [8.62, "hit"], [8.8, "crash"],
  [10.0, "gloat"], [11.0, "silence"], [11.7, "push up"], [12.4, "rising"], [12.65, "wand drops"],
  [13.75, "hair grows"], [14.35, "flicker"], [14.7, "flash"], [15.3, "super saiyan"], [15.5, "tiny spell"],
  [16.9, "charge"], [17.6, "absorbed"], [18.4, "peak"], [18.92, "release"], [19.4, "beam"], [20.2, "silhouette"],
  [20.9, "skeleton"], [21.75, "crack + tilt"], [22.05, "arm falls"], [22.35, "collapse"], [22.75, "dust"],
  [23.6, "aftermath"], [24.2, "looks up"], [24.95, "picks up"], [25.8, "slots it"], [26.22, "bonk"],
  [26.8, "awkward"], [27.3, "zip"], [27.45, "restored"],
];

export function makeScene(th: Theme) {
  const sc = new Scene(th);
  const layout = layoutText();
  const letters = layout.glyphs.map((g) => new Letter(g));
  const L = (line: number, ch: string, nth = 0) => letters[findGlyph(layout, line, ch, nth).id];
  const word = (line: number, w: string) => wordGlyphs(layout, line, w).map((g) => letters[g.id]);
  const lineLetters = (line: number) => letters.filter((l) => l.gl.line === line);

  const H = new Fighter("hero", HERO_DIMS, "runWand", -62, 1);
  const V = new Fighter("villain", VILLAIN_DIMS, "run", 880, -1);
  const R = rng(2024);

  // ======================================================================= ACT 1
  // hero runs in, skids, settles into a guard
  H.key(0.1, { x: -61.6, y: "G" });
  H.key(0.35, { x: -17 }, E.inQ);
  H.key(0.95, { x: 197, pose: "runWand" }, E.lin);
  H.gait(0.1, 0.98, { run: true, armR: false });
  H.key(1.04, { pose: "skid", y: "G" }, E.outQ);
  H.key(1.17, { x: 236 }, E.outQ);
  H.key(1.38, { pose: "guard", y: "G" }, E.io);
  H.plant("both", 1.17, 2.8, { bin: 0.04, bout: 0.03 });
  H.key(1.62, { pose: ["guard", { head: -18, lean: 8 }], y: "G" }, E.io);
  H.key(1.78, { pose: "guard", x: 236, y: "G" }, E.io);
  // R1: overhand flick
  H.key(1.96, { pose: "castWind", x: 231, y: "G" }, E.out);
  H.key(2.03, { pose: ["castRelease", { wrR: -6, shR: 116, elR: 0 }], x: 243, y: "G" }, E.inQ);
  H.key(2.16, { pose: "castThrough", y: "G" }, E.outQ);
  H.key(2.44, { pose: "guard", x: 238, y: "G" }, E.io);
  // duck under G1
  H.key(2.58, { pose: "duck", y: "G" }, E.outQ);
  H.key(2.74, { pose: ["duck", { head: 20 }], y: "G" }, E.io);
  // jump over G2
  H.key(2.84, { pose: "takeoff", y: "G", x: 238 }, E.outQ);
  const hTake = H.y.at(2.84);
  H.key(2.98, { pose: "tuck", y: hTake - 42, x: 245 }, E.outQ);
  H.key(3.14, { pose: "land", y: "G", x: 252 }, E.inQ);
  H.key(3.17, { sy: 0.9, sx: 1.07 }, E.outQ);
  H.key(3.3, { sy: 1, sx: 1 }, E.outQ);
  H.plant("both", 3.14, 3.22, { bin: 0.02, bout: 0.04 });
  // slide forward + whip-cast R2
  H.key(3.24, { pose: "land", x: 252, y: "G" }, E.lin);
  H.key(3.31, { pose: ["whipWind", { hipR: 56, kneeR: 50, hipL: -30, kneeL: 40, lean: 16 }], y: "G" }, E.outQ);
  H.key(3.41, { pose: ["whipRelease", { hipR: 58, kneeR: 52, hipL: -32, kneeL: 30 }], y: "G" }, E.inQ);
  H.key(3.46, { x: 284 }, E.outC);
  H.key(3.75, { pose: "guard", y: "G" }, E.io);
  H.plant("both", 3.46, 4.27, { bin: 0.03, bout: 0.04 });

  // villain jogs in, slows to a stalk
  V.key(0.05, { x: 880, y: "G" });
  V.key(0.35, { x: 836, pose: "run" }, E.inQ);
  V.key(0.85, { x: 689 }, E.lin);
  V.key(1.15, { pose: "strut" }, E.io);
  V.key(1.55, { x: 566 }, E.outQ);
  V.gait(0.05, 1.58, { run: true, stance: 0.44, cadence: [2.2, 4.2] });
  V.key(1.7, { pose: ["idle", { head: -16, bend: -6, lean: -2 }], y: "G" }, E.io);
  V.plant("both", 1.58, 2.9, { bin: 0.06, bout: 0.03 });
  V.key(1.98, { pose: ["idle", { head: -12, bend: -6, lean: 0 }], y: "G", x: 566 }, E.io);
  // dodge R1: lean back
  V.key(2.13, { pose: "limbo", y: "G", x: 558 }, E.outQ);
  V.key(2.27, { pose: ["limbo", { head: -4 }], y: "G" }, E.io);
  // G1 at the hero's head
  V.key(2.45, { pose: "whipWind", y: "G", x: 566 }, E.outQ);
  V.key(2.57, { pose: "whipRelease", y: "G", x: 560 }, E.inQ);
  // G2 low
  V.key(2.66, { pose: "whipWind", y: "G" }, E.outQ);
  V.key(2.75, { pose: ["whipRelease", { shR: 64, wrR: -6, lean: 26, hipR: 40, kneeR: 50 }], y: "G" }, E.inQ);
  V.key(3.1, { pose: "guard", y: "G" }, E.io);
  // parry R2 up into "Covalent"
  V.key(3.42, { pose: "guard", y: "G" }, E.io);
  V.key(3.54, { pose: "parry", y: "G" }, E.outQ);
  V.key(3.8, { pose: "guard", y: "G" }, E.io);
  V.plant("both", 2.9, 3.96, { bin: 0.01, bout: 0.06 });

  // ======================================================================= ACT 2
  // villain advances, G3 at the head (near miss), G4 deflected
  V.key(3.96, { x: 566 });
  V.key(4.22, { x: 534, pose: "guard", y: "G" }, E.io);
  V.gait(3.96, 4.22, {});
  V.key(4.13, { pose: "whipWind", y: "G" }, E.out);
  V.key(4.24, { pose: "whipRelease", y: "G" }, E.inQ);
  V.key(4.34, { pose: "whipWind", y: "G" }, E.outQ);
  V.key(4.44, { pose: ["whipRelease", { shR: 84 }], y: "G" }, E.inQ);
  V.key(4.7, { pose: "guard", y: "G" }, E.io);
  V.plant("both", 4.22, 4.79, { bin: 0.06, bout: 0.03 });
  // R3: short hop back
  V.key(4.8, { pose: "crouch", y: "G" }, E.outQ);
  V.key(4.87, { pose: "takeoff", y: "G", x: 536 }, E.outQ);
  const vHop = V.y.at(4.87);
  V.key(4.98, { pose: "airSplit", y: vHop - 26, x: 548 }, E.outQ);
  V.key(5.1, { pose: "land", y: "G", x: 556 }, E.inQ);
  V.plant("both", 5.1, 5.15, { bin: 0.02, bout: 0.03 });
  // R4: forward roll under it, toward the hero
  V.key(5.16, { pose: "crouch", y: "G", pivot: 0.5 }, E.io);
  V.key(5.24, { pose: "roll", rot: 90, x: 530, y: "G" }, E.inQ);
  V.key(5.33, { rot: 180, x: 505, y: "G" }, E.lin);
  V.key(5.42, { rot: 270, x: 482, y: "G" }, E.lin);
  V.key(5.52, { pose: "crouch", rot: 360, x: 466, y: "G" }, E.outQ);
  V.rot.set(5.56, 0);
  V.key(5.62, { pose: "guardLow", y: "G" }, E.outQ);
  V.plant("both", 5.53, 5.98, { bin: 0.02, bout: 0.05 });
  // G5 point blank
  V.key(5.66, { pose: ["whipRelease", { lean: 20, hipR: 40, kneeR: 50 }], y: "G" }, E.inQ);
  V.key(5.9, { pose: "guard", y: "G" }, E.io);
  // presses forward, G6 at the hiding hero
  V.key(5.98, { x: 466 });
  V.key(6.2, { x: 452, pose: "whipWind", y: "G" }, E.io);
  V.gait(5.98, 6.2, {});
  V.key(6.28, { pose: ["whipRelease", { shR: 106 }], y: "G" }, E.inQ);
  V.plant("both", 6.2, 6.5, { bin: 0.04, bout: 0.06 });
  // settles for the big one
  V.key(6.5, { pose: "guard", x: 452, y: "G" }, E.io);
  V.key(6.86, { x: 496, y: "G" }, E.io);
  V.gait(6.5, 6.86, {});
  V.plant("both", 6.86, 8.3, { bin: 0.06, bout: 0.04 });
  V.key(7.04, { pose: ["bigWind", { lean: -6 }], y: "G" }, E.out);
  V.key(7.13, { pose: "bigRelease", y: "G", x: 500 }, E.inQ);
  V.key(7.25, { pose: ["clash", { head: -14 }], y: "G" }, E.outQ);
  V.key(7.6, { pose: "clashStrain", y: "G" }, E.io);
  V.key(7.92, { pose: "clash", y: "G" }, E.io);
  V.key(8.18, { pose: "clashStrain", y: "G", x: 504 }, E.io);
  V.tremble(7.2, 8.5, 1.6, 15, 0.5);
  // the violent push: lunge step
  V.key(8.4, { pose: ["clashStrain", { lean: 30, head: -6 }], x: 516, y: "G" }, E.inQ);
  V.plant("R", 8.3, 8.42, { at: [V.at(8.3).footR[0] - 16, FLOOR - 1.75], bin: 0.01, bout: 0.02 });
  V.plant("both", 8.44, 9.0, { bin: 0.04, bout: 0.06 });
  V.key(8.52, { pose: ["bigRelease", { lean: 26 }], y: "G", x: 520 }, E.snap);
  V.key(8.9, { pose: ["guard", { lean: 4 }], y: "G", x: 514 }, E.io);

  // hero: near miss, parry, counters, backflip, cover, clash
  H.key(4.29, { pose: "sideLean", y: "G", x: 280 }, E.outQ);
  H.key(4.4, { pose: ["sideLean", { head: -22 }], y: "G" }, E.io);
  H.key(4.5, { pose: "guard", y: "G", x: 284 }, E.io);
  H.key(4.58, { pose: "parry", y: "G" }, E.outQ);
  H.key(4.72, { pose: "whipWind", y: "G" }, E.io);
  H.key(4.82, { pose: "whipRelease", y: "G", x: 290 }, E.inQ);
  H.key(5.0, { pose: "whipWind", y: "G" }, E.io);
  H.key(5.12, { pose: "whipRelease", y: "G", x: 292 }, E.inQ);
  H.key(5.3, { pose: "guard", y: "G", x: 290 }, E.io);
  H.plant("both", 4.27, 5.57, { bin: 0.01, bout: 0.03 });
  // backflip over G5
  H.key(5.5, { pivot: 0 });
  H.key(5.58, { pose: "crouch", y: "G", pivot: 0.5 }, E.outQ);
  H.key(5.66, { pose: "takeoff", y: "G", x: 286 }, E.outQ);
  const hFlip = H.y.at(5.66);
  H.key(5.74, { pose: "tuck", rot: -120, x: 270, y: hFlip - 40 }, E.outQ);
  H.key(5.86, { rot: -240, x: 254, y: hFlip - 44 }, E.lin);
  H.key(5.98, { pose: "land", rot: -335, x: 242, y: hFlip - 14 }, E.inQ);
  H.key(6.06, { rot: -360, y: "G", x: 238 }, E.outQ);
  H.rot.set(6.1, 0);
  H.key(6.08, { sy: 0.9, sx: 1.06 }, E.outQ);
  H.key(6.18, { sy: 1, sx: 1 }, E.outQ);
  H.plant("both", 6.06, 6.17, { bin: 0.02, bout: 0.02 });
  // leap up and hang off "GTM" — head ducked behind the word
  const gG = L(3, "G").gl, gT = L(3, "T").gl, gM = L(3, "M", 0).gl;
  const ledgeY = gG.y1 - 0.5;
  H.key(6.14, { pose: ["crouch", { shR: 120, shL: 110 }], y: "G" }, E.io);
  H.key(6.2, { pose: ["takeoff", { shR: 176, elR: 8, shL: 172, elL: 8 }], y: "G", x: 246 }, E.outQ);
  const hangPose = { lean: 0, bend: 0, head: 22, shR: 178, elR: 6, wrR: 90, shL: 176, elL: 8, wrL: 0, hipR: 22, kneeR: 30, hipL: 6, kneeL: 14 };
  const hangX = (gG.cx + gT.cx) / 2 + 3;
  const hangY = ledgeY + 27 + 30 + 1;
  H.key(6.3, { pose: hangPose, x: hangX, y: hangY - 3 }, E.outQ);
  H.key(6.38, { pose: { ...hangPose, hipR: 30, kneeR: 50 }, y: hangY + 1 }, E.io);
  H.key(6.5, { pose: { ...hangPose, hipR: 14, kneeR: 20, head: 26 }, y: hangY }, E.io);
  H.key(6.62, { pose: { ...hangPose, head: 10 }, y: hangY - 1 }, E.io);
  H.reach("R", 6.27, 6.64, [gT.cx - 1, ledgeY], { bin: 0.05, bout: 0.04, bend: 1 });
  H.reach("L", 6.27, 6.64, [gG.cx + 1, ledgeY], { bin: 0.05, bout: 0.04, bend: 1 });
  H.key(6.8, { pose: "land", y: "G", x: 276 }, E.inQ);
  H.key(6.83, { sy: 0.92, sx: 1.05 }, E.outQ);
  H.key(6.92, { sy: 1, sx: 1 }, E.outQ);
  H.plant("both", 6.8, 8.06, { bin: 0.02, bout: 0.05 });
  // big spell
  H.key(7.02, { pose: "bigWind", y: "G", x: 278 }, E.out);
  H.key(7.12, { pose: "bigRelease", y: "G", x: 288 }, E.inQ);
  H.key(7.26, { pose: "clash", y: "G", x: 286 }, E.outQ);
  H.key(7.58, { pose: "clashStrain", y: "G", x: 290 }, E.io);
  H.key(7.86, { pose: "clash", y: "G", x: 288 }, E.io);
  H.key(8.06, { pose: "clashStrain", y: "G", x: 284 }, E.io);
  H.tremble(7.18, 8.56, 2.2, 17, 0.7);
  // losing: feet slide back
  const hfR = H.at(8.06).footR, hfL = H.at(8.06).footL;
  H.plant("R", 8.06, 8.54, { at: (t) => [hfR[0] - 16 * E.inQ(clamp((t - 8.06) / 0.48, 0, 1)), hfR[1]], bin: 0.001, bout: 0.03 });
  H.plant("L", 8.06, 8.54, { at: (t) => [hfL[0] - 14 * E.inQ(clamp((t - 8.06) / 0.48, 0, 1)), hfL[1]], bin: 0.001, bout: 0.03 });
  H.key(8.32, { pose: "clashLosing", y: "G", x: 276 }, E.io);
  H.key(8.52, { pose: ["clashLosing", { head: 24, lean: -6 }], y: "G", x: 268, pivot: 0 }, E.inQ);

  // ---- the hit: launched backward and up through "GTM" / "Math", lands face down
  const T_HIT = 8.56;
  H.key(T_HIT, { pivot: 0.5 }, E.lin);
  const y0 = H.y.at(T_HIT);
  H.key(8.62, { pose: "hitFly", rot: -30, x: 258, y: y0 - 40 }, E.inQ);
  H.key(8.9, { pose: "hitTumble", rot: -150, x: 222, y: y0 - 112 }, E.outQ);
  H.key(9.08, { pose: ["hitFly", { shR: 150, shL: 160 }], rot: -230, x: 198, y: y0 - 60 }, E.inQ);
  H.key(9.22, { pose: "proneImpact", rot: -262, x: 184, y: "G" }, E.inQ);
  const yLand = H.y.at(9.22);
  H.key(9.3, { rot: -266, y: yLand - 7, x: 180 }, E.outQ);
  H.key(9.4, { pose: "proneDown", rot: -270, y: "G", x: 178 }, E.inQ);
  H.key(9.5, { pose: ["proneDown", { kneeL: 34 }], y: "G" }, E.io);
  H.hold(11.08);
  // a twitch
  H.key(11.14, { pose: ["proneDown", { elR: 36, wrR: 40 }] }, E.outQ);
  H.key(11.24, { pose: ["proneDown", { elR: 4, wrR: 0 }] }, E.io);
  // push up
  const handFloor = (x: number): V2 => [x, FLOOR - 1.8];
  H.key(11.42, { pose: ["proneDown", { shR: 110, elR: 40, shL: 100, elL: 50, head: 30 }], y: "G" }, E.io);
  H.reach("R", 11.36, 12.28, handFloor(H.at(11.36).head[0] - 4), { bin: 0.12, bout: 0.16, bend: 1 });
  H.reach("L", 11.5, 12.1, handFloor(H.at(11.36).head[0] - 12), { bin: 0.12, bout: 0.16, bend: 1 });
  H.key(11.92, { pose: "pushUp", rot: -302, y: "G", x: 176 }, E.io);
  H.tremble(11.4, 12.95, 1.5, 13, 0.3);
  H.key(12.32, { pose: "kneel", rot: -352, y: "G", x: 182 }, E.io);
  H.key(12.72, { pose: "rising", rot: -360, y: "G", x: 184 }, E.io);
  H.key(12.98, { pose: "tired", y: "G", pivot: 0 }, E.io);
  H.plant("both", 12.72, 16.06, { bin: 0.08, bout: 0.04 });
  const T_WAND_DROP = 12.6;
  H.wandOn.set(T_WAND_DROP, false);
  H.key(13.24, { pose: ["tired", { head: 14, lean: 6, bend: 8 }], y: "G" }, E.io);

  // villain: recover, gloat, dust off, walk away... stop.
  V.key(9.12, { pose: ["stand", { bend: -8, head: -10 }], y: "G", x: 514 }, E.io);
  V.key(9.45, { pose: "gloat", y: "G" }, E.io);
  V.key(9.7, { pose: ["gloat", { head: -12, shR: 104 }], y: "G" }, E.io);
  V.plant("both", 9.0, 10.42, { bin: 0.06, bout: 0.05 });
  for (let i = 0; i < 4; i++) V.key(9.86 + i * 0.12, { pose: i % 2 ? "dustOff2" : "dustOff", y: "G" }, E.io);
  V.key(10.38, { pose: ["stand", { head: -8, bend: -6 }], y: "G" }, E.io);
  V.facing.set(10.44, 1);
  V.key(10.46, { x: 514, pose: "strut" }, E.io);
  V.key(11.22, { x: 578 }, E.lin);
  V.gait(10.46, 11.26, { cadence: [1.8, 2.4] });
  // frozen mid-step, then sets the foot down
  V.plant("both", 11.24, 11.46, { bin: 0.01, bout: 0.05 });
  V.key(11.28, { pose: ["strut", { head: 6 }], x: 579 }, E.outQ);
  V.key(11.5, { pose: ["stand", { head: 4 }], y: "G", x: 581 }, E.io);
  V.plant("both", 11.5, 12.94, { bin: 0.06, bout: 0.05 });
  V.facing.set(11.6, -1);
  V.key(11.62, { pose: ["stand", { head: -6 }], y: "G" }, E.outQ);
  V.key(11.9, { pose: "confused", y: "G" }, E.io);
  V.key(12.6, { pose: ["confused", { head: -24 }], y: "G" }, E.io);
  // cautious step back
  V.key(12.94, { x: 581 });
  V.key(13.3, { pose: "wary", x: 596, y: "G" }, E.io);
  V.gait(12.94, 13.3, {});
  V.plant("both", 13.3, 16.38, { bin: 0.05, bout: 0.05 });

  // ======================================================================= ACT 4 — super saiyan
  H.key(13.46, { pose: "powerCrouch", y: "G" }, E.io);
  H.key(13.8, { pose: "powerStrain", y: "G" }, E.io);
  H.key(14.3, { pose: ["powerStrain", { head: 22, lean: 12 }], y: "G" }, E.io);
  H.key(14.56, { pose: ["powerCrouch", { head: 34 }], y: "G" }, E.io);
  H.tremble(13.5, 14.62, 2.4, 19, 0.6);
  const T_FLASH = 14.68;
  H.key(T_FLASH, { pose: "scream", y: "G" }, E.snap);
  H.key(14.98, { pose: "ssjStand", y: "G" }, E.out);
  H.hold(16.06);

  V.key(14.78, { pose: ["wary", { head: -34, lean: -16 }], y: "G" }, E.outQ);
  V.key(15.1, { pose: ["wary", { head: -30 }], y: "G" }, E.io);
  V.key(15.3, { pose: ["wary", { shR: 96, elR: 10, wrR: 0, head: -20 }], y: "G" }, E.io);
  V.key(15.4, { pose: ["panicCast", { lean: -8 }], y: "G" }, E.snap);
  V.key(15.75, { pose: ["wary", { shR: 80, head: -16 }], y: "G" }, E.io);

  // ======================================================================= ACT 5 — kamehameha charge
  // rear foot slides back into a wide stance
  H.plant("R", 16.06, 18.92, { bin: 0.01, bout: 0.1 });
  const hfL2 = H.at(16.05).footL;
  H.plant("L", 16.06, 16.2, { at: hfL2, bin: 0.01, bout: 0.04 });
  H.plant("L", 16.36, 20.75, { at: [hfL2[0] - 16, hfL2[1]], bin: 0.08, bout: 0.1 });
  H.key(16.36, { pose: "kameSet", y: "G", x: 174 }, E.io);
  H.key(16.7, { pose: "kameCharge", y: "G", x: 172 }, E.io);
  const orbAt = (t: number): V2 => [H.x.at(t) - 22, H.y.at(t) - 2];
  H.reach("R", 16.5, 18.8, orbAt, { bin: 0.2, bout: 0.06, bend: 1 });
  H.reach("L", 16.5, 18.8, (t) => add(orbAt(t), [3, 1]), { bin: 0.2, bout: 0.06, bend: 1 });
  H.key(18.4, { pose: ["kameCharge", { lean: -10, bend: -6, kneeR: 60 }], y: "G", x: 170 }, E.io);
  H.tremble(16.9, 18.52, 0.9, 16, 0.25);
  H.key(18.56, { pose: ["kameCharge", { lean: -12, bend: -6, kneeR: 62 }], y: "G" }, E.io);
  const T_FIRE = 18.86;
  H.key(18.78, { pose: ["kameCharge", { lean: -13, bend: -7, kneeR: 62 }], y: "G" }, E.lin);
  H.key(T_FIRE, { pose: "kameFire", y: "G", x: 178 }, E.inQ);
  H.key(19.05, { pose: "kamePush", y: "G", x: 174 }, E.outQ);
  H.tremble(18.9, 20.6, 1.4, 20, 0.6);
  H.plant("R", 18.92, 23.7, { bin: 0.01, bout: 0.1 });
  H.key(20.6, { pose: "kamePush", y: "G", x: 170 }, E.io);
  H.hold(23.0);

  // villain panics: six spells swallowed by the orb
  const PANIC = [16.98, 17.26, 17.5, 17.74, 17.96, 18.16];
  V.key(16.5, { pose: ["panicCast", { shR: 70 }], y: "G" }, E.io);
  PANIC.forEach((tp, i) => {
    V.key(tp - 0.07, { pose: ["whipWind", { lean: -8, head: -14 }], y: "G" }, E.outQ);
    V.key(tp, { pose: ["panicCast", { lean: -12 - i * 1.5 }], y: "G" }, E.inQ);
  });
  V.key(18.36, { pose: ["wary", { shR: 110, head: -24 }], y: "G" }, E.io);
  V.key(18.82, { pose: ["wary", { shR: 116, head: -26, lean: -12 }], y: "G" }, E.io);
  V.tremble(16.9, 18.86, 1.2, 22, 0.4);

  // ======================================================================= ACT 6 — the beam
  const T_HITV = 18.96;
  V.key(T_HITV, { pose: "blown", y: "G", x: 604 }, E.snap);
  V.wandOn.set(18.97, false);
  V.key(19.08, { pose: "brace", y: "G", x: 606 }, E.outQ);
  V.tremble(19.0, 20.62, 3, 24, 1.2);
  V.key(20.6, { pose: ["brace", { lean: 24, head: 26 }], y: "G", x: 614 }, E.io);
  V.plant("both", 19.05, 20.62, { bin: 0.04, bout: 0.01 });
  const T_SKEL = 20.62;
  V.visible.set(T_SKEL, false);
  V.visible.set(DURATION - 0.01, true);
  // villain resets offscreen for the loop
  V.key(T_SKEL + 0.01, { pose: "run", x: 880, y: "G" }, E.step);
  V.facing.set(T_SKEL + 0.02, -1);

  // ======================================================================= ACT 8 — cleanup
  H.key(23.6, { pose: "ssjStand", y: "G", x: 172 }, E.io);
  H.key(23.82, { pose: ["ssjStand", { head: -8 }], y: "G" }, E.io);
  H.key(24.05, { pose: "lookUp", y: "G" }, E.io);
  H.key(24.4, { pose: ["lookUp", { head: -26 }], y: "G" }, E.io);
  // where did the "G" land? (it fell when he crashed through "GTM")
  const Gl = L(3, "G");
  const T_G_HIT = 8.68;
  Gl.fall(T_G_HIT, -120, -260, -520, { rest: 0 });
  const gRest = Gl.center(12);
  // ...right by his feet. He notices it, picks it up.
  H.key(24.5, { pose: ["stand", { head: 26, lean: 8 }], y: "G" }, E.io);
  H.plant("L", 20.75, 25.06, { bin: 0.01, bout: 0.06 });
  H.plant("R", 23.7, 25.06, { at: H.at(23.69).footR, bin: 0.01, bout: 0.06 });
  H.key(24.78, { pose: ["bendPick", { lean: 64 }], y: "G" }, E.io);
  H.reach("R", 24.66, 24.86, [gRest[0], gRest[1] + 3], { bin: 0.14, bout: 0.14, bend: 1 });
  const T_GRAB = 24.82;
  H.key(25.0, { pose: ["stand", { shR: 40, elR: 76, head: -8 }], y: "G" }, E.io);
  // walks it back under its slot, tiptoes, slots it in
  const slot: V2 = [Gl.gl.cx, Gl.gl.cy];
  const standX = slot[0] - 4;
  H.key(25.04, { x: H.x.at(25.0) });
  H.key(25.62, { x: standX, pose: ["walk", { shR: 44, elR: 80, wrR: 0, head: -16 }], y: "G" }, E.io);
  H.gait(25.04, 25.64, { armR: false });
  H.plant("both", 25.64, 26.94, { bin: 0.04, bout: 0.03 });
  H.key(25.82, { pose: "reachUp", y: "G", dy: -4 }, E.io);
  H.reach("R", 25.72, 25.92, [slot[0] - 1, slot[1] + 9], { bin: 0.1, bout: 0.16, bend: -1 });
  const T_SLOT = 25.84;
  H.key(26.02, { pose: ["stand", { head: -16 }], y: "G" }, E.io);
  // proud little nod
  H.key(26.14, { pose: ["stand", { head: 8 }], y: "G" }, E.io);
  H.key(26.26, { pose: ["stand", { head: -4 }], y: "G" }, E.io);
  // bonk: the "T" next to it drops on his head
  const T_BONK = 26.4;
  H.key(T_BONK + 0.03, { pose: ["awkward", { head: 28, lean: 6, shR: 34, shL: -34, elR: 64, elL: 64 }], y: "G", dy: 2 }, E.snap);
  H.key(26.56, { pose: "awkward", y: "G" }, E.io);
  // ...slowly turns to look at the viewer
  H.key(26.7, { pose: "facing", y: "G" }, E.io);
  H.key(26.92, { pose: ["facing", { head: 9, shR: 14, shL: -14, elR: 10, elL: 10 }], y: "G" }, E.io);
  // backs off... and zips out
  H.key(26.95, { x: standX });
  H.key(27.15, { x: standX - 18, pose: ["sneak", { head: 4 }], y: "G" }, E.io);
  H.gait(26.95, 27.16, { cadence: [3.4, 3.6] });
  H.facing.set(27.17, -1);
  H.key(27.2, { pose: "sprint", y: "G" }, E.outQ);
  H.key(DURATION, { x: -62 }, E.inQ);
  H.gait(27.17, DURATION, { run: true, cadence: [5.5, 6] });

  // all keys are in: drop anything evaluated while authoring
  H.clearCache();
  V.clearCache();

  // ======================================================================= render the fighters
  const hairPlan: HairPlan = { sprout: 13.36, grow0: 13.62, flick0: 14.12, flash: T_FLASH };
  const hair = hairNode(sc, H, hairPlan);
  const heroFig = figureFor(H, th.ink, { color: th.wand, width: 2.2 }, hair, (t) => t < T_WAND_DROP);
  const hidden: [number, number] = [6.25, 6.66];
  sc.heroUse = { node: heroFig, behind: hidden };

  const T_SIL0 = 19.02;
  const villFig = figureFor(V, th.villain, { color: th.villainWand, edge: th.villainWandEdge, width: 1.6 }, undefined, (t) => t < 18.97, {
    alt: (t) => t >= T_SIL0 && t < T_SKEL,
    inkAlt: th.silhouette,
    vis: (t) => V.visible.at(t),
  });
  sc.add("chars", villFig);

  // dropped hero wand
  {
    const w = H.at(T_WAND_DROP);
    const sim = rodSim(w.handR, w.wandTip, [10, 30], 260, { bounce: 2 });
    const rod = rodNode(sim, T_WAND_DROP, 27.3, { stroke: th.wand, "stroke-width": 2.2 });
    rod.ch!.push(attr("opacity", (t) => 1 - clamp((t - 26.96) / 0.22, 0, 1)));
    sc.add("chars", rod);
  }
  // villain wand flies off
  {
    const w = V.at(18.97);
    const sim = rodSim(w.handR, w.wandTip, [300, -420], 1400, { bounce: 2 });
    for (const [stroke, w2] of [[th.villainWandEdge, 3], [th.villainWand, 1.6]] as [string, number][]) {
      const rod = rodNode(sim, 18.97, 27.3, { stroke, "stroke-width": w2 });
      rod.ch!.push(attr("opacity", (t) => 1 - clamp((t - 26.96) / 0.22, 0, 1)));
      sc.add("fx", rod);
    }
  }

  // ======================================================================= effects, act by act
  const tipH = (t: number) => H.at(t).wandTip;
  const tipV = (t: number) => V.at(t).wandTip;
  const ext = (a: V2, b: V2, x: number): V2 => {
    const k = (x - a[0]) / (b[0] - a[0]);
    return [x, a[1] + (b[1] - a[1]) * k];
  };
  /** A spell leaves the wand at the instant the wand is actually pointing at its target. */
  const shoot = (
    f: Fighter,
    tApprox: number,
    t1: number,
    aim: V2,
    o: { kind: "red" | "green"; end?: "burst" | "fizzle" | "none" | "small"; size?: number; extendTo?: number },
  ) => {
    let best = tApprox, err = 1e9;
    for (let t = tApprox - 0.06; t <= tApprox + 0.06; t += 1 / 240) {
      const w = f.at(t);
      const e = Math.abs(wrapDeg(angleOf(sub(w.wandTip, w.handR)) - angleOf(sub(aim, w.wandTip))));
      if (e < err) {
        err = e;
        best = t;
      }
    }
    const from = f.at(best).wandTip;
    const to = o.extendTo !== undefined ? ext(from, aim, o.extendTo) : aim;
    return bolt(sc, { t0: best, t1, from, to, kind: o.kind, end: o.end, size: o.size });
  };

  // ---- ACT 1
  const close = L(3, ")");
  shoot(H, 2.03, 2.27, [close.gl.cx + 0.5, close.gl.y2 - 2.5], { kind: "red" });
  close.knock(2.27, 5, -2, 24, { keep: 0.35, dur: 0.7 });
  scorch(sc, [close.gl.cx - 3, close.gl.cy + 3], 2.27, 6);
  // G1 at the head, G2 at the shins
  {
    const aim = H.at(2.4).head;
    shoot(V, 2.57, 2.96, [aim[0], aim[1] - 2], { kind: "green", end: "none", extendTo: -40 });
    shoot(V, 2.75, 3.16, [240, 322], { kind: "green", end: "none", extendTo: -40 });
  }
  dustPuff(sc, 1.06, [H.at(1.06).footR[0], FLOOR], { n: 6, color: th.debris, size: 3.6 });
  dustPuff(sc, 3.15, [H.at(3.15).pelvis[0], FLOOR], { n: 6, color: th.debris, size: 3.6 });
  dustPuff(sc, 3.32, [H.at(3.32).footR[0], FLOOR], { n: 4, color: th.debris, size: 3, spread: 0.6 });
  // R2: parried up into "Covalent"
  const cv = L(2, "v");
  const r2b = tipV(3.55);
  shoot(H, 3.41, 3.55, r2b, { kind: "red", end: "none" });
  impact(sc, 3.55, r2b, "red", 180, 0.55);
  bolt(sc, { t0: 3.55, t1: 3.73, from: r2b, to: [cv.gl.cx, cv.gl.cy + 2], kind: "red", muzzle: false });
  cv.knock(3.73, -3, -9, -28, { keep: 0.22, dur: 0.85, freq: 3 });
  L(2, "o").wobble(3.76, 8, 0.6);
  L(2, "a", 0).wobble(3.78, 6, 0.6);
  scorch(sc, [cv.gl.cx, cv.gl.cy + 4], 3.73, 5);

  // ---- ACT 2
  {
    const aim = H.at(4.2).head;
    shoot(V, 4.24, 4.6, [aim[0], aim[1] - 4], { kind: "green", end: "none", extendTo: -40 });
  }
  // G4 deflected by the hero into "Math"
  const mt = L(1, "t", 0);
  const g4b = tipH(4.57);
  shoot(V, 4.44, 4.57, g4b, { kind: "green", end: "none" });
  impact(sc, 4.57, g4b, "green", 0, 0.55);
  bolt(sc, { t0: 4.57, t1: 4.72, from: g4b, to: [mt.gl.cx, mt.gl.cy + 3], kind: "green", muzzle: false });
  mt.knock(4.72, 3, -8, 30, { keep: 0.18, dur: 0.8 });
  L(1, "h", 0).wobble(4.75, 7, 0.6);
  scorch(sc, [mt.gl.cx, mt.gl.cy + 5], 4.72, 5);
  // R3 + R4 miss to the right
  {
    shoot(H, 4.82, 5.2, V.at(4.8).chest, { kind: "red", end: "none", extendTo: W + 40 });
    shoot(H, 5.12, 5.48, add(V.at(5.12).neck, [0, 2]), { kind: "red", end: "none", extendTo: W + 40 });
  }
  dustPuff(sc, 5.1, [V.at(5.1).pelvis[0], FLOOR], { n: 5, color: th.debris, size: 3.4 });
  dustPuff(sc, 5.5, [V.at(5.5).pelvis[0], FLOOR], { n: 5, color: th.debris, size: 3.4 });
  // G5 under the backflip
  {
    shoot(V, 5.66, 5.98, [270, 290], { kind: "green", end: "none", extendTo: -40 });
  }
  dustPuff(sc, 6.06, [H.at(6.06).pelvis[0], FLOOR], { n: 6, color: th.debris, size: 3.6 });
  // G6 splashes on "GTM" while he hides behind it
  shoot(V, 6.28, 6.43, [gT.cx + 2, gT.cy + 2], { kind: "green" });
  L(3, "G").knock(6.43, -2, -2, -10, { keep: 0, dur: 0.6 });
  L(3, "T").knock(6.43, 1, -3, 9, { keep: 0.25, dur: 0.7 });
  L(3, "M", 0).knock(6.44, 2, -1, 6, { keep: 0, dur: 0.6 });
  scorch(sc, [gT.cx + 2, gT.cy + 4], 6.43, 7);
  sc.halo = { glyphs: [gG.id, gT.id, gM.id], t0: hidden[0], t1: hidden[1] };
  dustPuff(sc, 6.8, [H.at(6.8).pelvis[0], FLOOR], { n: 5, color: th.debris, size: 3.4 });

  // ---- the clash
  const C0 = 7.16, C1 = T_HIT;
  const frac = (t: number) => {
    const keys: [number, number][] = [[C0, 0.5], [7.4, 0.56], [7.62, 0.47], [7.86, 0.55], [8.04, 0.5], [8.22, 0.38], [8.4, 0.24], [8.5, 0.1], [C1, 0]];
    for (let i = 0; i < keys.length - 1; i++) {
      const [ta, a] = keys[i], [tb, b] = keys[i + 1];
      if (t <= tb) return lerp(a, b, E.io(clamp((t - ta) / (tb - ta), 0, 1)));
    }
    return 0;
  };
  const meet = (t: number): V2 => {
    const a = tipH(Math.max(t, C0)), b = tipV(Math.max(t, C0));
    const ext0 = clamp((t - (C0 - 0.06)) / 0.1, 0, 1);
    const p = mix(a, b, frac(t));
    return ext0 < 1 ? p : p;
  };
  const grow = (t: number) => E.outQ(clamp((t - (C0 - 0.04)) / 0.1, 0, 1));
  wandBeam(sc, "back", { t0: C0 - 0.04, t1: C1, from: tipH, to: (t) => mix(tipH(t), meet(t), grow(t)), kind: "red", width: (t) => 2.6 * (frac(t) > 0.05 ? 1 : frac(t) * 20), seed: 3 });
  wandBeam(sc, "back", { t0: C0 - 0.04, t1: C1 + 0.04, from: tipV, to: (t) => mix(tipV(t), meet(t), grow(t)), kind: "green", width: (t) => 2.6 + (t > 8.1 ? 1.6 * clamp((t - 8.1) / 0.3, 0, 1) : 0), seed: 7 });
  clashBall(sc, C0 + 0.04, C1, meet, (t) => 0.7 + 0.3 * grow(t) + (t > 8.3 ? 0.4 : 0));
  glowFx(sc, "fx", C0 + 0.04, meet(C0 + 0.05), { r0: 10, r1: 46, life: 0.3, grad: "glow-clash" });
  sc.shake(C0, C1, 0.7, 26, false);
  // line 3 rides the clash like a guitar string
  for (const l of lineLetters(3)) {
    l.layer(C0, C1 + 0.4, (t) => {
      const env = clamp((t - C0) / 0.4, 0, 1) * (t > C1 ? Math.exp(-(t - C1) * 9) : 1) * (1 + (t > 8.1 ? 0.8 : 0));
      const c = meet(Math.min(t, C1));
      const near = Math.exp(-(((l.gl.cx - c[0]) / 120) ** 2));
      return [0, Math.sin(l.gl.cx * 0.09 - t * 31) * 2.2 * env * (0.4 + near), Math.sin(l.gl.cx * 0.07 - t * 25) * 3 * env * near];
    });
  }
  for (const l of lineLetters(2)) l.shake(C0 + 0.2, C1, 0.5, 20);

  // ---- the hit
  glowFx(sc, "fx", T_HIT, H.at(T_HIT).chest, { r0: 16, r1: 40, life: 0.16, grad: "glow-green", peak: 0.9, attack: 0.015 });
  impactStar(sc, "fx", T_HIT, H.at(T_HIT).chest, { r: 30, fill: th.green.core, edge: th.green.body, life: 0.12, seed: 5 });
  impactStar(sc, "fx", T_HIT + 0.05, H.at(T_HIT + 0.05).chest, { r: 18, fill: th.green.glow, life: 0.1, seed: 6, rot: 20 });
  sparks(sc, "fx", T_HIT, H.at(T_HIT).chest, { n: 14, color: th.green.body, speed: [160, 380], life: 0.4, dir: 200, spread: 220 });
  sparks(sc, "fx", T_HIT, H.at(T_HIT).chest, { n: 6, color: th.spark, speed: [100, 260], life: 0.36, dir: -90, spread: 200, seed: 9 });
  sc.shake(T_HIT, T_HIT + 0.45, 4, 24, true);
  // crash through letters
  L(3, "T").wobble(8.66, 12, 0.7);
  L(3, "T").knock(8.68, -3, 0, -7, { keep: 1, dur: 0.3 });
  L(3, "M", 0).wobble(8.67, 9, 0.6);
  L(1, "M", 0).fall(8.8, -160, -160, -620);
  L(1, "a", 0).fall(8.83, -90, -220, 480);
  L(1, "t", 0).wobble(8.86, 10, 0.6);
  L(1, "h", 0).wobble(8.88, 6, 0.5);
  L(0, "H").wobble(8.9, 4, 0.7);
  L(0, "i", 0).wobble(8.92, 6, 0.6);
  L(0, ",").knock(8.9, -2, 2, -20, { keep: 0.3 });
  debris(sc, 8.68, [gG.cx, gG.cy], { n: 6, color: th.debris, dir: -150, spread: 90, speed: [120, 260] });
  debris(sc, 8.82, [L(1, "M", 0).gl.cx, L(1, "M", 0).gl.cy], { n: 5, color: th.debris, dir: -140, spread: 100, speed: [100, 240] });
  dustPuff(sc, 9.22, [H.at(9.22).chest[0], FLOOR], { n: 9, color: th.debris, size: 4.4, spread: 1.4 });
  debris(sc, 9.22, [H.at(9.22).chest[0], FLOOR - 3], { n: 6, color: th.debris, dir: -90, spread: 120, speed: [80, 180] });
  sc.shake(9.22, 9.5, 2.4, 26, true);
  // the hero's wand rolls free on landing? no — it stays in his hand until he stands.

  // ---- ACT 3: wand drop, sparks, cracks
  dustPuff(sc, T_WAND_DROP + 0.18, [H.at(T_WAND_DROP).handR[0] + 8, FLOOR], { n: 3, color: th.debris, size: 2.4 });
  glowFx(sc, "fx", 13.02, add(H.at(13.02).head, [9, -10]), { r0: 1, r1: 7, life: 0.32, grad: "glow-gold", attack: 0.08 });
  sparks(sc, "fx", 13.02, add(H.at(13.02).head, [9, -10]), { n: 3, color: th.gold.aura, speed: [20, 60], life: 0.3, g: -40 });
  glowFx(sc, "fx", 13.18, add(H.at(13.18).head, [-10, -6]), { r0: 1, r1: 8, life: 0.34, grad: "glow-gold", attack: 0.08 });
  sparks(sc, "fx", 13.18, add(H.at(13.18).head, [-10, -6]), { n: 3, color: th.gold.aura, speed: [20, 60], life: 0.3, g: -40 });
  cracks(sc, 13.12, H.at(13.1).pelvis[0], { n: 4, len: 26, seed: 3, fadeAt: 27.0, color: th.crack, grow: 0.5 });

  // ---- ACT 4: super saiyan
  const heroCore = (t: number): V2 => H.at(t).chest;
  const auraStrength = (t: number) => {
    if (t < 13.8) return 0;
    if (t < T_FLASH) return 0.5 * E.inQ(clamp((t - 13.8) / (T_FLASH - 13.8), 0, 1)) * (0.6 + 0.4 * rng(Math.floor(t * 12))());
    if (t < T_FLASH + 0.25) return 1.25 - (t - T_FLASH);
    if (t < 16.5) return 0.85;
    if (t < 18.86) return 0.85 + 0.25 * clamp((t - 16.5) / 2, 0, 1);
    if (t < 20.6) return 1.15;
    if (t < 23.0) return 0.8;
    return 0.8 * (1 - clamp((t - 23.0) / 0.9, 0, 1));
  };
  aura(sc, H, 13.8, 23.95, auraStrength);
  risingLines(sc, 13.6, 14.66, (t) => H.at(t).pelvis, th.gold.aura, 20, 5);
  risingLines(sc, T_FLASH, 15.6, (t) => H.at(t).pelvis, th.gold.aura, 8, 6);
  floatingDebris(sc, 13.6, T_FLASH, H.at(13.6).pelvis[0], th.debris, 11, 22);
  for (const [tl, n] of [[14.22, 2], [14.4, 2], [14.54, 3], [14.74, 3], [15.2, 1], [15.9, 1], [17.3, 1], [18.25, 2]] as [number, number][])
    lightning(sc, tl, heroCore, { n, color: th.gold.aura, seed: Math.round(tl * 100) });
  glowFx(sc, "top", T_FLASH, H.at(T_FLASH).chest, { r0: 30, r1: 170, life: 0.42, grad: "glow-gold", peak: th.flashOpacity + 0.3, attack: 0.03 });
  ringFx(sc, "fx", T_FLASH, [H.at(T_FLASH).pelvis[0], FLOOR - 4], { r0: 10, r1: 150, life: 0.45, color: th.gold.aura, width: 3, sy: 0.22 });
  ringFx(sc, "fx", T_FLASH + 0.06, H.at(T_FLASH).chest, { r0: 10, r1: 90, life: 0.4, color: th.gold.bright, width: 2.5, sy: 1.2 });
  cracks(sc, T_FLASH, H.at(T_FLASH).pelvis[0], { n: 6, len: 52, seed: 11, fadeAt: 27.0, color: th.crack, grow: 0.25 });
  sc.shake(T_FLASH, T_FLASH + 0.5, 3, 24, true);
  dustPuff(sc, T_FLASH, [H.at(T_FLASH).pelvis[0], FLOOR], { n: 10, color: th.debris, size: 4, spread: 2.2, up: 0.6 });
  // text trembles with the rising power
  for (const l of [...lineLetters(1), ...lineLetters(2), ...lineLetters(3)]) l.shake(13.7, T_FLASH + 0.15, l.gl.cx < 330 ? 1.1 : 0.6, 16, 0.4);
  for (const l of lineLetters(0)) l.shake(14.2, T_FLASH + 0.1, 0.35, 14, 0.3);
  // the fallen "M" floats up on the energy and drops back
  L(1, "M", 0).levitate(13.95, 15.35, 30, 18);
  // tiny, pointless green spell
  {
    const head = H.at(15.39).head;
    shoot(V, 15.4, 15.66, [head[0], head[1] - 18], { kind: "green", size: 0.55, end: "fizzle", extendTo: 150 });
  }

  // ---- ACT 5: the charge
  const kp: KamePlan = { appear: 16.62, peak: 18.4, still: 18.56, fire: T_FIRE, stop: 20.6 };
  const handsMid = (t: number): V2 => {
    const w = H.at(t);
    return mix(w.handR, w.handL, 0.5);
  };
  const orbPos = (t: number): V2 => (t < 18.8 ? add(handsMid(t), [-2, 0]) : add(handsMid(t), [6, 0]));
  chargeOrb(sc, kp, orbPos);
  PANIC.forEach((tp, i) => {
    const from = tipV(tp);
    const t1 = tp + 0.3;
    const to = orbPos(t1);
    // a shallow arc that stays under the text, then dives into the orb
    const ctrl: V2 = [lerp(from[0], to[0], 0.4), Math.min(from[1], to[1]) - 4 - (i % 3) * 3];
    bolt(sc, { t0: tp, t1, from, to, ctrl, kind: "green", size: 0.8, end: "none" });
    glowFx(sc, "fx", t1, to, { r0: 6, r1: 24, life: 0.2, grad: "glow-blue", peak: 0.9 });
  });
  sc.shake(18.18, 18.54, 0.9, 30, false);
  for (const l of [...lineLetters(3), ...lineLetters(1)].filter((l) => l.gl.cx < 360)) l.shake(18.16, 18.56, 1.1, 24, 0.15);
  // ---- ACT 6: the beam
  const half = 40;
  const origin = (t: number): V2 => add(handsMid(t), [8, 0]);
  kameBeam(sc, kp, origin, { half, reach: W + 120, seed: 8 });
  sc.shake(T_FIRE, T_FIRE + 0.35, 3.5, 26, true);
  sc.shake(T_FIRE + 0.1, kp.stop, 1.5, 28, false);
  // green shield pops and shatters
  {
    const c = add(V.at(19.0).chest, [-18, 2]);
    sc.add("fx", {
      tag: "path",
      a: { d: `M${n1(c[0] + 6)} ${n1(c[1] - 24)}Q${n1(c[0] - 14)} ${n1(c[1])} ${n1(c[0] + 6)} ${n1(c[1] + 24)}`, fill: "none", stroke: th.green.glow, "stroke-width": 3, "stroke-linecap": "round" },
      ch: [attr("opacity", (t) => (t < 19.08 ? 1 : 1 - clamp((t - 19.08) / 0.05, 0, 1)))],
      vis: (t) => t >= 18.99 && t < 19.14,
    });
    sparks(sc, "fx", 19.1, c, { n: 10, color: th.green.body, speed: [160, 360], life: 0.32, dir: 0, spread: 120 });
  }
  // villain inside the beam (the silhouette is drawn by the figure); a veil of energy over him
  sc.add("fx", {
    tag: "rect",
    a: { x: n1(V.at(19.2).pelvis[0] - 40), y: n1(origin(19.2)[1] - half * 0.42), width: 90, height: n1(half * 0.84), fill: th.kame.core },
    ch: [attr("opacity", (t) => 0.18 + 0.08 * Math.sin(t * 40))],
    vis: (t) => t >= 19.1 && t < kp.stop,
  });
  // text shaken loose
  for (const l of letters) {
    const amp = l.gl.line === 0 ? 0.7 : l.gl.cx > 420 ? 1.6 : 1.1;
    l.shake(T_FIRE + 0.04, kp.stop + 0.05, amp, 22, 0.12);
  }
  const blow = (lt: typeof close, t: number, vx: number, vy: number, spin: number) => lt.fall(t, vx, vy, spin);
  blow(L(3, ")"), 19.22, 170, -160, 700);
  blow(L(3, "5"), 19.4, 140, -120, -540);
  blow(L(3, "2"), 19.62, 120, -140, 620);
  blow(L(2, "."), 19.34, 160, -80, 300);
  blow(L(1, "r", 2), 19.5, 150, -60, -480);
  L(3, "S", 1).knock(19.3, 2, 1, 18, { keep: 0.8, dur: 0.6 });
  L(3, "C", 0).wobble(19.45, 10, 0.8);
  L(2, "t").knock(19.56, 1, 0, -14, { keep: 0.7 });
  L(1, "e", 1).knock(19.7, 1, 1, 12, { keep: 0.6 });
  L(0, ".").knock(19.6, 1, 0, 16, { keep: 0.7 });
  L(0, "l").wobble(19.5, 4, 0.9);
  const rr = rng(31);
  for (let t = 19.0; t < kp.stop - 0.1; t += 0.06) {
    const y = origin(t)[1] + (rr() - 0.5) * half * 1.8;
    debris(sc, t, [V.at(t).pelvis[0] + (rr() - 0.5) * 60, y], { n: 1, color: th.debris, dir: -8 + (rr() - 0.5) * 30, spread: 20, speed: [380, 620], life: 0.7, seed: Math.round(t * 1000), fade: 0.2 });
  }
  // scorch along the floor and at the villain's feet
  scorch(sc, [V.at(20.5).pelvis[0], FLOOR - 0.5], kp.stop, 24, 0.32, 0.18);

  // ---- ACT 7: skeleton
  const skp: SkeletonPlan = { show: T_SKEL, crack: 21.52, tilt: 21.68, armOff: 21.96, collapse: 22.28, puff: 22.58, gone: 23.3 };
  skeleton(sc, V, skp);
  glowFx(sc, "fx", kp.stop, V.at(kp.stop - 0.02).chest, { r0: 20, r1: 60, life: 0.4, grad: "glow-blue", peak: 0.8, attack: 0.01 });

  // ---- ACT 8: cleanup
  // G is picked up and slotted back
  Gl.carry(T_GRAB, (t) => {
    const w = H.at(t);
    const u = clamp((t - T_GRAB) / 0.08, 0, 1);
    const hand = w.handR;
    const held: V2 = [hand[0] + 1, hand[1] - 8];
    const p = mix(gRest, held, u);
    return [p[0], p[1], lerp(0, -8, u)];
  });
  Gl.moveTo(T_SLOT, 0.12, [0, 0, 0], E.outBack);
  sparks(sc, "fx", T_SLOT + 0.1, slot, { n: 4, color: th.debris, speed: [30, 80], life: 0.25, g: 200 });
  // the "T" drops onto his head and bounces off
  const Tl = L(3, "T");
  const headTop = (t: number): V2 => add(H.at(t).head, [0, -H.d.headR - Tl.gl.h / 2]);
  const tFrom = Tl.base(T_BONK - 0.16);
  Tl.moveTo(T_BONK - 0.16, 0.16, [headTop(T_BONK)[0] + 5 - Tl.gl.cx, headTop(T_BONK)[1] - Tl.gl.cy, tFrom[2] + 25], E.inQ);
  Tl.fall(T_BONK, 110, -260, 760, { bounce: 2 });
  sparks(sc, "fx", T_BONK, headTop(T_BONK), { n: 3, color: th.debris, speed: [40, 120], life: 0.25, g: 300, dir: -90, spread: 120 });
  // zip!
  dustPuff(sc, 27.2, [H.at(27.2).pelvis[0], FLOOR], { n: 6, color: th.debris, size: 4, spread: 1.6, life: 0.26 });
  for (let k = 0; k < 4; k++) {
    const y = H.at(27.3).chest[1] - 14 + k * 9;
    sc.add("fx", {
      tag: "path",
      a: { stroke: th.debris, "stroke-width": 1.4, "stroke-linecap": "round" },
      ch: [{ kind: "attr", attr: "d", f: (t) => {
        const x = H.at(t).pelvis[0];
        const u = clamp((t - 27.22) / 0.18, 0, 1);
        return [x + 16, y, x + 16 + 50 * (1 - u * 0.5), y];
      }, fmt: (v) => `M${n1(v[0])} ${n1(v[1])}L${n1(v[2])} ${n1(v[3])}`, tol: 0.5 }, attr("opacity", (t) => 0.7 * (1 - clamp((t - 27.3) / 0.15, 0, 1)))],
      vis: (t) => t >= 27.22 && t < 27.45,
    });
  }

  // ---- the page heals: every displaced letter flies home
  const moved = letters.filter((l) => l.touched).sort((a, b) => a.gl.cx - b.gl.cx);
  moved.forEach((l, i) => l.restore(26.96 + (i % 5) * 0.03, 0.32));

  return { sc, H, V, letters, layout, heroFig };

  // ------------------------------------------------------------------- helpers
  function figureFor(
    f: Fighter,
    ink: string,
    wand: { color: string; edge?: string; width: number },
    hairN: ReturnType<typeof hairNode> | undefined,
    wandVis: (t: number) => boolean,
    extra: { alt?: (t: number) => boolean; inkAlt?: string; vis?: (t: number) => boolean } = {},
  ) {
    return figureNode(f, { ink, wand, hair: hairN, wandVis, alt: extra.alt, inkAlt: extra.inkAlt, vis: extra.vis });
  }
}

function scorch(sc: Scene, p: V2, t: number, r: number, op = 0.35, flat = 0.55) {
  sc.add("textfx", {
    tag: "ellipse",
    a: { cx: n1(p[0]), cy: n1(p[1]), rx: n1(r), ry: n1(r * flat), fill: sc.th.scorch },
    ch: [attr("opacity", (tt) => op * 0.5 * clamp((tt - t) / 0.08, 0, 1) * (1 - clamp((tt - 26.96) / 0.3, 0, 1)))],
    vis: (tt) => tt >= t && tt < 27.3,
  });
}

void sub;
void dist;
void translate;
