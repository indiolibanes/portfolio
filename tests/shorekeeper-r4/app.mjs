/** Offline QA entry only; production never exposes this global. */
import {mountShorekeeperLab} from '../../src/scripts/shorekeeper-sk-lab.mjs';
window.r4App=mountShorekeeperLab(document.querySelector('[data-sk-lab]'));
