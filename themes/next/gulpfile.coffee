fs = require('fs')
path = require('path')
gulp = require('gulp')
jshint = require('gulp-jshint')
stylish = require('jshint-stylish')
shell   = require('gulp-shell')
yaml = require('js-yaml')

gulp.task 'lint', ->
  return gulp.src([
    './source/js/utils.js',
    './source/js/motion.js',
    './source/js/algolia-search.js',
    './source/js/bootstrap.js',
    './source/js/post-details.js',
    './source/js/schemes/pisces.js'
  ]).pipe jshint()
    .pipe jshint.reporter(stylish)

gulp.task 'lint:stylus', shell.task [
  '"./node_modules/.bin/stylint" ./source/css/'
]

gulp.task 'validate:config', (cb) ->
  themeConfig = fs.readFileSync path.join(__dirname, '_config.yml')

  try
    yaml.safeLoad(themeConfig)
    cb()
  catch error
    cb new Error(error)

gulp.task 'validate:languages', (cb) ->
  languagesPath = path.join __dirname, 'languages'
  languages = fs.readdirSync languagesPath
  errors = []

  for lang in languages
    languagePath = path.join languagesPath, lang
    try
      yaml.safeLoad fs.readFileSync(languagePath), {
        filename: path.relative(__dirname, languagePath)
      }
    catch error
      errors.push error

  if errors.length == 0
    cb()
  else
    cb(errors)


gulp.task 'default', ['lint', 'validate:config', 'validate:languages']
