
/**
 * Module dependencies.
 */

var ejs = require('../')
  , fs = require('fs')
  , path = __dirname + '/functions.ejs'
  , str = fs.readFileSync(path, 'utf8');

var users = [];

users.push({ name: 'Tobi', age: 2, species: 'ferret' })
users.push({ name: 'Loki', age: 2, species: 'ferret' })
users.push({ name: 'Jane', age: 6, species: 'ferret' })

var ret = ejs.render(str, {
  users: users,
  filename: path
});

console.log(ret);