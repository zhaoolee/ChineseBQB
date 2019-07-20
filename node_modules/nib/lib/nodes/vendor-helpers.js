var RE_GRADIENT_STOPS = /([\(\,]\s*)(-?(?:\d*\.)?\d+(?:%|px|em))(\s+)((hsl|rgb)a?\([^\)]+\)|#[^\)\,]+)/g,
    RE_GRADIENT_VAL = /(\(\s*)(?:(-?(\d*\.)?\d+)deg|((to )?(top|bottom|left|right)( (top|bottom|left|right))?))/g,
    RE_GRADIENT_TYPE = /((repeating-)?(linear|radial)-gradient\()/g,
    RE_TRANSFORM = /\b(transform)\b/g,
    RE_FILL_KEYWORD = /\s*\b(fill)\b\s*/g;

var DIRECTIONS = { top: 'bottom', bottom: 'top', left: 'right', right:'left' };

/**
 * Expose `normalize`.
 */

function normalize(property, value, prefix){
  var result = value.toString(),
      args;

  /* Fixing the gradients */
  if (~result.indexOf('gradient(')) {

    /* Normalize color stops */
    result = result.replace(RE_GRADIENT_STOPS,'$1$4$3$2');

    /* Normalize legacy gradients */
    result = result.replace(RE_GRADIENT_VAL, function(){
        args = [].slice.call(arguments, 1);
        return normalizeGradient(args, prefix);
    });

    /* Adding prefixes to the legacy gradients */
    if (prefix) result = result.replace(RE_GRADIENT_TYPE, '-' + prefix + '-$1');
  }

  /* Adding prefixes to the `transform` values of legacy `transition` property */
  if (prefix && (property == "'transition'" || property == "'transition-property'")) {
    result = result.replace(RE_TRANSFORM, '-' + prefix + '-$1');
  }

  /* Removing `fill` keyword from the legacy `border-image` property */
  if (prefix && (property == "'border-image'" || property == "'border-image-slice'")) {
    result = result.replace(RE_FILL_KEYWORD, ' ');
  }

  return result;
}

function normalizeGradient(parts, prefix){
  /* Fix the degrees to the legacy syntax */
  var val = parts[0];

  // when the gradients were unprefixed, the w3c changed the way that the
  // angle direction is interpreted. see:
  // http://blogs.msdn.com/b/ie/archive/2012/06/25/unprefixed-css3-gradients-in-ie10.aspx
  if (parts[1]) val += (prefix ? parseFloat((Math.abs(450 - parts[1]) % 360).toFixed(3)) : parts[1]) + 'deg';

  /* Fix the directions to the legacy syntax */
  if (prefix && parts[4]) {
    // `to top` to `bottom` etc.
    if (parts[5]) val += DIRECTIONS[parts[5]];
    if (parts[6]) val += ' ' + DIRECTIONS[parts[7]];
  } else if (!prefix && !parts[4]) {
    // `top` to `to bottom` etc.
    if (parts[5]) val += 'to ' + DIRECTIONS[parts[5]];
    if (parts[6]) val += ' ' + DIRECTIONS[parts[7]];
  } else {
    if (parts[3]) val += parts[3];
  }

  return val;
}

var plugin = function(){
  return function(style){
    var nodes = this.nodes;
    style.define('normalize', function(property, value, prefix) {
      return new nodes.Ident(normalize(property, value, prefix));
    });
  };
};
module.exports = plugin;
