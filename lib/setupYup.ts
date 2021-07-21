import { setLocale } from "yup";

setLocale({
  number: {
    min: ({ min }: { min: number }) => ({
      key: "validation:min",
      values: { min },
    }),
    max: ({ max }: { max: number }) => ({
      key: "validation:max",
      values: { max },
    }),
  },

  mixed: {
    required: "validation:required",
  },
});
