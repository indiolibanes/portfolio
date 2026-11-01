export const PASS_B_NAMES = ['B_Cheerful_R','B_Cheerful_L','B_Up_Add_R','B_Up_Add_L',
  'E_Smile_R','E_Smile_L','E_Squint_R','E_Squint_L','M_Smile_R','M_Smile_L','P_Nose_Up','P_Nose_Down'];
export const PASS_B1_EXTRA_NAMES = ['M_meow_R','M_meow_L','M_Squint_R','M_Squint_L'];

export const PUPIL_NAMES=['Up','Down','In','Out'].flatMap(axis=>['R','L'].map(side=>`Pupil_${axis}_${side}`));
export const FACE_ACTING_NAMES=['E_Close_R','E_Close_L','M_Smile_R','M_Smile_L',...PUPIL_NAMES];
