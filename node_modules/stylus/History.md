0.54.5 / 2016-04-28
===================

  * Fix: [CLI] Correct console output for Node 6.0

0.54.4 / 2016-04-27
===================

  * Fix: Correct extname checks for Node 6.0

0.54.3 / 2016-04-26
===================

  * Fix: Proper embedurl encoding for svg files with a hash.
  * Fix: Validate this.dest before using path.extname.
  * Fix: Update node-glob version.

0.54.2 / 2016-03-11
===================

  * Fix: False-positive import loop with empty imported file.

0.54.0 / 2016-03-05
===================

  * Feature: Added initial reference selector.
  * Feature: New `embedurl()` bif with optional utf8 uncoding support for SVG.
  * Feature: New `index()` bif.
  * Feature: New `percentage()` bif.
  * Feature: New `slice()` bif, #2115.
  * Feature: Support for UTF-8 encoding of urls, #2084.
  * Feature: Added `global` flag to `define()` function.
  * Feature: `match()` bif now returns the matched values instead of a boolean, #2109.
  * Feature: Added an optional `flags` argument to `match()` bif, #2109.
  * Docs: Added basic “getting started” to Readme, #2073.
  * Docs: Updated information about error reporting.
  * Fix: `selectors()` now returns proper subselectors.
  * Fix: No more unneeded spaces with partial reference selector using ranges.
  * Fix: Proper evaluating of the default arguments.
  * Fix: Evaluate variables in current-media function.
  * Fix: Validate regexp flags for `match` function.
  * Fix: Proper conditional assignment and "define" method.
  * Fix: Proper relative paths in sourcemaps if --out flag is set to a filename.
  * Fix: Proper errors with `--include-css` and `--resolve-url` used concurrently.
  * Fix: [Evaluator] Support for function as a default argument for functions.
  * Fix: [Lexer] Proper multiline comments inside multiline expressions.
  * Fix: [JS API] Proper variables from options object inside expressions.
  * Fix: [Renderer] No more caching of parsed AST for deps-resolver.

0.53.0 / 2015-12-14
===================

  * Feature: Numeric partial references.
  * Feature: Relative references.
  * Feature: New `selectors()` bif.
  * Feature: Support for comma-separated lists as `selector()`'s arguments.
  * Docs: Reworked contribution guidelines.
  * Docs: Added Contributor Code of Conduct.
  * Fix: Support for multiple consecutive parent references.
  * Fix: Proper removal of parent references at the root when combinators are present.
  * Fix: Don't add space before unknown units.
  * Fix: Allow comma-separated lists in `@supports` value.
  * Fix: No more error message for "assertType" without parameter name.
  * Fix: Proper middleware overlap function on windows. Thanks to #2029 by @bcomnes.
  * Fix: Better absolute path detection for Windows. Thanks to #2033 by @mlohbihler.
  * Refactoring: Moved bifs to separate files.


0.52.4 / 2015-09-04
===================

  * Fix: Revert changes in "looksLikeSelector" method.

0.52.3 / 2015-09-04
===================

  * Fix: Another parsing regression.

0.52.2 / 2015-09-03
===================

  * Fix: A parsing regression.

0.52.1 / 2015-09-03
===================

  * Fix: Correct line numbers in error messages for files with CSS comments.
  * Fix: Better absolute urls detection.
  * Fix: Added type assertions to "substr", "split" and "replace" bifs.
  * Fix: Atrules parsing with a block at a new line.
  * Fix: Bug with commented indented lines at the end of a file.
  * Fix: Stylus error messages for Node 0.12+.
  * Fix: A bug with arguments cloning.

0.52.0 / 2015-07-19
===================

  * Feature: new url resolver without url checks (`--resolve-url-nocheck`).
  * Feature: New option to json bif ("leave-strings").
  * Feature: New option to json bif ("optional").
  * Feature: Adding utf-8 charset to inline sourcemap.
  * Feature: allow inline CSS comments inside value.
  * Fix: shouldn't fail to compile in strict mode, #1923.
  * Fix: Paths should be normalized for windows support, #1954.
  * Fix: Proper parsing of selector groups with placeholder and color-like ID.
  * Fix: Proper import loop detection.
  * Fix: Correct output of namespaces and charsets inside imports.
  * Fix: Indented comments shouldn't cause errors.
  * Fix: Proper way of parsing lists in "convert" bif.
  * Fix: Proper comma escaping in an object interpolation.
  * Fix: Allow no whitespace between keyframes name and the following curly brace.

0.51.1 / 2015-04-28
===================

  * Fixed `;` at the end of blockless unknown at-rules.
  * Fixed float units convertion by `convert` bif.

0.51.0 / 2015-04-23
===================

  * Added support for cascading extend.
  * Added "transparent" as a named color.
  * Added support for blockless unknown at-rules.
  * Made math more strict.
  * Fixed bug with extending nested placeholder selectors inside MQ.
  * Fixed imports inside `@media` blocks.
  * Fixed url resolver to consider `--out` options.
  * Fixed parsing of multiple "else if" statements.
  * Fixed an edge case with recursive extend.
  * Fixed regression with nested media queries.
  * Fixed parsing of nested comments.
  * Fixed checking paths overlap if 'dest' is a function in middleware.

0.50.0 / 2015-02-05
===================

  * Added `!optional` directive for extending, #1757.
  * Added `selector-exists` bif, #1758.
  * Added `remove` bif for removing items from hashes.
  * Added optional recursive hash merging, #1771.
  * Added optional (`--hoist-atrules` flag) `@import` and `@charset` hoisting.
  * Added a way to output to specific file path with CLI, #1800.
  * Fixed regression with using `@media` inside `+cache`.
  * Fixed `resolve-url` for hash urls, #1778.
  * Fixed `mix` bif for differently transparent colors, #1792.
  * Fixed bug with postfix `&` without comma.
  * Fixed incorrectly imported functions defined in other files with nested @require.
  * Fixed duplicated selectors when extending into placeholders with MQ.
  * Fixed `filter: contrast()` error.
  * Fixed the cloning of cached nodes.
  * Fixed incorrect filenames included in source maps, #1812.
  * Fixed stripping of unsuppressed comments from nested blocks.
  * Fixed build error for multiple files, #1813.
  * Fixed error handling slightly.
  * Fixed (throwing error) edge case of watching and printing at the same time, #1798.
  * Fixed watch to log to std.err, #1796.
  * Fixed indent in complex rules at CSS to Stylus conversion, #1808.

