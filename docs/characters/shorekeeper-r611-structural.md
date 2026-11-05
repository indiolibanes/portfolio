# Shorekeeper R6.1.1 — structural recovery, partial closure

Continues draft #256 on `1356be520b9a03eef8094c3926a18feda9b5bce3`, over #255.
Result: **R611_PARTIAL / ARTISTIC_QA_PENDING**. This is not approval of the cinematic sequence.

## Corrected behavior

- Losing, disposing or replacing the presentation's VFX interrupts the body before releasing presentation resources. The existing clock continues its recovery to idle. The director never adopts a replacement VFX implicitly.
- Repeated interruption is idempotent. A paused resource loss releases the camera immediately while holding the body clock until resume. Seeking without VFX cannot leave a frozen `run`.
- Manual VFX restoration includes its transition arrays, clocks, toggles, mode, stage, suspension and subtree visibility, including an in-progress fade and hidden environment. Disposing either owner first is safe.
- Manual camera selection and a new reduced-motion preference revoke the R6.1 camera; later playback/seek cannot overwrite that manual view.
- Motion matching selects actual sampled times strictly inside the requested closed windows. The shortened last sampling interval determines velocity. The composite score remains distinct from angular pose distance.
- R6.1 start/scrub controls remain unavailable until their runtime prerequisites are satisfied, including after a WebGL initialization failure.

## Verification and outstanding gates

New regression cases exercise the above behavior using synthetic rigs and the real R5 VFX class, without downloading private assets. Private data-only checks also exercise the authenticated source bytes and three full natural cycles. These are not rendered or physical-device cycles.

The original continuity baseline was reproduced with the owner's retained private GLBs. A bounded-window/horizontal-reanchoring experiment was rejected: it improved some transitions but worsened others. No experimental derived curves or retimed schedule were integrated. G1 remains **FAIL**; P0 body discontinuities remain in the opt-in preview. G2 framing, G3 reveal and G4 smooth natural camera return were not advanced past this gate. Interrupt recovery remains authored and does not certify foot contact.

WebGL2 creation failed before frame one in this environment, including in the asset-free synthetic fixture. No new visual A/B, rendered memory measurement, GPU timing, face/collision or Samsung certification is claimed. Private diagnostic scripts, traces and the full 18-case matrix remain outside the repository.

Preserved: seven original sources; B1 `NOT_REPRODUCED`; PSA/sourceFrame unresolved; R5 render loop; #252 render-only DPR policy; #254 angular reporting; #255 source isolation; facial ownership; private loading and Access; Hsin and main. No new mixer, RAF, shader, field or choreography.

## Rollback

Disable `?r61=1` for the experimental sequence. For only this hardening, revert the R6.1.1 commit on #256; do not reset the branch or revert #255. For the full R6.1 experiment, use the #255 parent. No merge or production change is part of this delivery.
