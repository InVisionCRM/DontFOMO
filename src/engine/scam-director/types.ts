/**
 * types.ts — the Scam Director's data model.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Bible §11 and Migration Plan §4 govern the shape. The Director's
 * job is paced, adaptive, channel-aware scams; this file pins the
 * types every later piece of Stage 6 builds on.
 *
 * The four archetypes (Bible §11):
 *  - **Lockout** — an app locks; find the real fix among fakes.
 *  - **Slow Burn** — invisible mistake now, detonates later. The
 *    Clipboard Scam (Scam Library v1.1 Event #5) is the flagship.
 *  - **Inbound Lure** — a scam arrives and sits there; engage or not.
 *  - **Decision Point** — the trap is woven into an action the
 *    player chose to take.
 */

/** Bible §11's four archetypes. */
export type ScamArchetype =
  | 'lockout'
  | 'slow-burn'
  | 'inbound-lure'
  | 'decision-point';

/** Which in-game channel a scam arrives through. */
export type ScamChannel =
  | 'mail'
  | 'tunnel'
  | 'messages'
  | 'clout'
  | 'exchange'
  | 'wallet'
  | 'bank'
  | 'clipboard';

/**
 * Per-instance state machine — Migration Plan §4.3. Survives
 * save/quit/reload because it lives in the persisted store.
 */
export type ScamLifecycleState =
  | 'armed' // scheduled; not yet visible
  | 'deployed' // content planted in its channel
  | 'presented' // the player has seen it
  | 'awaiting-response' // a decision is pending
  | 'resolved' // terminal — caught or fell-for
  | 'cooldown'; // resolved, still in the Director's recency window

/** Graduated consequences — Migration Plan §4.4. Never fatal. */
export type ScamSeverity = 'minor' | 'major' | 'severe';

/**
 * How a scam is set in motion.
 *  - `reactive`  — arms in response to a player action. The Director
 *    does not schedule it; the player's own choice is the trigger.
 *    Flagship: the Clipboard Scam (copying a seed phrase arms it).
 *    These bypass the proactive-pacing budget but still record
 *    resolutions into pacing so the skill model sees them.
 *  - `proactive` — the Director chooses when to arm, gated on the
 *    pacing layer (cooldown + per-window cap). Lockouts, Inbound
 *    Lures, and Decision-Point scams typically.
 */
export type ScamTrigger = 'reactive' | 'proactive';

/**
 * Catalog entry — the **definition** of a scam type. Pure data
 * (CLAUDE.md §5). Live instances reference one by id.
 */
export interface ScamEventDef {
  /** Stable id — used by `ScamInstance.defId`. */
  id: string;
  /** Display name for logs and the teaching modal. */
  name: string;
  archetype: ScamArchetype;
  /** Channels this scam visits — the Director plants content there. */
  channels: readonly ScamChannel[];
  /** Difficulty tier 1..5 (Scam Library v1.1). */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Cap on consequence — actual outcome may be less severe. */
  maxSeverity: ScamSeverity;
  /** How the scam is set in motion. See `ScamTrigger`. */
  trigger: ScamTrigger;
  /**
   * One-sentence player-facing teaching line. Shown by the post-scam
   * modal regardless of outcome (a caught scam still teaches —
   * Migration Plan §4.4).
   */
  teaches: string;
}

/** A live, in-flight scam — what the store tracks. */
export interface ScamInstance {
  /** Unique id per instance. */
  id: string;
  /** The catalog entry this instance was minted from. */
  defId: string;
  state: ScamLifecycleState;
  /** When the instance was armed (epoch ms). */
  armedAt: number;
  /**
   * When the next state transition is scheduled (epoch ms). For an
   * `armed` instance this is the detonation time. Recomputed on each
   * transition.
   */
  scheduledAt: number;
  /** When the instance resolved (epoch ms), or null if not yet. */
  resolvedAt: number | null;
  /**
   * Outcome — null until resolved. True = player caught it (the
   * safe choice / vigilance reward). False = player fell for it.
   */
  caught: boolean | null;
}

/**
 * A single resolved-scam record kept in `PacingState.recentResolutions`
 * so the pressure-budget calculation has a rolling sample to work
 * from. Older records are pruned on each tick.
 */
export interface ResolutionRecord {
  /** Instance that resolved. */
  instanceId: string;
  /** Catalog id of the scam that resolved. */
  defId: string;
  /** When the resolution happened (epoch ms). */
  resolvedAt: number;
  /** True if the player caught the scam (the safe choice). */
  caught: boolean;
  /** Realised severity. Used to scale the post-resolution cooldown. */
  severity: ScamSeverity;
}

