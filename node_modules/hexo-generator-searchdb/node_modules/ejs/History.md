
1.0.0 / 2014-03-24
==================

 * change: escape & even if it looks like an HTML entity. Don't try to prevent double-escaping.

0.8.6 / 2014-03-21
==================

 * fix: Escape & even if it looks like an HTML entity. Don't try to prevent double-escaping.

0.8.5 / 2013-11-21
==================

 * fix: Escape apostrophe & don't over-match existing entities
 * fix function name changed by uglify
 * fixes require, closes #78

0.8.4 / 2013-05-08
==================

  * fix support for colons in filter arguments
  * fix double callback when the callback throws
  * rename escape option

0.8.3 / 2012-09-13
==================

  * allow pre-compiling into a standalone function [seanmonstar]

0.8.2 / 2012-08-16
==================

  * fix include "open" / "close" options. Closes #64

0.8.1 / 2012-08-11
==================

  * fix comments. Closes #62 [Nate Silva]

0.8.0 / 2012-07-25
==================

  * add `<% include file %>` support
  * fix wrapping of custom require in build step. Closes #57

0.7.3 / 2012-04-25
==================

  * Added repository to package.json [isaacs]

0.7.1 / 2012-03-26
==================

  * Fixed exception when using express in production caused by typo. [slaskis]

0.7.0 / 2012-03-24
==================

  * Added newline consumption support (`-%>`) [whoatemydomain]

0.6.1 / 2011-12-09
==================

  * Fixed `ejs.renderFile()`

0.6.0 / 2011-12-09
==================

  * Changed: you no longer need `{ locals: {} }`

0.5.0 / 2011-11-20
==================

  * Added express 3.x support
  * Added ejs.renderFile()
  * Added 'json' filter
  * Fixed tests for 0.5.x

0.4.3 / 2011-06-20
==================

  * Fixed stacktraces line number when used multiline js expressions [Octave]

0.4.2 / 2011-05-11
==================

  * Added client side support

0.4.1 / 2011-04-21
==================

  * Fixed error context

0.4.0 / 2011-04-21
==================

  * Added; ported jade's error reporting to ejs. [slaskis]

0.3.1 / 2011-02-23
==================

  * Fixed optional `compile()` options

0.3.0 / 2011-02-14
==================

  * Added 'json' filter [Yuriy Bogdanov]
  * Use exported version of parse function to allow monkey-patching [Anatoliy Chakkaev]

0.2.1 / 2010-10-07
==================

  * Added filter support
  * Fixed _cache_ option. ~4x performance increase

0.2.0 / 2010-08-05
==================

  * Added support for global tag config
  * Added custom tag support. Closes #5
  * Fixed whitespace bug. Closes #4

0.1.0 / 2010-08-04
==================

  * Faster implementation [ashleydev]

0.0.4 / 2010-08-02
==================

  * Fixed single quotes for content outside of template tags. [aniero]
  * Changed; `exports.compile()` now expects only "locals"

0.0.3 / 2010-07-15
==================

  * Fixed single quotes

0.0.2 / 2010-07-09
==================

  * Fixed newline preservation

0.0.1 / 2010-07-09
==================

  * Initial release
