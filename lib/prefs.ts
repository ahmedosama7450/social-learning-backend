export const accessTokenMaxAge = "30 d";

export const usernamePrefs = {
  regex: /^[a-z0-9_]+$/,
  maxLength: 15,
  minLength: 5,
  avgLength: 11, // Used in auto-generating a random usernames
};

export const firstLastNamePrefs = {
  maxLength: 15,
  minLength: 5,
};

export const bioMaxLength = 80;

export const postTitlePrefs = {
  minLength: 20,
  maxLength: 300,
};
