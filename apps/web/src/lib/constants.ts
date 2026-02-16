/** 茶位费累计上限（分），达到后后续转分不再扣茶位费。默认 50，可通过 VITE_TEA_CAP 覆盖 */
export const TEA_CAP = Number(import.meta.env.VITE_TEA_CAP) || 50
