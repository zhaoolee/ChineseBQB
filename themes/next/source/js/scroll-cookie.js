$(document).ready(function() {

  /* global Cookies */

  // Set relative link path (without domain)
  var rpath = window.location.href.replace(window.location.origin, '');

  // Write position in cookie
  var timeout;
  $(window).on('scroll', function() {
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      Cookies.set('scroll-cookie', $(window).scrollTop() + '|' + rpath, { expires: 365, path: '' });
    }, 250);
  });

  // Read position from cookie
  if (Cookies.get('scroll-cookie') !== undefined) {
    var cvalues = Cookies.get('scroll-cookie').split('|');
    if (cvalues[1] === rpath) {
      $(window).scrollTop(cvalues[0]);
    }
  }

});