0.49.3 / 2014-11-06
===================

  * Fixed regression with `block` keyword inside block mixin.

0.49.2 / 2014-10-14
===================

  * Fixed regression #1727 + small fixes for #1717.
  * Fixed nested selectors when using nested and bubbled media queries.
  * Fixed issue when mixin's block is used as part of a property value.
  * Fixed hardcoded `.styl` extension from CLI (added `extname` arg).

0.49.1 / 2014-09-24
===================

  * Fixed an output order of nested media queries.
  * Fixed regression with cached nodes.
  * Fixed support for `Woff2` and `WebP` mime-tipes, #1699.

0.49.0 / 2014-09-22
===================

  * Added a way to use plugins in stylus.render options, #1697.
  * Added LRU for memory caching.
  * Now returning literal CSS on parser error when `--resolve-url` is set.
  * Now not showing JS stack trace for stylus' `error()` calls.
  * Fixed inconsistent source maps' field orders.
  * Fixed bug with calling functions inside an inline loop.
  * Fixed bug with nested media queries inside a mixin.
  * Fixed bug with extending nested selector inside placeholder selector.
  * Fixed bug with alpha variable for hsla/rgba.
  * Fixed extending of rules inside unknown at-rules.
  * Fixed incorrect merging of media queries using variables.
  * Fixed bubbling for `@keyframes`.
  * Fixed incorrect `@supports` parsing.
  * Fixed `url()` support for `@namespace`.
  * Fixed incorrect filename and column information for cached nodes.
  * Fixed `--sourcemap-base` to be ignored when `--out` is present.
  * Fixed outputting sourcemap log message when `--print` was present.

0.48.1 / 2014-08-21
===================

  * Fixed sourcemap paths when `--out` flag is present, #1668.
  * Fixed the naming convention for maps: `.styl.map` => `.css.map`, #1668.

