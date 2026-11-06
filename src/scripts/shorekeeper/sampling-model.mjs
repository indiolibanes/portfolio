import * as T from 'three';import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
/** Read-only child view skips JSON copying the root's large runtime animation cache. No reparenting. */
export function cloneSamplingModel(model){const shell=new T.Group();shell.name=model.name;shell.position.copy(model.position);shell.quaternion.copy(model.quaternion);shell.scale.copy(model.scale);shell.matrix.copy(model.matrix);shell.matrixAutoUpdate=model.matrixAutoUpdate;shell.children=model.children;return cloneSkeleton(shell);}