/**
 * Pacing state — the Director's "pressure budget" tracker.
 * Migration Plan §4.2 (Job 1). Lives inside `DirectorState`.
 *
 *   - `cooldownUntil` — no PROACTIVE scam may arm before this time.
 *     Reactive scams (e.g. the Clipboard Scam, which arms in response
 *     to a player action) bypass this gate; the player's own choice
 *     is the trigger.
 *   - `recentResolutions` — a rolling window of resolved scams. Used
 *     to enforce the per-window cap and to derive `PlayerSkill`.
 *     Pruned to `PACING_DEFAULTS.rollingWindowDays` on each tick.
 */
export interface PacingState {
  cooldownUntil: number;
  recentResolutions: ResolutionRecord[];
}

/**
 * Derived player-skill snapshot — Migration Plan §4.2 (Job 2). Not
 * persisted; recomputed from `DirectorState.pacing` each time the
 * Director needs it. Drives proactive-scam difficulty selection and
 * the per-window cap (sharper players face more / harder scams).
 */
export interface PlayerSkill {
  /** Rolling catch-rate over the recent sample, in [0,1]. */
  catchRate: number;
  /**
   * Overall rating in [0,1]. Catch-rate weighted by sample size so a
   * single lucky catch doesn't promote a brand-new player to "sharp."
   */
  rating: number;
  /** Resolutions actually used in the calc. */
  sampleSize: number;
}

/**
 * Director-owned state — pure data, lives in the store under
 * `director`. Holds the live instances + the player-skill counters
 * + the pacing state (6.3).
 */
export interface DirectorState {
  /** Live + recently-resolved instances. Oldest first. */
  instances: ScamInstance[];
  /** Epoch ms of the most recent Director tick. */
  lastTickAt: number;
  /** Lifetime count of scams armed. */
  totalArmed: number;
  /** Lifetime count caught (resolved with `caught === true`). */
  totalCaught: number;
  /** Lifetime count fallen-for (resolved with `caught === false`). */
  totalFellFor: number;
  /** Pacing + skill-rating substrate. Migration Plan §4.2. */
  pacing: PacingState;
}

/**
 * Effects the Director emits on a tick. The Director is pure — it
 * describes side effects, it does not apply them. The store
 * consumes the effect list in order: drains, banners, mail/
 * messages, follower rewards. New scams emit new effect variants
 * here.
 */
export type DirectorEffect =
  | {
      type: 'clipboard-scam-armed';
      instanceId: string;
      /** Epoch ms when the scam is scheduled to detonate. */
      detonatesAt: number;
    }
  | {
      type: 'clipboard-scam-detonated';
      instanceId: string;
    }
  | {
      type: 'clipboard-scam-defused';
      instanceId: string;
    }
  | {
      type: 'authority-notice-deployed';
      instanceId: string;
      /** Display case reference for the lock-screen modal. */
      caseRef: string;
      /** Epoch ms after which the hold auto-resolves as fell-for. */
      expiresAt: number;
    }
  | {
      type: 'authority-notice-resolved';
      instanceId: string;
      /** True if the player chose the genuine bank email. */
      caught: boolean;
      /** How resolution happened — store may vary teaching text by reason. */
      reason: 'tapped' | 'expired';
    }
  | {
      type: 'golden-giveaway-deployed';
      instanceId: string;
      /** Epoch ms after which the takeover auto-resolves as caught. */
      expiresAt: number;
    }
  | {
      type: 'golden-giveaway-resolved';
      instanceId: string;
      /**
       * True if the player reported the clone (Verify→Compare→Report)
       * OR let the takeover expire without engaging (the dismiss-and-
       * ignore path). False only if they tapped Participate and
       * confirmed the send.
       */
      caught: boolean;
      /** How resolution happened — store may vary teaching text by reason. */
      reason: 'tapped' | 'expired';
    }
  | {
      type: 'frozen-withdrawal-deployed';
      instanceId: string;
      expiresAt: number;
      amount: number;
      destinationWallet: string;
    }
  | {
      type: 'frozen-withdrawal-resolved';
      instanceId: string;
      /**
       * `waited` — trusted the real email / let the window pass.
       * `paid` — tapped the typosquat fee. `cancelled` — aborted the
       * withdrawal from Bank or Mail.
       */
      outcome: 'waited' | 'paid' | 'cancelled';
      reason: 'tapped' | 'expired';
    };
