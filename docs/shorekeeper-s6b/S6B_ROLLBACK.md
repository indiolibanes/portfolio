# S6B_ROLLBACK
Baseline S5 SHA: 5380f43533ac5db455f6d5a057fac5764dcd8a7c.
Only .qa-s6b/, docs/shorekeeper-s6b/, and the S6-B QA workflow differ. No changes to src/, functions/, public/, assets/, lockfile, DNS, Access, Workers or R2 are authorized.
For local rollback, switch to experiment/shorekeeper-r623-s5-preview-20261106 and confirm HEAD equals baseline SHA. Do not force-push/reset a shared branch. If a future merge ever occurs, arrange a reviewed revert rather than ref rewriting.
Outputs generated from private kits are outside Git and should remain there. Production rollback is inapplicable because this branch is not being promoted.