0.48.0 / 2014-08-20
===================

  * Added basic sourcemaps support, #1655.
  * Added info on columns for sourcemaps and better error reporting.
  * Added `globals` and `functions` keys to options object in JS API, #1653.
  * Added `rebeccapurple` named color.
  * Added `unicode-range` support (#1648).
  * Changed the behaviour of adding percents together to the more sane one, #1664.
  * Fixed bug with property lookup inside mixin block (#1645).
  * Fixed a bug with nested media queries inside mixins (#1643).
  * Fixed an `@extend` inside `@media` queries with multi-level selectors (#1658).
  * Fixed bug with cloning of an interpolated selector with comma (#1660).
  * Fixed bug with nested media queries in conditionals.
  * Fixed a bug with cached imports (#1641).
  * Fixed `@css` literal that generated `u+0085` characters instead of newlines (#1663).
  * Fixed escaped comma (`\,`) inside hashes (#1666).
  * Fixed a string representation of HSLA node to preserve `%` (#1439).
  * Fixed incorrect position of inline comments (#1597).
  * Fixed a bug with an apostrophe and a colon in a single-line comment (#1647).

0.47.3 / 2014-07-22
===================

  * Fixed support for schema-less urls inside `url()`.

0.47.2 / 2014-07-19
===================

  * Fixed comma-first multiline syntax, #1634.
  * Fixed hsla arguments for different color functions, #1619.
  * Fixed Bug with @media and placeholder selectors, #1625.
  * Fixed bug with nested media queries, 1620.
  * Fixed broken URL parsing for source and destination paths, #1613.

0.47.1 / 2014-07-02
===================

  * Fixed treatment of unknown pseudo-elements, #1608.
  * Fixed unit expression precedence error, #1611.

0.47.0 / 2014-07-01
===================

  * Added support for anonymous functions, #1580.
  * A lot of better color functions, #1526:
      * Added support for two arguments for `hsla`.
      * Added component setters (`red`, `hue`, `alpha` etc.).
      * Added `luminosity` bif.
      * Added `blend` bif.
      * Added `contrast` bif.
      * Added `transparentify` bif.
  * Added `list-separator` bif, #1576.
  * Added symlinks support to CLI, #1577.
  * Added idents and units coercion, #1605.
  * Fixed `@keyframes` parsing issue.
  * Fixed parse error when `{` is on a new line in at-rules.
  * Fixed an issue with multiline parsing.
  * Fixed another issue with cached imports, #1587.
  * Fixed illegal unary "%", missing left-hand operand, #1586.
  * Reverted #1527.

0.46.3 / 2014-06-09
===================

  * Fixed parse error, #1582.

0.46.2 / 2014-06-04
===================

  * Fixed regression with double writing of transparent mixin value, #1574.

0.46.1 / 2014-06-04
===================

  * Fixed regression with a root reference in interpolated selectors, #1573.

0.46.0 / 2014-06-03
===================

  * Added support for nested media queries, #1540.
  * Added `convert` built-in function, #1545.
  * Added negative index values support for subscripts, #1564.
  * Add short-circuit evaluation for logical operators, #1532.
  * Fixed the dropped commas in splat arguments, #1525.
  * Fixed double-writing the `@media` and other at-rules in mixins, #1535.
  * Fixed unit expression precedence error, #1537.
  * Fixed comments inside the property expressions, #1538.
  * Fixed handling of the `@css` and `unquote` inside groups, #1527.
  * Fixed incorrect line numbers on errors, #1543.
  * Fixed import cloning with cache, #1548.
  * Fixed cloning to preserve `property.literal`, #1558.
  * Fixed bifs arguments cloning bug, #1560.
  * Fixed bug with nested interpolated selectors with a comma, 1568.
  * Fixed `current-property` ignored in property lookup, #1565.
  * Fixed `current-property`'s value to be evaluated in the right context, #1562.
  * Fixed spaces and comments inside a hash declaration, #1554.
  * Fixed aliases for transparent mixins, #1557.
  * Fixed compilation fail when 'dest' path doesn't end with '/', #1541.
  * Fixed bug with CSS to Stylus `@keyframes` converting, #1549.

0.45.1 / 2014-05-16
===================

  * Fixed regression with `@require` and globbed paths inside functions, #1529.

0.45.0 / 2014-05-11
===================

  * Added support for more CSS-like syntax variants: indented code blocks, closing curly brace on the same line with props etc (as now ignoring meaningless tokens while parsing), #1506.
  * Added support for block-level `@import` and `@require`, #1495.
  * Added hash values support in `@media`, #1504.
  * Added coercion for pt units, #1483.
  * Added a way to escape `\` in a tag name, #1487.
  * Fixed trailing spaces and comments in the selector groups, #1499.
  * Fixed comments in the selector parts (now ignoring them), #1517.
  * Fixed bug with url string having a protocol, #1510.
  * Fixed bug with `@scope` and complex selectors, #1505.
  * Fixed the recursion with the `display: block` inside block mixins, #1515.
  * Fixed bug with current-property and block mixins, #1512.
  * Fixed bug with complex selectors in conditionals, #1500.
  * Fixed bug with `@media` bubbling and conditionals, #1518.
  * Fixed bug with newlines and comments in conditionals, #1520.
  * Fixed bug with the variable in the first line of mixin, #1502.
  * Fixed but with the variable right after iterating over an empty list, #1503.
  * Fixed bug with built-in function calls inside a hash assignment, #1488.
  * Fixed bug with `*` selector first in the group, #1498.
  * Fixed unnecessary bubbling for `@keyframes`, #1490.
  * Fixed bug with undefined `filename` on keyframes, #1485.

0.44.0 / 2014-04-23
===================

  * Major performance tuning and basic caching support, almost ⨉2 build time boost, #1428.
  * Added basic support for most at-rules, #1464.
  * Added `+cache` built-in mixin for caching the result of functions and mixins into placeholders, #1466.
  * Added `current-media()` bif that returns the string for the current media query, #1466.
  * Added `called-from` property in functions that contains the names of the functions from the call stack till the current one, #1466.
  * Added a way to escape commas and parent references inside selectors, #1413.
  * Removed the never needed `-ms-` prefix for keyframes.
  * Fixed rendering of multiple selectors inside interpolation, #1413.

0.43.1 / 2014-04-07
===================

  * Fixed regression with `only` keyword, #1460.

0.43.0 / 2014-04-05
===================

  * Added better support for media queries — interpolations, expressions in values and more, #1453.
  * Added `define` bif, #1382.
  * Add `--prefix` option for CLI and `+prefix-classes` mixin, #1420.
  * Added `--deps` flag to list the dependencies of the compiled file and stylus.deps function, #1429.
  * Added support for multiple selectors in `@extend`, #1419.
  * Added the support of the hash objects to `define`, #1444.
  * Fixed some floating point problems in maths, #1339.
  * Fixed the lost decimal part of units can when coercing from a string, #1387.
  * Fixed bug with hash lookup when a property name is the same as a name of local variable, #1433.
  * Fixed bug with the `+=` operator with strings, #1423.
  * Fixed a bug in recompiling of the files with `--watch`, #1435.
  * Fixed `default` value for `cursor` property (Temporally remove `default` from the pseudo-classes list), #1438.
  * Fixed the rendering of empty `@keyframes`, #1442.
  * Fixed parseColor for single digit integers in rgb(a) strings, #1447.
  * Fixed wrong named colors, #1450.


0.42.3 / 2014-03-03
==================

  * Fixed bug with pseudo-elements as part of the nested selector with a class, #1415.
  * Ignoring comments in REPL, #1390.
  * Fixed bug with print of the line numbers when node has empty `nodes` array, #1412.
  * Fixed bug with first argument for defaulted arguments, #1407.
  * Fixed compression of blocks with nested rules, #1396.
  * Fixed bug with importing of files with `.css` in the dirname, #1385.
  * Fixed eaten whitespace after selector with a keyword, #1383.

0.42.2 / 2014-01-30
==================

  * Added support for reverse ranges.
  * Fixed bug with an expression as arguments of function call.
  * Fixed bug with property lookup inside `@block`.
  * Fixed bug with parsing an attribute selector.
  * Fixed bug with `add-property` inside function call.
  * Fixed compiling to a directory with `.styl` in the name.
  * Fixed bug with missed `mtime` in middleware imports.
  * Fixed an incorrect line number in multi-line group selectors.
  * Fixed incorrect file path in win32 debug info, #1353.

0.42.1 / 2014-01-19
==================

  * Fixed color functions to fallback into literal CSS functions, #1340.
  * Fixed `@import` globbing with `--watch`.
  * Fixed Bug with units as part of the selector.
  * Fixed compiling with UTF-8 BOM.
  * Added Icons, and reorganization of graphics folder, #1346.

0.42.0 / 2014-01-06
==================

  * Added `@require`, #1287.
  * Added more lookup patterns for the `@import` and `@require`. Support Node.js modules, #1316.
  * Added file globbing, #1306 and #1013.
  * Added root reference, part of #1240.
  * Added basic support for `@block` entity, #1290.
  * Added string support for `selector()` bif, #1279.
  * Added options as an optional argument for `use()` bif, #1297.
  * Added some new colors shortcuts: grayscale, complement, tint & shade, #1308.
  * Fixed broken @media queries in logic blocks, #1289.
  * Fixed function call inside block mixin is on the `block` variable pass, #1285.
  * Fixed bug with `if` and color in array check, #1301.
  * Fixed bug with list of color keywords as default argument, #1294.
  * Fixed bug with property lookup in @media queries, #1315.
  * Now using `css-parse` instead of `CSSOM` for converting CSS -> Stylus, #1307.

0.41.3 / 2013-12-12
==================
  
  * Fixed regression for `selector`, #1278.

0.41.2 / 2013-12-10
==================
  
  * Fixed property lookup in blocks, #1273.
  * Fixed @extend in blocks, #1274.
  * Fixed if-else-if-else, #1276.

0.41.1 / 2013-12-08
==================

  * Fixed inaccessible local variable inside conditional which is inside a selector, #1267.
  * Fixed some minor issues with `selector()` interpolation, #1259.
  * Fixed missing hashes in base64 converted urls, #1263.
  * Fixed conditionals inside `@font-face`, #1268.

0.41.0 / 2013-11-30
==================

  * Added basic [block mixins](http://stylus-lang.com/docs/mixins.html#block-mixins) (`+foo`) with block interpolation (`block`), #1223.
  * Added [`selector()` bif](http://stylus-lang.com/docs/selectors.html#selector-bif), #1249.
  * Added [hash interpolation to blocks](http://stylus-lang.com/docs/hashes.html#interpolation), #1202.
  * Fixed parent reference in root context from returning `&`.
  * Fixed bug with double writing media blocks, 1ed44a81
  * Fixed a lot of regressions after hashes, #1230, #1236, #1237, #1248.

0.40.3 / 2013-11-16
==================

  * Fixed current-property to be available in function evaluation context, #1211.
  * Fixed another regression, #1215.

0.40.2 / 2013-11-12
==================

  * Fixed regression after the #1185, #1207.

0.40.1 / 2013-11-12
==================

  * Fixed assign to hashes using dot, #1201.
  * Fixed regression from the #1185.
  * Fixed precedence of the subscript operator, #1189.
  * Fixed imports in functions, #1192.
  * Fixed compressing of time units, #1204.

0.40.0 / 2013-11-05
==================

  * Allow multiple `end` event handlers + optional result css modification, #1180.
  * Added Support for proper hashes in json config, #1186.
  * Allow functions accept object literal as an argument, #1184.
  * Fixed another infinite loop (`a[` etc.), #1187.
  * Fixed bug in hashes subassigns with functions, #1181.
  * Fixed "is" attribute selectors fail, #1185.

0.39.4 / 2013-11-03
==================

  * Fixed another regression after #1150, #1183.

0.39.3 / 2013-11-01
==================

  * Fixed parse error in conditional statement without `()`, #1178.

0.39.2 / 2013-10-31
==================

  * Fixed other regressions after #1150, #1175.

0.39.1 / 2013-10-30
==================

  * Fixed regression after #1150, #1172.

0.39.0 / 2013-10-30
==================

  * Added basic hashes support, #1150.
  * Allow to inject Evaluator via Renderer's options, #1149.
  * Fixed infinite loop case, #1147.
  * Fixed Bug with `else if match`, #1154.
  * Fixed schemaless absolute urls for `url`, #1148.
  * Fixed urls in windows 7 for `--relative-url`, #1156.
  * Fixed calculation inside `calc` CSS function, #1133.
  * Fixed parsing shorthand colors from json config, #1158.

0.38.0 / 2013-09-24
==================

  * Fixed `push` not to modify the first element of another array, #1118.
  * Fixed property lookup from mixins, #1127.
  * Fixed support for `src` and `dest` in middleware, started tests for middleware #1143.
  * Fixed `--resolve-url` that removed tails from urls, #1126.
  * Fixed mime type for `.woff`, #1128.
  * Fixed `.toString` for undefined functions, #1119.
  * Fixed path overlap for non-string dest, #1115.
  * Fixed `path.resolve` for nonœ-true resolveURL, #1116.
  * Fixed sync return in `stylus.render()`, #1138.
  * Fixed duplicate calls from `this.calling`, #1122.

0.37.0 / 2013-08-19
==================

  * Added optional params to the json bif, #1102.
  * Added `--print` option to print CSS to stdout, #1108.
  * Fixed json bif to return literals for colours, #875.
  * Fixed include of the css files when `--resolve-url` is on, #1099.
  * Fixed error in negating variables, #1101.
  * Fixed bug in `p` function, #1111.
  * Fixed tests under windows, #1105.
  * Fixed regression after #1094, #1113.
  * Fixed regression after #983, #1098.

0.36.1 / 2013-08-06
==================

  * Fixed regression after #1090, #1094.

0.36.0 / 2013-08-01
==================

  * Added `substr`, `replace` and `split` bifs, #1088.
  * Added possibility to provide functions to src and dest, #930.
  * Added explicit expose for events, #898.
  * Added blocking and css manipulation possibility within 'end' event, #923.
  * Fixed unneeded code for imports, #1090.
  * Fixed mtime for literal imports, #983.
  * Fixed empty string as possible quote value for string node, #956.
  * Fixed non-symmetrical src and dest paths in middleware, #1037.

0.35.1 / 2013-07-29
==================

  * Fixed the support for progressive JPEGs in `image-size`, #1087.

0.35.0 / 2013-07-29
==================

  * Added jpeg and svg support to image-size, #1083.
  * Added `tan` trigonometric function, also `sin` and `cos` now  understand `deg` units.
  * Added fonts to data URI `url()` mimes, also the list of mimes is now configurable, #841, #1046.
  * Added base conversion for numbers, #714.
  * Fixes extends from nested mixins, #1084.
  * Fixes coercion error, #1082.

0.34.1 / 2013-07-12
==================

  * Fixed the regression after #865.

0.34.0 / 2013-07-12
==================

  * Added built-in `use()` function to extend Stylus from inside  of `.styl` files, #788.
  * Added optional resolver of relative urls, #1070.
  * Fixes incorrect imports lookup inside function call, #1069.
  * Fixes a lot of issues with trailing symbols in comments, #865.
  * Fixes brace on a newline CSS code style.
  * Some minor fixes to tmbundle: #975, #1033, #1034.
 
0.33.1 / 2013-06-30 
==================

  * Fixed the `exports.version` to always show an actual one.

0.33.0 / 2013-06-30 
==================

  * Added extendable placeholder selectors, #1014.
  * Added optional argument to `image-size` function, #812.
  * Fixed inline comments after selectors, #862.
  * Fixed a bug with empty block in CSS syntax, #712.
 
0.32.1 / 2013-02-27 
==================

  * fix issue on Windows where absolute path starts with two backslashes
  * fix extends within a loop.
  * fix: don't try to read absolute urls

0.32.0 / 2013-01-04 
==================

  * add sync api for #230 #691 #151
  * fix unsuppressed comments in nested imports
  * fix #911 Percentage calculation value not copied

0.31.0 / 2012-11-24 
==================

  * add support for rounding precision
  * fix extends with parent reference. Closes #879
  * fix importing of files with ".css" in the dirname
  * fix #619 Support slash in media  
  * fix #819 Extends generate duplicate selectors
  * fix #807 directory with `.styl` in the name and local install of stylus
  * fix #814 Add property function with media query
  * fix #828 Add 'x' unit for image-set (synonym to dppx).
  * fix #834 Percentage calculation not used when value is expression

0.30.1 / 2012-10-17 
==================

  * fix mozdocument nodes not getting visited during imports. Fixes #853

0.30.0 / 2012-10-15 
==================

  * add @-moz-document to the lexer and parser. Fixes #436
  * add --import for issue #485
  * fix @property lookup when a sibling is null
  * fix 'limit' file size option that was broken in 61a2cf
  * fix pseudo-selector properties. Closes #808

0.29.0 / 2012-08-15 
==================

  * add more features to the textmate bundle [paulmillr]
  * add `json()` BIF for loading variables from JSON files [geddesign]
  * fix for #790 allow trailing colon, comma etc in // comments [geddesign]

0.28.2 / 2012-07-15 
==================

  * fix extend in mixin. Closes #747, #748 and #751

0.28.1 / 2012-07-07 
==================

  * fix __@media__ cloning

0.28.0 / 2012-07-06 
==================

  * add suffix to `basename()` BIF
  * add `pathjoin()` BIF
  * add `basename()` BIF
  * add `dirname()` BIF
  * add `extname()` BIF
  * fix `@extend` in mixin. Closes #638

0.27.2 / 2012-06-19 
==================

  * Adding list of all css3 units
  * Fixed CSS to stylus conversion `!important` support
  * Fix last rule being ignored if empty indents at the end of the file
  * Fixes #425: Compiler hangs when the last property isn't followed by semicolon at the end of the document
  * Fixes #435: Can't concat array inside url()

0.27.1 / 2012-05-28 
==================

  * Fixes #698: incorrect function call within for with named argument [Tõnis Tiigi]
  * Fixes #676. Stylus incorrectly imports the .css files that are not in the same folder as the processed .styl file

0.27.0 / 2012-05-10 
==================

  * Added `add-property()` mixin support [jasonkuhrt]
  * Added % support for `fade-in()` and `fade-out()` [jasonkuhrt]
  * Added % support to `rgba()` [jasonkuhrt]
  * Fixed `.import()` - previously failed to mixin

0.26.1 / 2012-05-07 
==================

  * any node. Closes #657

0.26.0 / 2012-04-27 
==================

  * Added BIF shift [gravof]
  * Added BIF pop [gravof]
  * Added support for __@media__ bubbling properties [Ian MacLeod]
  * Changed: strip trailing zeros [gravof]

0.25.0 / 2012-04-03 
==================

  * Added `make test-cov`
  * Added temporary multiline support.
  * Added: allow for '%' unit type in the 'alpha' of rgba and hsla [jasonkuhrt]
  * Updated cssom dep
  * Removed growl dep. Closes #583
  * Fixed BIF retval coercion
  * Fixed issue #390, nested @media

0.24.0 / 2012-02-16 
==================

  * Added `mix()` BIF (docs needed)
  * Added: cast return values from js functions
  * Fixed binops in mixin selectors. Closes #566
  * Fixed `opposite-position()` pass through "center"`

0.23.0 / 2012-02-02 
==================

  * Added `Renderer` "end" event
  * Added: cast return value from js-functions
  * Cleaned up documentation grammar etc [Zearin]

0.22.6 / 2012-01-20 
==================

  * Fixed postfix conditional cloning. Closes #535
  * Fixed idents prefixed with several hyphens. Closes #536
  * Fixed up the TextMate bundle syntax [ianstormtaylor]

0.22.5 / 2012-01-16 
==================

  * Fixed underscore in function identifier. Closes #524

0.22.4 / 2012-01-11 
==================

  * Fixed __@extends__ inheritance bug. Closes #499
  * Fixed 'lineno' global leak due to missing `new` [teppeis]

0.22.3 / 2012-01-11 
==================

  * Fixed `--watch` working on windows with a temporary hack [dciccale]
  * Fixed __@extend__ with no properties. Closes #498

0.22.2 / 2012-01-08 
==================

  * Added: allow newlines in place of commas for keyframes
  * Fixed: skip comment newlines between keyframe positions. Closes #504

0.22.1 / 2012-01-08 
==================

  * Fixed __@keyframes__ support for multiple values. Closes #503

0.22.0 / 2012-01-04 
==================

  * Added `@extend`. Closes #149
  * Added more syntax highlighting to TextMate bundle [paulmillr]
  * Added `keys(pairs)` and `values(pairs)` BIFs
  * Added JavaScript object coercion support
  * Added JavaScript -> Stylus node coercion utilities
  * Fixed `.define()`ing of functions
  * Fixed `stylus(1)` repl for 0.6.x

0.21.2 / 2011-12-22 
==================

  * Fixed literal / within function call. Closes #432

0.21.1 / 2011-12-20 
==================

  * Fixed space after `)` in selectors. Closes #449

0.21.0 / 2011-12-17 
==================

  * Added unit casting, ex: `(n * 5)%`. Closes #285

0.20.1 / 2011-12-16 
==================

  * Added global leak detection to the test suite
  * Fixed two globals
  * Fixed operator ident regression. Closes #292

0.20.0 / 2011-12-11 
==================

  * Added `--include-css` to literally include imported CSS. Closes #448
  * Fixed coercion bug with expression. Closes #480

0.19.8 / 2011-12-01 
==================

  * Fixed middleware `mkdir -p` support

0.19.7 / 2011-11-30 
==================

  * Fixed `or` binop regression. Closes #475

0.19.6 / 2011-11-30 
==================

  * Fixed current-property with commas. Closes #472

0.19.5 / 2011-11-28 
==================

  * revert noop visitor methods, this breaks extensions

0.19.4 / 2011-11-28 
==================

  * Fixed css-style __@page__ support
  * Fixed __@page__ block evaluation
  * Fixed __@font-face__ block evaluation [Suor]

0.19.3 / 2011-11-17 
==================

  * Added "include css" setting (need docs) to literally include imported css. Closes #448
  * Added EOL escape. Related to #195
  * Fixed tab support in lexical analysis (trailing colors etc). Closes #460

0.19.2 / 2011-11-09 
==================

  * Fixed "in" within selectors. Closes #458

0.19.1 / 2011-11-08 
==================

  * Added `spin()` BIF (same as `color + 50deg` etc)
  * Removed "sys" require()s for 0.6.x
  * Fixed sibling property lookup bug. Closes #452
  * Fixed: retain original quote for strings

0.19.0 / 2011-10-26 
==================

  * Added property lookup bubbling support. Closes #446

0.18.1 / 2011-10-26 
==================

  * Added "indent spaces" compiler setting. Closes #445
  * Allow node > 0.4.x < 0.7.0
  * Fixed: allow function execution within @imports

0.18.0 / 2011-10-21 
==================

  * Added #n support (#e -> #eeeeee). Closes #430
  * Added #nn support (#ef -> #efefef)
  * Added support for rgb percentages.
  * Fixed property rendering in blocks. Closes #440

0.17.0 / 2011-09-30 
==================

  * Added `@scope <selector>` feature to scope all subsequent selectors
  * Added list equality to the `!=` operator
  * Added list equality to the `==` operator
  * Added mkdir -p support to the middleware
  * Changed: `!` coerces expression not the first value
  * Fixed Ternary boolean coercion. Closes #420
  * Fixed __@font-face__ __@import__ regression. Closes #418

0.16.0 / 2011-09-26 
==================

  * Added `mkdir -p` support to the middleware
  * Added `@import url(string)` support. Closes #352
  * Added `fade-in()` and `fade-out()` BIFs
  * Adding prefixes for Opera and IE
  * Fixed comments trailing __@media__. Closes #415 [guillermo]
  * Fixed: Output from --help in stylus executable cut-off half way through
  * Changed: treat -/+ operations with percentages as lighten()/darken(). 
Closes #401

0.15.4 / 2011-09-14 
==================

  * Fixed `String#coerce()` for Expressions

0.15.3 / 2011-09-14 
==================

  * Added `-U, --inline` to stylus(1)
  * Added `rem` support. Closes #395
  * Fixed __@charset__ semi-colon. Closes #400
  * Fixed infinite loop in `Parser#function()`. Closes #393

0.15.2 / 2011-09-06 
==================

  * Added alias `:=` of `?=`. Closes #389
  * Removed auto-prefixing of pseudo element selectors. Closes #385
  * Changed: when left-hand operand has no unit assign the right
  * Fixed __@keyframes__ with __@import__ regression. Closes #372
  * Fixed css __@import__ within blocks regression. Closes #388
  * Fixed unwrapping of property args expression. Closes #379
  * Fixed __@prop__ access scope issue, use closet block, not current
  * Fixed __@font-face__. Closes #375

0.15.1 / 2011-08-18 
==================

  * Added pseudo-element vendor expansion support
  * Added `@keyframe` expansion support. Closes #293
  * Added support for arbitrary `@-VENDOR-keyframes` support
  * Added support for `@property` mixin property access Closes #363
  * Added `/*!` support to comments to disable suppression
  * Changed: allow uses to append `.styl` when importing. Closes #366
  * Fixed paren matching issue. Closes #368
  * Fixed windows absolute path checking Added `utils.absolute(path)`
  * Fixed `Ident#clone()` with `.property` flag
  * Fixed evaluation of expression when using @name. Closes #361
  * Fixed `path.join()` usage in `utils.lookup()`. Closes #356
  * Fixed space after comment regression. Closes #360

0.15.0 / 2011-08-15 
==================

  * Adding `Renderer#get(option)`
  * Added the ability to reference property values with `@<name>`. Closes #344
  * Changed comment output. css-style multi-line comments are preserved
  * Fixed issue with bools in selectors. Closes #280

0.14.0 / 2011-08-10 
==================

  * Added firebug original file / line number mapping [parallel]
  * Added support for `#rgba` and `#rrggbbaa` color formats
  * Changed: fix alpha to a scale of 2
  * Fixing function param check to allow for empty function arguments

0.13.9 / 2011-08-04 
==================

  * Fixed `lighten()` BIF 'lighten by %' function push color closer to white [cwolves]
  * Fixed cli plugin usage absolute paths, don't prepend the CWD [cpojer]
  * Renaming 'import' to '_import' because import is a reserved word in node v0.5

0.13.8 / 2011-08-01 
==================

  * Added `PI` and `-math-prop(name)`
  * Added `cos()` and `sin()`
  * Added support for __SVG__ data URIs [mhemesath]
  * Rename variable "import" to "imported" [eegg]

0.13.7 / 2011-07-15 
==================

  * Added `js(str)` BIF
  * Fixed reserved keyword `import` with `imported`

0.13.6 / 2011-07-12 
==================

  * Added `@-webkit-keyframes` support. Closes #307
  * Added gedit language-spec
  * Changed: optional `growl` dep for stylus(1)
  * Changed: `require("stylus")` instead of `../` for the mac app integration

0.13.5 / 2011-06-27 
==================

  * Fixed middleware handling of new and removed `@import` s [brandonbloom]

0.13.4 / 2011-06-22 
==================

  * Added __Compile and Display CSS__ TextMate command (⌘B) [Daniel Gasienica]
  * Fixed caching behavior for recompilation of files with changed imports [Brandon Bloom]

0.13.3 / 2011-06-01 
==================

  * Added padding for error linenos so they line up
  * Improved unary op error messages
  * Improved invalid `@keyframes` ident error msg
  * Fixed HSLA regression for operations resulting in a bool. Closes #274
  * Fixed `arguments` issue with excluding defaults. Closes #272

0.13.2 / 2011-05-31 
==================

  * Fixed colors after `url()` call regression. Closes #270

0.13.1 / 2011-05-30 
==================

  * Fixed colors in `url()`. Closes #267
  * Fixed selector without trailing comma containing selector token. Closes #260

0.13.0 / 2011-05-17 
==================

  * Added `-u, --use PATH` flag for utilizing plugins
  * Fixed `hsla.clampDegrees()` with negative values [Bruno Héridet]

0.12.4 / 2011-05-12 
==================

  * Added support for underscore in identifiers. Closes #247
  * Fixed `@keyframe` block evaluation. Closes #252

0.12.3 / 2011-05-08 
==================

  * Fixed `0%` in `@keyframes` from becoming `0` when compressed. Closes #248

0.12.2 / 2011-05-03 
==================

  * Fixed issue with `^=` attr selector causing infinite loop. Closes #244
  * Fixed multiple occurrences of `&` in selectors. Closes #243

0.12.1 / 2011-04-29 
==================

  * Fixed spaces around line-height shorthand. Closes #228
  * Fixed `-{foo}` interpolation support. Closes #235

0.12.0 / 2011-04-29 
==================

  * Added `*prop: val` hack support (blueprint / html boilerplate etc parse fine now)
  * Added selector interpolation support
  * Fixed "-" within interpolation. Closes #220

0.11.12 / 2011-04-27 
==================

  * Added `SyntaxError` and `ParseError`
  * Removed `stylus.parse()`
  * Fixed error reporting. Closes #44

0.11.11 / 2011-04-24 
==================

  * Fixed mutation of units when using unary ops. Closes #233

0.11.10 / 2011-04-17 
==================

  * Fixed regression. Closes #229

0.11.9 / 2011-04-15 
==================

  * Fixed issue with large selectors spanning several lines

0.11.8 / 2011-04-15 
==================

  * Added support for `Renderer#define(name, node)` to define a global

0.11.7 / 2011-04-12 
==================

  * Added `Renderer#use(fn)`. Closes #224
  * Improved `utils.assertType()` error message; include param name

0.11.6 / 2011-04-12 
==================

  * Fixed: node.source and node.filename are writable

0.11.5 / 2011-04-12 
==================

  * Added / employed `Null#isNull`
  * Added / employed `Boolean#is{True,False}`
  * Removed all uses of `instanceof`
  * Removed all equality checks between singleton nodes

0.11.4 / 2011-04-10 
==================

  * Added `Arguments#clone()`
  * Added `push()` / `append()`
  * Added `unshift()` / `prepend()` BIFs

0.11.3 / 2011-04-08 
==================

  * Fixed: keyword args previously not evaluated
  * Fixed: subpixel support
  * Fixed bug preventing combinators (and other ops) in `@media` blocks. Closes #216 [reported by jsteenkamp]

0.11.2 / 2011-04-06 
==================

  * Added `Renderer#include(path)`. Closes #214
  * Fixed `@import` path resolution bug. Closes #215
  * Fixed optional keyword arg bug. Closes #212

0.11.1 / 2011-04-01 
==================

  * Fixed regression preventing commas from outputting

0.11.0 / 2011-04-01 
==================

  * Added `HSLA#add(h,s,l,a)`
  * Added `HSLA#sub(h,s,l,a)`
  * Added `RGBA#add(r,g,b,a)`
  * Added `RGBA#sub(r,g,b,a)`
  * Added `RGBA#multiply(n)`
  * Added `RGBA#divide(n)`
  * Added `HSLA#adjustHue(deg)`
  * Added `HSLA#adjustLightness(percent)`
  * Added `HSLA#adjustSaturation(percent)`
  * Added `linear-gradient()` example
  * Added `s(fmt, ...)` built-in; sprintf-like
  * Added `%` sprintf-like string operator, ex: `'%s %s' % (1 2)`
  * Added `current-property` local variable
  * Added `add-property(name, val)` 
  * Added the ability for functions to duplicate the property they are invoked within
  * Added `[]=` operator support. Ex: `fonts[1] = arial`, `nums[1..3] = 2`
  * Added `-I, --include <path>` to stylus(1). Closes #206
  * Added support for `50 + 25% == 75`
  * Added support for `rgba + 25%` to lighten
  * Added support for `rgba - 25%` to darken
  * Added support for `rgba - 25` to adjust rgb values
  * Changed: null now outputs "null" instead of "[Null]"
  * Fixed hsl operation support, all operations are equivalent on rgba/hsla nodes
  * Fixed degree rotation

0.10.0 / 2011-03-29 
==================

  * Added keyword argument support
  * Added `Arguments` node, acts like `Expression`
  * Added `utils.params()`
  * Added `debug` option to stylus middleware
  * Added support for `hsl + 15deg` etc to adjust hue
  * Added special-case for percentage based `RGBA` operations (`#eee - 20%`)
  * Changed: right-hand colors in operations are not clamped (`#eee * 0.2`)
  * Added support for `unit * color` (swaps operands)
  * Fixed color component requests on the opposite node type (ex red on hsla node)
  * Fixed `Expression#clone()` to support `Arguments`
  * Fixed issue with middleware where imports are improperly mapped
  * Fixed mutation of color when adjusting values
  * Fixed: coerce string to literal
  * Removed {`darken`,`lighten`}`-by()` BIFs

0.9.2 / 2011-03-21 
==================

  * Removed a `console.log()` call

0.9.1 / 2011-03-18 
==================

  * Fixed connect middleware `@import` support. Closes #168
    The middleware is now smart enough to know when imports
    change, and will re-compile the target file.

  * Changed middleware `compile` function to return the `Renderer` (API change)

0.9.0 / 2011-03-18 
==================

  * Added `-i, --interactive` for the Stylus REPL (eval stylus expressions, tab-completion etc)
  * Added link to vim syntax
  * Changed `p()` built-in to display parens
  * Changed `--compress -C` to `-c`, and `-css -c` is now `-C`
  * Fixed: preserve rest-arg expressions. Closes #194
  * Fixed `*=` in selector, ex `[class*="foo"]`
  * Fixed `--watch` issue with growl, updated to 1.1.0. Closes #188
  * Fixed negative floats when compressed. Closes #193 [reported by ludicco]

0.8.0 / 2011-03-14 
==================

  * Added postfix `for`-loop support.
    Ex: `return n if n % 2 == 0 for n in nums` 
  * Added support for several postfix operators
    Ex: `border-radius: 5px if true unless false;`
  * Added `last(expr)` built-in function
  * Added `sum(nums)` built-in function
  * Added `avg(nums)` built-in function
  * Added `join(delim, vals)` built-in function
  * Added `Evaluator#{currentScope,currentBlock}`
  * Added multi-line function parameter definition support
  * Changed: `0` is falsey, `0%`, `0em`, `0px` etc truthy. Closes #160
  * Fixed `for` implicit __return__ value
  * Fixed `for` explicit __return__ value
  * Fixed mixin property ordering

0.7.4 / 2011-03-10 
==================

  * Added `RGBA` node
  * Added `is a "color"` special-case, true for `HSLA` and `RGBA` nodes.
Closes #180
  * Performance; 2.5× faster compiles due to removing use of getters in `Parser` and `Lexer` (yes, they are really slow).
  * Removed `Color` node
  * Fixed stylus(1) `--watch` support due to dynamic `@import` support. Closes #176

0.7.3 / 2011-03-09 
==================

  * Fixed: allow semi-colons for non-css syntax for one-liners

0.7.2 / 2011-03-08 
==================

  * Added `isnt` operator (same as `is not` and `!=`)
  * Added support for dynamic `@import` expressions
  * Added `@import` index resolution support
  * Added `light()` / `dark()` BIFs
  * Added `compress` option for Connect middleware [disfated]
  * Changed: most built-in functions defined in stylus (`./lib/functions/index.styl`)
  * Fixed dynamic expressions in `url()`. Closes #105

0.7.1 / 2011-03-07 
==================

  * Fixed connect middleware for 0.4.x

0.7.0 / 2011-03-02 
==================

  * Added `is` and `is not` aliases for `==` and `!=`
  * Added `@keyframes` dynamic name support
  * Fixed units in interpolation
  * Fixed clamping of HSLA degrees / percentages

0.6.7 / 2011-03-01 
==================

  * Fixed __RGBA__ -> __HSLA__ conversion due to typo

0.6.6 / 2011-03-01 
==================

  * Added string -> unit type coercion support aka `5px + "10"` will give `15px`
  * Added `warn` option Closes #152
    Currently this only reports on re-definition of functions
  * Added `$` as a valid identifier character
  * Added `mixin` local variable for function introspection capabilities. Closes #162
  * Fixed typo: `Unit#toBoolean()` is now correct
  * Fixed interpolation function calls. Closes #156
  * Fixed mixins within Media node. Closes #153
  * Fixed function call in ret val. Closes #154

0.6.5 / 2011-02-24 
==================

  * Fixed parent ref `&` mid-selector bug. Closes #148 [reported by visnu]

0.6.4 / 2011-02-24 
==================

  * Fixed `for` within brackets. Closes #146

0.6.3 / 2011-02-22 
==================

  * Fixed single-ident selectors. Closes #142
  * Fixed cyclic `@import` with file of the same name. Closes #143

0.6.2 / 2011-02-21 
==================

  * Added stylus(1) growl support when using `--watch`
  * Added `@import` watching support to stylus(1). Closes #134
  * Changed: stylus(1) only throws when `--watch` is not used
  * Fixed `darken-by()` BIF
  * Fixed `@import` literal semi-colon. Closes #140

0.6.1 / 2011-02-18 
==================

  * Fixed evaluation of nodes after a return. Closes #139

0.6.0 / 2011-02-18 
==================

  * Added `stylus(1)` direct css to stylus file conversion [Mario]
    For example instead of `$ stylus --css < foo.css > foo.styl`
    you may now either `$ stylus --css foo.css` or provide
    a destination path `$ stylus --css foo.css /tmp/out.styl`.

  * Added postfix conditionals. Closes #74
    Expressive ruby-ish syntax, ex: `padding 5px if allow-padding`.

0.5.3 / 2011-02-17 
==================

  * Added `in` operator. `3 in nums`, `padding in props` etc
  * Added `Expression#hash`, hashing all of the nodes in order
  * Added tests for conditionals with braces. Closes #136
  * Fixed ids that are also valid colors. Closes #137

0.5.2 / 2011-02-15 
==================

  * Fixed spaces after `}` with css-style. Closes #131
  * Fixed single-line css-style support. Closes #130

0.5.1 / 2011-02-11 
==================

  * Fixed mixin property ordering. Closes #125

0.5.0 / 2011-02-09 
==================

  * Added `lighten-by()` BIF
  * Added `darken-by()` BIF

0.4.1 / 2011-02-09 
==================

  * Added support for function definition braces
  * Fixed issue with invalid color output. Closes #127

0.4.0 / 2011-02-07 
==================

  * Added css-style syntax support
  * Fixed support for `*` selector within `@media` blocks

0.3.1 / 2011-02-04 
==================

  * Fixed property disambiguation logic. Closes #117
    You no longer need to add a trailing comma when
    chaining selectors such as `td:nth-child(2)\ntd:nth-child(3)`

0.3.0 / 2011-02-04 
==================

  * Added more assignment operators. Closes #77
    `+=`, `-=`, `*=`, `/=`, and `%=`

0.2.1 / 2011-02-02 
==================

  * Fixed `--compress` when passing files for stylus(1). Closes #115
  * Fixed bug preventing absolute paths from being passed to `@import`
  * Fixed `opposite-position()` with nested expressions, unwrapping
  * Fixed a couple global var leaks [aheckmann]

0.2.0 / 2011-02-01 
==================

  * Added: `url()` utilizing general lookup paths.
    This means that `{ paths: [] }` is optional now, as lookups
    will be relative to the file being rendered by default.

  * Added `-w, --watch` support to stylus(1). Closes #113

0.1.0 / 2011-02-01 
==================

  * Added `opposite-position(positions)` built-in function
  * Added `image-lookup(path)` built-in function
  * Added `-o, --out <dir>` support to stylus(1)
  * Added `stylus [file|dir ...]` support
  * Added: defaulting paths to `[CWD]` for stylus(1)
  * Changed: `unquote()` using `Literal` node
  * Changed: utilizing `Literal` in place of some `Ident`s

0.0.2 / 2011-01-31 
==================

  * Added optional property colon support. Closes #110
  * Added `--version` to stylus(1) 

0.0.1 / 2011-01-31 
==================

  * Initial release
