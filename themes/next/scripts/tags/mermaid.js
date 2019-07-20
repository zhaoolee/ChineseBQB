/**
 * mermaid.js | https://theme-next.org/docs/tag-plugins/mermaid
 */

/* global hexo */

'use strict';

function mermaid(args, content) {
  return `<pre class="mermaid" style="text-align: center;">
            ${args.join(' ')}
            ${content}
          </pre>`;
}

hexo.extend.tag.register('mermaid', mermaid, {ends: true});
