import * as hbs from 'handlebars';

/**
 * JSON stringify
 */
hbs.registerHelper('json', (object, formatted = true) => {
  if (!formatted) {
    return JSON.stringify(object)
  }
  return JSON.stringify(object, null, 2)
});

/**
 * Lower Case
 */
hbs.registerHelper('lowercase', (str) => {
  if (str && typeof str === 'string') {
    return str.toLowerCase();
  }
  return '';
});

/**
 * Upper Case
 */
hbs.registerHelper('uppercase', (str) => {
  if (str && typeof str === 'string') {
    return str.toUpperCase();
  }
  return '';
});

/**
 * Upper Case
 */
hbs.registerHelper('replace', (str: string, find: string, replacer: string) => {
  if (str && typeof str === 'string') {
    return str.replace(find, replacer)
  }
  return '';
});

/**
 * Capitalize
 */
hbs.registerHelper('capitalize', (str) => {
  if (str && typeof str === 'string') {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return '';
});

hbs.registerHelper('ifEquals', (arg1, arg2, options) => {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

export {
  hbs
}