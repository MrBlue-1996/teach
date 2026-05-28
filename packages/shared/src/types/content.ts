/**
 * Content Pack Types (TS-CONTENT-004)
 *
 * Types for content packs, teaching blocks, and the
 * content authoring pipeline.
 */

import type { LearningMode } from './learner.js';

/** Content pack identifier */
export type ContentPackId = `pack-${string}`;

/** Teaching block identifier */
export type TeachingBlockId = `tb-${string}`;

/** Badge identifier */
export type BadgeId = `badge-${string}`;

/** Role identifier */
export type RoleId = `role-${string}`;

/** Difficulty level */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Content tag for filtering and routing */
export type ContentTag = string;

/** Supported source-data status */
export type SourceDataStatus = 'demo' | 'authorized' | 'requires-client-source' | 'deprecated';

/** Translation status */
export type TranslationStatus = 'planned' | 'in-progress' | 'complete';

/** Minimum device requirements for content */
export interface MinDeviceProfile {
  /** Minimum RAM in megabytes */
  readonly ramMb: number;
  /** Minimum network speed in kbps */
  readonly networkKbps: number;
  /** Whether WebGL is required */
  readonly requiresWebGL?: boolean;
  /** Whether WebGPU is required */
  readonly requiresWebGPU?: boolean;
  /** Whether WASM is required */
  readonly requiresWasm?: boolean;
}

/** Surface variant for teaching block */
export interface SurfaceVariant {
  /** Variant identifier */
  readonly id: string;
  /** Variant description/context */
  readonly description: string;
  /** Variant-specific data */
  readonly data: Record<string, unknown>;
}

/** Optional authored surface attached to a block */
export interface TeachingSurface {
  /** Surface type identifier */
  readonly surfaceType: string;
  /** Human-readable content for this surface */
  readonly content: string;
}

/** Author metadata */
export interface ContentAuthor {
  /** Author display name */
  readonly name: string;
  /** Optional contact email */
  readonly email?: string;
}

/** Device constraints for authored teaching responses */
export interface DeviceConstraints {
  /** Maximum characters allowed in explanation and hint responses */
  readonly maxResponseChars: number;
}

/** Trigger rule for adaptive support */
export interface TriggerRule {
  /** Trigger type */
  readonly type: 'repeated_errors' | 'stuck_time' | 'help_requested';
  /** Numeric threshold where required */
  readonly threshold?: number;
  /** Unit for time-based triggers */
  readonly unit?: 'seconds';
}

/** Ticket-line item shown in a ticket stimulus */
export interface TicketStimulusItem {
  /** Item quantity */
  readonly quantity: number;
  /** Item name */
  readonly name: string;
  /** Optional item modifiers */
  readonly modifiers?: readonly string[];
  /** Optional prep/cook time in seconds */
  readonly cookTimeSeconds?: number;
}

/** Ticket-style challenge stimulus */
export interface TicketStimulus {
  /** Discriminator */
  readonly kind: 'ticket';
  /** Ticket/table identifier */
  readonly table: string;
  /** Optional guest count */
  readonly guests?: number;
  /** Optional server name */
  readonly server?: string;
  /** Optional service time label */
  readonly time?: string;
  /** Ticket items */
  readonly items: readonly TicketStimulusItem[];
  /** Optional notes */
  readonly notes?: string;
}

/** Station-state challenge stimulus */
export interface StationStateStimulus {
  /** Discriminator */
  readonly kind: 'station_state';
  /** Optional context header */
  readonly contextHeader?: string;
  /** Optional window in minutes */
  readonly windowMinutes?: number;
  /** Station observations */
  readonly observations: readonly string[];
}

/** Huddle-notes challenge stimulus */
export interface HuddleNotesStimulus {
  /** Discriminator */
  readonly kind: 'huddle_notes';
  /** Optional header */
  readonly header?: string;
  /** Notes list */
  readonly notes: readonly {
    readonly label: string;
    readonly detail: string;
  }[];
}

