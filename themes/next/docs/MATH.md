<h1 align="center">Math Equations</h1>

NexT provides two render engines for displaying Math Equations.

If you choose to use this feature, you don't need to manually import any JS or CSS. You just need to turn on `enable` of `math` and choose a render `engine` for it (located in `next/_config.yml`):

```yml
math:
  enable: true
  ...
  engine: mathjax
```

Notice: only turning on `enable` of `math` **cannot let you see the displayed equations correctly**, you need to install the **corresponding Hexo Renderer** to fully support the display of Math Equations. The corresponding Hexo Renderer per engine will be provided below.

<h2 align="center">Provided Render Engine</h2>

For now, NexT provides two Render Engines: [MathJax](https://www.mathjax.org/) and [Katex](https://khan.github.io/KaTeX/) (default is MathJax).

### MathJax (default)

If you use MathJax to render Math Equations, you need to use **only one of them**: [hexo-renderer-pandoc](https://github.com/wzpan/hexo-renderer-pandoc) or [hexo-renderer-kramed](https://github.com/sun11/hexo-renderer-kramed).

Firstly, you need to uninstall the original renderer `hexo-renderer-marked`, and install one of the renderer above:

```sh
npm un hexo-renderer-marked --save
npm i hexo-renderer-pandoc --save # or hexo-renderer-kramed
```

Secondly, in `next/_config.yml`, turn on `enable` of `math` and choose `mathjax` as `engine`.

```yml
math:
  enable: true
  ...
  engine: mathjax
  #engine: katex
```

Finally, run standard Hexo generate, deploy process or start the server:

```sh
hexo clean && hexo g -d
# or hexo clean && hexo s
```

#### Numbering and referring equations in MathJax

In the new version of NexT, we have added feature to automatically number equations and to refer to equations. We briefly describe how to use this feature below.

In general, to make the automatic equation numbering work, you have to wrap your LaTeX equations in `equation` environment. Using the plain old style (i.e., wrap an equation with two dollar signs in each side) will not work. How to refer to an equation? Just give a `\label{}` tag and then in your later text, use `\ref{}` or `\eqref{}` to refer it. Using `\eqref{}` is preferred since if you use `\ref{}`, there are no parentheses around the equation number. Below are some of the common scenarios for equation numbering.

For simple equations, use the following form to give a tag,

```latex
$$\begin{equation}
e=mc^2
\end{equation}\label{eq1}$$
```

Then, you can refer to this equation in your text easily by using something like

```
the famous matter-energy equation $\eqref{eq1}$ proposed by Einstein ...
```

For multi-line equations, inside the `equation` environment, you can use the `aligned` environment to split it into multiple lines:

```latex
$$\begin{equation}
\begin{aligned}
a &= b + c \\
  &= d + e + f + g \\
  &= h + i
\end{aligned}
\end{equation}\label{eq2}$$
```

We can use `align` environment to align multiple equations. Each of these equations will get its own numbers.

```
$$\begin{align}
a &= b + c \label{eq3} \\
x &= yz \label{eq4}\\
l &= m - n \label{eq5}
\end{align}$$
```

In the `align` environment, if you do not want to number one or some equations, just [use `\nonumber`](https://tex.stackexchange.com/questions/17528/show-equation-number-only-once-in-align-environment) right behind these equations. Like the following:

```latex
$$\begin{align}
-4 + 5x &= 2+y \nonumber  \\
 w+2 &= -1+w \\
 ab &= cb
\end{align}$$
```

Sometimes, you want to use more “exotic” style to refer your equation. You can use `\tag{}` to achieve this. For example:

```latex
$$x+1\over\sqrt{1-x^2} \tag{i}\label{eq_tag}$$
```

For more information, you can visit the [official MathJax documentation on equation numbering](http://docs.mathjax.org/en/latest/tex.html#automatic-equation-numbering). You can also visit this [post](https://jdhao.github.io/2018/01/25/hexo-mathjax-equation-number/) for more details. 

### Katex

The Katex engine is a **much faster** math render engine compared to MathJax. And it could survive without JavaScript.

But, what Katex supports is not as full as MathJax. You could check it from the Useful Links below.

If you use Katex to render Math Equations, you need to use **only one of those renderer**: [hexo-renderer-markdown-it-plus](https://github.com/CHENXCHEN/hexo-renderer-markdown-it-plus) or [hexo-renderer-markdown-it](https://github.com/hexojs/hexo-renderer-markdown-it).

Firstly, you need to uninstall the original renderer `hexo-renderer-marked`, and **install one of selected above**.

```sh
npm un hexo-renderer-marked --save
npm i hexo-renderer-markdown-it-plus --save
# or hexo-renderer-markdown-it
```

Secondly, in `next/_config.yml`, turn on `enable` option of `math` and choose `katex` as render `engine`.

```yml
math:
  enable: true
  ...
  #engine: mathjax
  engine: katex
```

Finally, run the standard Hexo generate, deploy process or start the server:

```sh
hexo clean && hexo g -d
# or hexo clean && hexo s
```

#### If you use hexo-renderer-markdown-it

If you use `hexo-renderer-markdown-it`，you also need to add `markdown-it-katex` as its plugin：

```
npm i markdown-it-katex --save
```

And then in `hexo/_config.yml` you need to add `markdown-it-katex` as a plugin for `hexo-renderer-markdown-it`:

```yml
# config of hexo-renderer-markdown-it
markdown:
  render:
    html: true
    xhtmlOut: false
    breaks: true
    linkify: true
    typographer: true
    quotes: '“”‘’'
  plugins:
    - markdown-it-katex
```

#### Known Bugs

1. Firstly, please check [Common Issues](https://github.com/Khan/KaTeX#common-issues) of Katex.
2. Displayed Math (i.e. `$$...$$`) needs to started with new clear line.\
   In other words: you must not have any characters (except of whitespaces) **before the opening `$$` and after the ending `$$`** ([comment #32](https://github.com/theme-next/hexo-theme-next/pull/32#issuecomment-357489509)).
3. Don't support Unicode ([comment #32](https://github.com/theme-next/hexo-theme-next/pull/32#issuecomment-357489509)).
4. Inline Math (..`$...$`) must not have white spaces **after the opening `$` and before the ending `$`** ([comment #32](https://github.com/theme-next/hexo-theme-next/pull/32#issuecomment-357489509)).
5. If you use math in Heading (i.e. `## Heading`).\
   Then in corresponding TOC item it will show the related LaTex code 3 times ([comment #32](https://github.com/theme-next/hexo-theme-next/pull/32#issuecomment-359018694)).
6. If you use math in your post's title, it will not be rendered ([comment #32](https://github.com/theme-next/hexo-theme-next/pull/32#issuecomment-359142879)).

We currently use Katex 0.7.1, some of those bugs might be caused by the outdated version of Katex we use.

But, as what is described in the beginning, the render of Math Equations relies on Hexo Renderer. Currently, Katex-related renderers only support Katex version until 0.7.1.

We will continuously monitor the updates of corresponding renderers, if there is a renderer which supports newer version of Katex, we will update the Katex we use.

### Useful Links

* [Speed test between Katex and MathJax](https://www.intmath.com/cg5/katex-mathjax-comparison.php)
* [Function support by Katex](https://khan.github.io/KaTeX/function-support.html)

<h2 align="center">Configuration Specifications</h2>

ATTENTION! When you edit those configs, **don't change indentation!**

Currently, all NexT config use **2 spaces indents**.

If your content of config is put just directly after the config name, then a space is needed between the colon and the config content (i.e. `enable: true`)

```yml
# Math Equations Render Support
math:
  enable: false

  # Default(true) will load mathjax/katex script on demand
  # That is it only render those page who has 'mathjax: true' in Front-matter.
  # If you set it to false, it will load mathjax/katex srcipt EVERY PAGE.
  per_page: true

  engine: mathjax
  #engine: katex

  # hexo-renderer-pandoc (or hexo-renderer-kramed) needed to full MathJax support.
  mathjax:
    # For newMathJax CDN (cdnjs.cloudflare.com) with fallback to oldMathJax (cdn.mathjax.org).
    cdn: //cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML
    # For direct link to MathJax.js with CloudFlare CDN (cdnjs.cloudflare.com).
    #cdn: //cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js?config=TeX-MML-AM_CHTML

  # hexo-renderer-markdown-it-plus (or hexo-renderer-markdown-it with markdown-it-katex plugin)
  # needed to full Katex support.
  katex:
    # Use Katex 0.7.1 as default
    cdn: //cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.css
    # If you want to try the latest version of Katex, use one below instead
    #cdn: //cdn.jsdelivr.net/katex/latest/katex.min.css
```

### enable

`true` or `false`, default is `false`.

`true` to turn on render of Math Equations, `false` to turn off it.

### per_page

`true` or `false`, default is `true`.

This option is to control whether to render Math Equations every page.

The behavior of default (`true`) is to render Math Equations **on demand**.

It will only render those posts which have `mathjax: true` in their Front-matter.

For example:

```md
<!-- This post will render the Math Equations -->
---
title: 'Will Render Math'
mathjax: true
---
....
```

```md
<!-- This post will NOT render the Math Equations -->
---
title: 'Not Render Math'
mathjax: false
---
....
```

```md
<!-- This post will NOT render the Math Equations either -->
---
title: 'Not Render Math Either'
---
....
```

When you set it to `false`, the math will be rendered on **EVERY PAGE**.

### cdn

Both MathJax and Katex provide a config `cdn`, if you don't know what is `cdn`, **do not touch it**.

Firstly, both MathJax and Katex use the [jsDelivr](https://www.jsdelivr.com/) as the default CDN.

The reason that jsDelivr is chosen is because it is fast everywhere, and jsDelivr has the valid ICP license issued by the Chinese government, it can be accessed in China pretty well.

And we also provide other optional CDNs, including the famous [CDNJS](https://cdnjs.com/).

For MathJax, we are currently using version 2.7.1.

For Katex, due to the problem described above, we are now using version 0.7.1.

If you want to try the other CDNs not included in the optional list, you must use the corresponding version.

Particularly, if you are a Chinese blogger or most of your visits come from China, please note that **the CDNJS is blocked in some parts of China**, don't use it as your CDN.
