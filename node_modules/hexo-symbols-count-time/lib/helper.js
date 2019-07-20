'use strict';

var getSymbols = function(post) {
  return post.length;
};

var getFormatTime = function(minutes, suffix) {
  var fHours = Math.floor(minutes / 60);
  var fMinutes = Math.floor(minutes - (fHours * 60));
  if (fMinutes < 1) { fMinutes = 1; } // 0 => 1
  if (!suffix) { suffix = 'mins.'; } // 1 => 1 mins.
  return fHours < 1
    ? fMinutes + ' ' + suffix // < 59 => 59 mins.
    : fHours + ':' + ('00' + fMinutes).slice(-2); // = 61 => 1:01
};

module.exports.symbolsCount = function(post) {
  var symbolsResult = getSymbols(post);
  if (symbolsResult > 9999) {
    symbolsResult = Math.round(symbolsResult / 1000) + 'k'; // > 9999 => 11k
  } else if (symbolsResult > 999) {
    symbolsResult = Math.round(symbolsResult / 100) / 10 + 'k'; // > 999 => 1.1k
  } // < 999 => 111
  return symbolsResult;
};

module.exports.symbolsTime = function(post, awl, wpm, suffix) {
  if (!awl) { awl = '4'; }
  if (!wpm) { wpm = '275'; }
  var minutes = Math.round(getSymbols(post) / (awl * wpm));
  return getFormatTime(minutes, suffix);
};

var getSymbolsTotal = function(site) {
  var symbolsResultCount = 0;
  site.posts.forEach(function(post) {
    symbolsResultCount += getSymbols(post);
  });
  return symbolsResultCount;
};

module.exports.symbolsCountTotal = function(site) {
  var symbolsResultTotal = getSymbolsTotal(site);
  return symbolsResultTotal < 1000000
    ? Math.round(symbolsResultTotal / 1000) + 'k' // < 999k => 111k
    : Math.round(symbolsResultTotal / 100000) / 10 + 'm'; // > 999k => 1.1m
};

module.exports.symbolsTimeTotal = function(site, awl, wpm, suffix) {
  if (!awl) { awl = '4'; }
  if (!wpm) { wpm = '275'; }
  var minutes = Math.round(getSymbolsTotal(site) / (awl * wpm));
  return getFormatTime(minutes, suffix);
};