/** Menu-board challenge stimulus */
export interface MenuBoardStimulus {
  /** Discriminator */
  readonly kind: 'menu_board';
  /** Optional header */
  readonly header?: string;
  /** Optional featured items */
  readonly features?: readonly string[];
  /** Optional 86 item list */
  readonly eightySixItems?: readonly string[];
  /** Optional notes */
  readonly notes?: readonly string[];
}

/** Step-bank challenge stimulus */
export interface StepBankStimulus {
  /** Discriminator */
  readonly kind: 'step_bank';
  /** Optional instruction */
  readonly instruction?: string;
  /** Ordered steps */
  readonly steps: readonly string[];
}

/** Plain-text challenge stimulus */
export interface PlainTextStimulus {
  /** Discriminator */
  readonly kind: 'plain_text';
  /** Whether text is monospaced */
  readonly monospace?: boolean;
  /** Text lines */
  readonly lines: readonly string[];
}

/** Recipe ingredient row shown in a recipe stimulus */
export interface RecipeIngredient {
  /** Quantity text, including unit */
  readonly quantity: string;
  /** Ingredient name */
  readonly item: string;
  /** Optional preparation or state note */
  readonly modifier?: string;
}

/** Recipe-card challenge stimulus */
export interface RecipeStimulus {
  /** Discriminator */
  readonly kind: 'recipe';
  /** Recipe title */
  readonly title: string;
  /** Optional yield text */
  readonly yields?: string;
  /** Optional prep time in minutes */
  readonly prepTimeMinutes?: number;
  /** Optional cook time in minutes */
  readonly cookTimeMinutes?: number;
  /** Ingredient rows */
  readonly ingredients: readonly RecipeIngredient[];
  /** Ordered preparation steps */
  readonly steps: readonly string[];
  /** Optional recipe note */
  readonly notes?: string;
  /** Optional kitchen image manifest reference */
  readonly imageRef?: string;
}

/** Percent-positioned visual focus region for an image stimulus */
export interface ImageFocusRegion {
  /** Visible label for the highlighted region */
  readonly label: string;
  /** Left offset as a percentage of image width */
  readonly xPct: number;
  /** Top offset as a percentage of image height */
  readonly yPct: number;
  /** Region width as a percentage of image width */
  readonly widthPct: number;
  /** Region height as a percentage of image height */
  readonly heightPct: number;
}

/** Manifest-backed image challenge stimulus */
export interface ImageStimulus {
  /** Discriminator */
  readonly kind: 'image';
  /** Kitchen image manifest reference, without file extension */
  readonly imageRef: string;
  /** Required accessible description */
  readonly altText: string;
  /** Optional visible caption */
  readonly caption?: string;
  /** Optional visual-only regions to call attention to parts of the image */
  readonly focusRegions?: readonly ImageFocusRegion[];
}

/** Structured stimulus for challenge prompts */
export type ChallengeStimulus =
  | TicketStimulus
  | StationStateStimulus
  | HuddleNotesStimulus
  | MenuBoardStimulus
  | StepBankStimulus
  | PlainTextStimulus
  | RecipeStimulus
  | ImageStimulus;

/** Manifest entry for kitchen imagery served from /public/kitchen */
export interface KitchenImageManifestEntry {
  /** Browser-visible image path */
  readonly path: string;
  /** Default accessible description for the asset */
  readonly altText: string;
  /** Licensing/source readiness status */
  readonly sourceDataStatus: SourceDataStatus;
  /** Optional license/source reference */
  readonly licenseRef?: string | null;
  /** Search and grouping tags */
  readonly tags?: readonly string[];
}

/** Catalog of kitchen imagery addressable by imageRef */
export interface KitchenImageManifest {
  /** Manifest schema version */
  readonly schemaVersion: string;
  /** Optional default dimensions for entries that do not override sizing */
  readonly defaultDimensions?: {
    readonly widthPx: number;
    readonly heightPx: number;
  };
  /** Entries keyed by imageRef */
  readonly entries: Record<string, KitchenImageManifestEntry>;
}

