# Mixins
## Gradient
Nib's gradient support is by far the largest feature it provides. Not only is the syntax extremely similar to what you would normally write, it's more forgiving, expands to vendor equivalents, and can even produce a PNG for older browsers with [node-canvas](http://github.com/learnboost/node-canvas).

```stylus
body
  background linear-gradient(top, white, black)
```

```css
body {
  background: -webkit-linear-gradient(top, #fff, #000);
  background: -moz-linear-gradient(top, #fff, #000);
  background: -o-linear-gradient(top, #fff, #000);
  background: -ms-linear-gradient(top, #fff, #000);
  background: linear-gradient(to bottom, #fff, #000);
}
```

![](http://f.cl.ly/items/1q25061X2Q2U0p472L02/Screenshot.png)

Any number of color stops may be provided:

```stylus
body
  background linear-gradient(bottom left, white, red, blue, black)
```

![](http://f.cl.ly/items/2I0k3D0A2y0n3i443g2W/Screenshot.png)

Units may be placed before or after the color:

```stylus
body
  background linear-gradient(left, 80% red, #000)
  background linear-gradient(top, #eee, 90% white, 10% black)
```

![](http://f.cl.ly/items/2B1U3m0t2T1B420I3C3I/Screenshot.png)
![](http://f.cl.ly/items/1T1P1x0n1X3k132o3V0F/Screenshot.png)

## Position

The position mixins `absolute`, `fixed`, and `relative` provide a shorthand variant to what is otherwise three CSS properties. The syntax is as follows:

```
fixed|absolute|relative: top|bottom [n] left|right [n]
```

The following example will default to (0,0):

```stylus
#back-to-top
  fixed bottom right
```

```css
#back-to-top {
  position: fixed;
  bottom: 0;
  right: 0;
}
```

You may also specify the units:

```stylus
#back-to-top
  fixed bottom 10px right 5px
```

```css
#back-to-top {
  position: fixed;
  bottom: 10px;
  right: 5px;
}
```

## Clearfix
Clearfixing causes containers to expand to contain floated contents. A simple example is shown [here](http://learnlayout.com/clearfix.html).

The clearfix mixin takes no arguments and expands to a form that provides extremely robust browser support.

```stylus
.clearfix
  clearfix()
```

```css
.clearfix {
  zoom: 1;
}
.clearfix:before,
.clearfix:after {
  content: "";
  display: table;
}
.clearfix:after {
  clear: both;
}
```

## Border Radius
Nib's `border-radius` supports both the regular syntax as well as augmenting it to make the value more expressive.

```stylus
button
  border-radius 1px 2px / 3px 4px

  button
    border-radius 5px

  button
    border-radius bottom 10px
```

```css
button {
  border-radius: 1px 2px/3px 4px;
}
button {
  border-radius: 5px;
}
button {
  border-top-left-radius: 10px;
  border-bottom-right-radius: 10px;
}
```

## Responsive Images
The `image` mixin allows you to define a `background-image` for both the normal image, and a doubled image for devices with a higher pixel ratio such as retina displays. This works by using a @media query to serve an "@2x" version of the file.

```stylus
#logo
  image '/images/branding/logo.main.png'

#logo
  image '/images/branding/logo.main.png' 50px 100px
```

```css
#logo {
  background-image: url("/images/branding/logo.main.png");
}
@media all and (-webkit-min-device-pixel-ratio: 1.5) {
  #logo {
    background-image: url("/images/branding/logo.main@2x.png");
    background-size: auto auto;
  }
}
#logo {
  background-image: url("/images/branding/logo.main.png");
}
@media all and (-webkit-min-device-pixel-ratio: 1.5) {
  #logo {
    background-image: url("/images/branding/logo.main@2x.png");
    background-size: 50px 100px;
  }
}
```

## Ellipsis
The `overflow` property is augmented with a "ellipsis" value, expanding to what you see below.

```stylus
button
  overflow ellipsis
```

```css
button {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

## Reset
Nib comes bundled with [Eric Meyer's style reset](eric-meyer) and [Nicolas Gallagher's _Normalize_](normalize) support and, you can choose to apply the global or any specifics that you wish. To view the definitions view [`reset.styl`](https://github.com/tj/nib/blob/master/lib/nib/reset.styl).

[eric-meyer]: http://meyerweb.com/eric/tools/css/reset/
[normalize]: https://github.com/necolas/normalize.css

> CSS Reset

- `global-reset()`
- `nested-reset()`
- `reset-font()`
- `reset-box-model()`
- `reset-body()`
- `reset-table()`
- `reset-table-cell()`
- `reset-html5()`

> Normalize

- `normalize-html5()`
- `normalize-base()`
- `normalize-links()`
- `normalize-text()`
- `normalize-embed()`
- `normalize-groups()`
- `normalize-forms()`
- `normalize-tables()`
- `normalize-css()`

[Read more][normalize-about] about Normalize or see the original CSS [here][normalize-css].

[normalize-about]: http://nicolasgallagher.com/about-normalize-css/
[normalize-css]: https://github.com/necolas/normalize.css/blob/master/normalize.css

## Border
This shorthand lets you create a border by just specifying a color, with defaults for width and style.

```stylus
.foo
  border red
```

```css
.foo {
  border: 1px solid red;
}
```

## Shadow Stroke
Creates a text outline using text-shadow.

```stylus
.foo
  shadow-stroke(red)
```

```css
.foo {
  text-shadow: -1px -1px 0 red, 1px -1px 0 red, -1px 1px 0 red, 1px 1px 0 red;
}
```

## Size
This shorthand lets you set width and height in one go.

```stylus
.foo
  size 5em 10em
```

```css
.foo {
  width: 5em;
  height: 10em;
}
```

## Transparent Mixins
These mixins expand vendor prefixes but do not modify the behavior of the property.

For example:

```stylus
*
  box-sizing border-box
```

```css
* {
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
  box-sizing: border-box;
}
```

Here is the full list of properties for which Nib provides transparent mixins:

- box-shadow
- radial-gradient
- user-select
- column-count
- column-gap
- column-rule
- column-rule-color
- column-rule-width
- column-rule-style
- column-width
- background-size
- transform
- border-image
- transition
- transition-property
- transition-duration
- transition-timing-function
- transition-delay
- backface-visibility
- opacity
- box-sizing
- box-orient
- box-flex
- box-flex-group
- box-align
- box-pack
- box-direction
- animation
- animation-name
- animation-duration
- animation-delay
- animation-direction
- animation-iteration-count
- animation-timing-function
- animation-play-state
- animation-fill-mode
- hyphens
- appearance

# Aliases
These aliases are provided purely for convenience.

official    | aliases
----------- | ----------
nowrap      | no-wrap  
white-space | whitespace
