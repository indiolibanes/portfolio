/**
 * R6 preflight — human-reviewed visual decisions, NOT runtime activation.
 *
 * IMPORTANT: the review names visible QA variants. Their GLB SHA, face clone,
 * material, active recipe, weight, camera, and viewport must be captured as an
 * immutable comparison manifest BEFORE any public alias is promoted.
 *
 * Human approval of a screenshot/sequence is not proof of its implementation
 * under every mouthR2/R3/R4/R5 geometry flag, nor GPU/Samsung sign-off.
 */
export const EXPRESSION_RELEASE_PLAN = Object.freeze({
  active: false,
  // Existing R5 release gate must remain null until explicit authorization.
  humanApproval: null,
  visualReview: {
    observedOn: '2026-11-04',
    scope: 'Named facial appearances and dynamics reviewed by the author',
    notApproved: ['automatic scheduler', 'global release', 'GPU performance', 'unverified corrective shapes'],
  },
  geometry: 'EXACT_RENDER_PROFILE_TO_LOCK',
  approvalState: 'HUMAN_VISUAL_FEEDBACK_CAPTURED_RELEASE_BLOCKED',
  approvalContract: Object.freeze({
    require: Object.freeze([
      'canonical GLB SHA-256 and source branch/head',
      'exact QA recipe ID, morph weight map, geometry profile and material',
      'front/three-quarter/profile; original-size and crop; blink and idle return',
      'single-writer ownership and E_Close preservation',
      'independent human acceptance of any added facial regions',
    ]),
    onMismatch: 'PRESERVE_APPROVED_BASELINE_AND_ROLLBACK',
  }),
  // No R2/R3 alias below may silently replace an approved V2 appearance.
  proposals: Object.freeze([
    {
      id: 'LITTLE_SMILE',
      label: 'Sorriso discreto',
      sourceQa: 'LITTLE_SMILE_V2',
      appearance: 'HUMAN_APPROVED',
      separateVariant: 'LITTLE_SMILE_R2_CANDIDATE',
      separateLabel: 'Esboço de sorriso',
      duplicateCandidate: 'LITTLE_SMILE_R3_CANDIDATE',
      aliases: [],
      notes: 'V2 has a stronger leftward mouth pull and a subtle approved chin movement; preserve both.',
    },
    {
      id: 'MY_STAR',
      label: 'Minha estrela',
      sourceQa: 'MY_STAR_V2',
      appearance: 'HUMAN_APPROVED',
      intermediateQa: 'MY_STAR_R3_EYES_SOFT',
      intermediateLabel: 'Afeto crescente',
      intermediateAppearance: 'HUMAN_APPROVED',
      optionalQa: 'MY_STAR_R3_CANDIDATE',
      duplicateCandidate: 'MY_STAR_R2_CANDIDATE',
      aliases: [],
      notes: 'Keep full joyful squint; the soft-eyes state may lead to V2, never overwrite it.',
    },
    {
      id: 'HELLO',
      label: 'Olá',
      sourceQa: 'HELLO_R2_CANDIDATE',
      appearance: 'HUMAN_APPROVED',
      duplicateCandidates: ['HELLO_R3_CLOSED', 'HELLO_R3_OPEN'],
      separateVariant: 'HELLO',
      separateLabel: 'Saudação falada (a rever)',
      aliases: [],
      notes: 'R2: central smile, intermediate eye closure; original HELLO opens the mouth and needs comparison.',
    },
    {
      id: 'TENDERNESS',
      label: 'Ternura',
      sourceQa: 'LOVE',
      appearance: 'HUMAN_APPROVED',
      binding: 'VERIFY_EXACT_QA_PRESENTATION',
      aliases: [],
      notes: 'Preserve timed automatic return to neutral; do not conflate with LOVE without verifying the displayed recipe.',
    },
    {
      id: 'SERENITY',
      label: 'Serenidade',
      sourceQa: 'HOPE',
      appearance: 'HUMAN_APPROVED',
      binding: 'VERIFY_EXACT_QA_PRESENTATION',
      aliases: [],
      notes: 'Subtle smile and closed eyes are essential; HOPE is a tentative code mapping.',
    },
    {
      id: 'SURPRISE_SOFT',
      label: 'Surpresa',
      sourceQa: 'SURPRISE_SOFT',
      appearance: 'HUMAN_APPROVED',
      aliases: [],
      notes: 'Keep current apparent expression unchanged.',
    },
    {
      id: 'WORRIED',
      label: 'Preocupação',
      sourceQa: 'WORRIED',
      appearance: 'REWORK_REQUIRED',
      preserve: ['brow response'],
      repair: ['apparent double mouth', 'liner and contour occlusion'],
      aliases: [],
    },
    {
      id: 'GLANCE',
      label: 'Olhar lateral',
      sourceQa: 'GLANCE',
      appearance: 'REWORK_REQUIRED',
      repair: ['controlled left-right gaze sequence', 'return to neutral', 'avoid pupil distortion'],
      aliases: [],
    },
  ]),
  // No production rename, geometry switch, weight mutation or scheduler enable.
  releaseReady: false,
});
