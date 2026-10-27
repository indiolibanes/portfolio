#!/bin/bash
# run.sh tasks.json outdir   — requer THREE_ROOT (checkout de three.js r186 com build/ e examples/jsm/) e playwright no NODE_PATH
D=$(dirname "$0"); : "${THREE_ROOT:?defina THREE_ROOT apontando para three.js r186}"; THREE_ROOT=$THREE_ROOT node $D/render.cjs "$1" "$2"
