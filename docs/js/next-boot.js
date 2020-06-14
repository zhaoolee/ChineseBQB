/* global NexT, CONFIG */

$(document).ready(function() {

  $(document).trigger('bootstrap:before');

  /**
   * Register JS handlers by condition option.
   * Need to add config option in Front-End at 'layout/_partials/head.swig' file.
   */
  CONFIG.fastclick && NexT.utils.isMobile() && window.FastClick.attach(document.body);
  CONFIG.lazyload && NexT.utils.lazyLoadPostsImages();

  NexT.utils.registerESCKeyEvent();

  CONFIG.back2top && NexT.utils.registerBackToTop();

  // Mobile top menu bar.
  $('.site-nav-toggle button').on('click', function() {
    var $siteNav = $('.site-nav');
    var ON_CLASS_NAME = 'site-nav-on';
    var isSiteNavOn = $siteNav.hasClass(ON_CLASS_NAME);
    var animateAction = isSiteNavOn ? 'slideUp' : 'slideDown';
    var animateCallback = isSiteNavOn ? 'removeClass' : 'addClass';

    $siteNav.stop()[animateAction]('fast', function() {
      $siteNav[animateCallback](ON_CLASS_NAME);
    });
  });

  /**
   * Register JS handlers by condition option.
   * Need to add config option in Front-End at 'layout/_partials/head.swig' file.
   */
  CONFIG.fancybox && NexT.utils.wrapImageWithFancyBox();
  CONFIG.tabs && NexT.utils.registerTabsTag();

  NexT.utils.embeddedVideoTransformer();

  // Define Motion Sequence.
  NexT.motion.integrator
    .add(NexT.motion.middleWares.logo)
    .add(NexT.motion.middleWares.menu)
    .add(NexT.motion.middleWares.postList)
    .add(NexT.motion.middleWares.sidebar);

  $(document).trigger('motion:before');

  // Bootstrap Motion.
  CONFIG.motion.enable && NexT.motion.integrator.bootstrap();

  $(document).trigger('bootstrap:after');
});
