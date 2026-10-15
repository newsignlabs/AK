// Motion tokens from the spec (§4.2).
export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};
export const dur = { fast: 0.2, base: 0.6, slow: 1 };
export const stagger = 0.07;
