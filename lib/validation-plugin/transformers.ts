import { Transformer } from "./validationPlugin";

//===================================
// Unknowns
//===================================

export const defaulted: (deafultValue: unknown) => Transformer<unknown> =
  (deafultValue) => (value) => {
    return value === null || value === undefined ? deafultValue : value;
  };

//===================================
// Strings
//===================================

export const trim: Transformer<string> = (value) => {
  return value.trim();
};

export const lowercase: Transformer<string> = (value) => {
  return value.toLowerCase();
};

export const uppercase: Transformer<string> = (value) => {
  return value.toUpperCase();
};