/** Structured module links for semantic pack validation */
export interface ModuleLinks {
  /** Referenced fundamentals */
  readonly fundamentalsTaught: readonly string[];
  /** Referenced downtime decisions */
  readonly downtimeDecisions: readonly string[];
  /** Referenced chaos events */
  readonly chaosEvents: readonly string[];
  /** External assessment identifier if the block relies on a cataloged assessment */
  readonly externalAssessmentId?: string | null;
  /** Referenced ticket flows */
  readonly ticketFlows: readonly string[];
  /** Adaptive trigger rules */
  readonly triggerRules: readonly TriggerRule[];
}

/** Asset catalog entry */
export interface AssetCatalogEntry {
  /** Unique asset identifier */
  readonly id: string;
  /** Human-readable title */
  readonly title: string;
  /** Source-data status */
  readonly sourceDataStatus: SourceDataStatus;
  /** Optional source reference for authorized content */
  readonly sourceReference?: string;
}

/** Asset catalog used by structured module links */
export interface AssetCatalog {
  /** Fundamentals catalog */
  readonly fundamentals: readonly AssetCatalogEntry[];
  /** Downtime decisions catalog */
  readonly downtimeDecisions: readonly AssetCatalogEntry[];
  /** Chaos events catalog */
  readonly chaosEvents: readonly AssetCatalogEntry[];
  /** Assessments catalog */
  readonly assessments: readonly AssetCatalogEntry[];
  /** Ticket flows catalog */
  readonly ticketFlows: readonly AssetCatalogEntry[];
}

/** Integrity metadata for packaged packs */
export interface IntegrityMetadata {
  /** Release mode */
  readonly releaseMode: 'demo' | 'release';
  /** Deterministic checksum for release artifacts */
  readonly checksum?: string | null;
}

/** Teaching block - atomic unit of instruction (TS-CONTENT-004) */
export interface TeachingBlock {
  /** Unique block identifier */
  readonly id: TeachingBlockId;
  /** Optional secondary block identifier used by legacy manifests */
  readonly blockId?: string;
  /** Optional display title */
  readonly title?: string;
  /** Optional objective */
  readonly objective?: string;
  /** Concept being taught */
  readonly concept: string;
  /** Optional block type label */
  readonly type?: string;
  /** Optional richer engine-facing target mode */
  readonly targetMode?: string;
  /** Learning mode this block is designed for */
  readonly mode: LearningMode;
  /** Optional narrative content body */
  readonly content?: string;
  /** Optional structured challenge stimulus */
  readonly stimulus?: ChallengeStimulus;
  /** Canonical solution shown first (Solve-First pedagogy) */
  readonly canonicalSolution: string;
  /** Explanation of the canonical solution */
  readonly explanation: string;
  /** Optional singular hint carried by legacy manifests */
  readonly hint?: string;
  /** Surface variants for transfer testing */
  readonly surfaceVariants: readonly SurfaceVariant[];
  /** Optional authored surfaces */
  readonly surfaces?: readonly TeachingSurface[];
  /** Optional topical tags */
  readonly tags?: readonly string[];
  /** Time budget in seconds */
  readonly timeBudgetSeconds: number;
  /** Difficulty level */
  readonly difficulty: DifficultyLevel;
  /** Prerequisites - other block IDs */
  readonly prerequisites: readonly TeachingBlockId[];
  /** Success criteria for completion */
  readonly successCriteria: SuccessCriteria;
  /** Optional device constraints */
  readonly deviceConstraints?: DeviceConstraints;
  /** Optional structured module links */
  readonly moduleLinks?: ModuleLinks;
  /** Hints available (progressively revealed) */
  readonly hints: readonly string[];
  /** Common errors and their remediation */
  readonly commonErrors: readonly CommonError[];
}

/** Success criteria for a teaching block */
export interface SuccessCriteria {
  /** Minimum correctness score [0, 1] */
  readonly minCorrectnessScore: number;
  /** Maximum allowed time in seconds */
  readonly maxTimeSeconds: number;
  /** Maximum retries before remediation */
  readonly maxRetries: number;
  /** Whether explanation is required */
  readonly requiresExplanation: boolean;
  /** Custom validation function identifier */
  readonly customValidator?: string;
}

/** Common error pattern with remediation */
export interface CommonError {
  /** Error pattern identifier */
  readonly pattern: string;
  /** Human-readable description */
  readonly description: string;
  /** Suggested remediation */
  readonly remediation: string;
  /** Related teaching block for deeper remediation */
  readonly relatedBlockId?: TeachingBlockId;
}

