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

export const trim: Transformer<string> = (arg) => {
  return arg.trim();
};

export const lowercase: Transformer<string> = (arg) => {
  return arg.toLowerCase();
};

export const uppercase: Transformer<string> = (arg) => {
  return arg.toUpperCase();
};
