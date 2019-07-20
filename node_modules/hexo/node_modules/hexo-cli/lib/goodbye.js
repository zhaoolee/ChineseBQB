'use strict';

const byeWords = [
  'Good bye',
  'See you again',
  'Farewell',
  'Have a nice day',
  'Bye!',
  'Catch you later'
];

module.exports = () => byeWords[(Math.random() * byeWords.length) | 0];