/** Content pack manifest (TS-CONTENT-004) */
export interface ContentPackManifest {
  /** Unique pack identifier */
  readonly id: ContentPackId;
  /** Optional slug */
  readonly slug?: string;
  /** Human-readable name */
  readonly name: string;
  /** Optional title */
  readonly title?: string;
  /** Semantic version */
  readonly version: string;
  /** Description */
  readonly description: string;
  /** Optional domain label */
  readonly domain?: string;
  /** Optional certification target */
  readonly certificationTarget?: string | null;
  /** Content tags */
  readonly tags: readonly ContentTag[];
  /** Role mappings (which badges this pack contributes to) */
  readonly roleMappings: readonly BadgeId[];
  /** Overall difficulty */
  readonly difficulty: DifficultyLevel;
  /** Optional Chromebook compatibility flag */
  readonly chromebookCompatible?: boolean;
  /** Optional target device profile name */
  readonly targetDeviceProfile?: string;
  /** Optional publication status */
  readonly status?: string;
  /** Optional locale */
  readonly locale?: string;
  /** Optional translation status by locale */
  readonly translationStatus?: Readonly<Record<string, TranslationStatus>>;
  /** Minimum device profile required */
  readonly minDeviceProfile: MinDeviceProfile;
  /** Teaching blocks in this pack */
  readonly teachingBlocks: readonly TeachingBlock[];
  /** Optional structured asset catalog */
  readonly assetCatalog?: AssetCatalog;
  /** Pack author */
  readonly author: string | ContentAuthor;
  /** Optional extra metadata */
  readonly metadata?: Record<string, unknown>;
  /** Optional integrity metadata */
  readonly integrity?: IntegrityMetadata;
  /** ISO 8601 creation timestamp */
  readonly createdAt: string;
  /** ISO 8601 last update timestamp */
  readonly updatedAt: string;
  /** Content pack signature (KMS/HSM signed) */
  readonly signature: string;
  /** Signing key identifier */
  readonly signingKeyId: string;
  /** Schema version for forward compatibility */
  readonly schemaVersion: string;
}

/** Content pack validation result */
export interface ContentPackValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validation errors */
  readonly errors: readonly ValidationError[];
  /** Validation warnings */
  readonly warnings: readonly ValidationWarning[];
  /** Parity test results against deterministic formatter */
  readonly parityResults?: ParityTestResult;
}

/** Validation error */
export interface ValidationError {
  /** Error code */
  readonly code: string;
  /** JSON path to error location */
  readonly path: string;
  /** Error message */
  readonly message: string;
  /** Severity */
  readonly severity: 'error';
}

/** Validation warning */
export interface ValidationWarning {
  /** Warning code */
  readonly code: string;
  /** JSON path to warning location */
  readonly path: string;
  /** Warning message */
  readonly message: string;
  /** Severity */
  readonly severity: 'warning';
}

/** Parity test result */
export interface ParityTestResult {
  /** Whether parity test passed */
  readonly passed: boolean;
  /** Divergence count */
  readonly divergenceCount: number;
  /** Maximum allowed divergence */
  readonly maxAllowedDivergence: number;
  /** Individual divergence details */
  readonly divergences: readonly ParityDivergence[];
}

/** Single parity divergence */
export interface ParityDivergence {
  /** Block ID where divergence occurred */
  readonly blockId: TeachingBlockId;
  /** Field that diverged */
  readonly field: string;
  /** Deterministic formatter output */
  readonly deterministicOutput: string;
  /** LLM output */
  readonly llmOutput: string;
  /** Similarity score [0, 1] */
  readonly similarity: number;
}

/** Content pack revocation entry */
export interface ContentPackRevocation {
  /** Pack ID being revoked */
  readonly packId: ContentPackId;
  /** Version being revoked */
  readonly version: string;
  /** Reason for revocation */
  readonly reason: string;
  /** ISO 8601 revocation timestamp */
  readonly revokedAt: string;
  /** Replacement pack ID if available */
  readonly replacementPackId?: ContentPackId;
}
