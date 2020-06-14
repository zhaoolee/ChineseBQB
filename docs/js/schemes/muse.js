$(document).ready(function() {
  function updateFooterPosition() {
    var containerHeight = $('#footer').attr('position') ? $('.container').height() + $('#footer').outerHeight(true) : $('.container').height();
    if (containerHeight < window.innerHeight) $('#footer').css({ 'position': 'fixed', 'bottom': 0, 'left': 0, 'right': 0 }).attr('position', 'fixed');
    else $('#footer').removeAttr('style position');
  }
  updateFooterPosition();
  $(window).on('resize scroll', updateFooterPosition);
});
