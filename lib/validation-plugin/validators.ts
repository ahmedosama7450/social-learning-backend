import { MaybePromise } from "nexus/dist/core";

import { ErrorValidationResultExtras, Validator } from "./validationPlugin";

// TODO Maybe find a way to make sure that error codes are unique (e.g. make error code same as name as validator function)

export function defineValidator<T>(
  errorCode: string,
  errorCondition: (arg: T) => MaybePromise<boolean>,
  extras: ErrorValidationResultExtras = null
): Validator<T> {
  return (arg) => {
    return errorCondition(arg) ? [errorCode, extras] : undefined;
  };
}

//===================================
// Numbers
//===================================

export const max = (n: number) =>
  defineValidator<number>("max", (arg) => arg > n, { n });

export const min = (n: number) =>
  defineValidator<number>("min", (arg) => arg < n, { n });

export const range = (lowerBound: number, upperBound: number) =>
  defineValidator<number>(
    "range",
    (arg) => arg < lowerBound || arg > upperBound,
    { lowerBound, upperBound }
  );

//===================================
// Arrays
//===================================

export const maxSize = (n: number) =>
  defineValidator<[] | string>("max-size", (arg) => arg.length > n, { n });

export const minSize = (n: number) =>
  defineValidator<[] | string>("min-size", (arg) => arg.length < n, { n });

export const rangeSize = (lowerBound: number, upperBound: number) =>
  defineValidator<[] | string>(
    "range-size",
    (arg) => arg.length < lowerBound || arg.length > upperBound,
    { lowerBound, upperBound }
  );

//===================================
// Strings
//===================================

export const pattern = (regexp: RegExp) =>
  defineValidator<string>("pattern", (arg) => !regexp.test(arg), {
    regexp: regexp.source,
  });
