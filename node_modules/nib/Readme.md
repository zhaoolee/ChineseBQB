[![Build Status](https://travis-ci.org/tj/nib.png?branch=master)](https://travis-ci.org/tj/nib)

# Nib

  Stylus mixins, utilities, components, and gradient image generation. Don't forget to check out the [documentation](http://tj.github.io/nib/).

## Installation

```bash
$ npm install nib
```

 If the image generation features of Nib are desired, such as generating the linear gradient images, install [node-canvas](http://github.com/learnboost/node-canvas):

```bash
$ npm install canvas
```

## JavaScript API

 Below is an example of how to utilize nib and stylus with the connect framework (or express).

```javascript
var connect = require('connect')
  , stylus = require('stylus')
  , nib = require('nib');

var server = connect();

function compile(str, path) {
  return stylus(str)
	.set('filename', path)
	.set('compress', true)
	.use(nib());
}

server.use(stylus.middleware({
	src: __dirname
  , compile: compile
}));
```

## Stylus API

  To gain access to everything nib has to offer, simply add:

  ```css
  @import 'nib'
  ```

  Or you may also pick and choose based on the directory structure in `./lib`, for example:

  ```css
  @import 'nib/gradients'
  @import 'nib/overflow'
  @import 'nib/normalize'
  ```

_To be continued..._

## More Information

  - Introduction [screencast](http://www.screenr.com/M6a)

## Testing

 You will first need to install the dependencies:

 ```bash
    $ npm install -d
 ```

 Run the automated test cases:

 ```bash
    $ npm test
 ```

 For visual testing run the test server:

 ```bash
    $ npm run-script test-server
 ```

 Then visit `localhost:3000` in your browser.

## Contributors

I would love more contributors. And if you have helped out, you are awesome! I want to give a huge thanks to these people:

  - [TJ Holowaychuk](https://github.com/tj) (Original Creator)
  - [Sean Lang](https://github.com/slang800) (Current Maintainer)
  - [Isaac Johnston](https://github.com/superstructor)
  - [Everyone Else](https://github.com/tj/nib/contributors)
