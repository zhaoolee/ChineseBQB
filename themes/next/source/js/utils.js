/* global NexT, CONFIG */

NexT.utils = NexT.$u = {

  /**
   * Wrap images with fancybox support.
   */
  wrapImageWithFancyBox: function() {
    $('.content img')
      .not(':hidden')
      .each(function() {
        var $image = $(this);
        var imageTitle = $image.attr('title') || $image.attr('alt');
        var $imageWrapLink = $image.parent('a');

        if ($imageWrapLink.length < 1) {
          var imageLink = $image.attr('data-original') || $image.attr('src');
          $imageWrapLink = $image.wrap('<a class="fancybox fancybox.image" href="' + imageLink + '" itemscope itemtype="http://schema.org/ImageObject" itemprop="url"></a>').parent('a');
          if ($image.is('.post-gallery img')) {
            $imageWrapLink.addClass('post-gallery-img');
            $imageWrapLink.attr('data-fancybox', 'gallery').attr('rel', 'gallery');
          }
          else if ($image.is('.group-picture img')) {
            $imageWrapLink.attr('data-fancybox', 'group').attr('rel', 'group');
          }
          else {
            $imageWrapLink.attr('data-fancybox', 'default').attr('rel', 'default');
          }
        }

        if (imageTitle) {
          $imageWrapLink.append('<p class="image-caption">' + imageTitle + '</p>');
          // Make sure img title tag will show correctly in fancybox
          $imageWrapLink.attr('title', imageTitle).attr('data-caption', imageTitle);
        }
      });

    $('.fancybox').fancybox({
      loop: true,
      helpers: {
        overlay: {
          locked: false
        }
      }
    });
  },

  lazyLoadPostsImages: function() {
    $('#posts').find('img').lazyload({
      //placeholder: '/images/loading.gif',
      effect   : 'fadeIn',
      threshold: 0
    });
  },

  /**
   * Tabs tag listener (without twitter bootstrap).
   */
  registerTabsTag: function() {
    var tNav = '.tabs ul.nav-tabs ';

    // Binding `nav-tabs` & `tab-content` by real time permalink changing.
    $(function() {
      $(window).bind('hashchange', function() {
        var tHash = location.hash;
        if (tHash !== '' && !tHash.match(/%\S{2}/)) {
          $(tNav + 'li:has(a[href="' + tHash + '"])').addClass('active').siblings().removeClass('active');
          $(tHash).addClass('active').siblings().removeClass('active');
        }
      }).trigger('hashchange');
    });

    $(tNav + '.tab').on('click', function(href) {
      href.preventDefault();
      // Prevent selected tab to select again.
      if (!$(this).hasClass('active')) {

        // Add & Remove active class on `nav-tabs` & `tab-content`.
        $(this).addClass('active').siblings().removeClass('active');
        var tActive = $(this).find('a').attr('href');
        $(tActive).addClass('active').siblings().removeClass('active');

        // Clear location hash in browser if #permalink exists.
        if (location.hash !== '') {
          history.pushState('', document.title, window.location.pathname + window.location.search);
        }
      }
    });
  },

  registerESCKeyEvent: function() {
    $(document).on('keyup', function(event) {
      var shouldDismissSearchPopup = event.which === 27
          && $('.search-popup').is(':visible');
      if (shouldDismissSearchPopup) {
        $('.search-popup').hide();
        $('.search-popup-overlay').remove();
        $('body').css('overflow', '');
      }
    });
  },

  registerBackToTop: function() {
    var THRESHOLD = 50;
    var $top = $('.back-to-top');

    function initBackToTop() {
      $top.toggleClass('back-to-top-on', window.pageYOffset > THRESHOLD);

      var scrollTop = $(window).scrollTop();
      var contentVisibilityHeight = NexT.utils.getContentVisibilityHeight();
      var scrollPercent = scrollTop / contentVisibilityHeight;
      var scrollPercentRounded = Math.round(scrollPercent * 100);
      var scrollPercentMaxed = scrollPercentRounded > 100 ? 100 : scrollPercentRounded;
      $('#scrollpercent>span').html(scrollPercentMaxed);
    }

    // For init back to top in sidebar if page was scrolled after page refresh.
    $(window).on('load', function() {
      initBackToTop();
    });

    $(window).on('scroll', function() {
      initBackToTop();
    });

    $top.on('click', function() {
      $.isFunction($('html').velocity) ? $('body').velocity('scroll') : $('html, body').animate({ scrollTop: 0 });
    });
  },

  /**
   * Transform embedded video to support responsive layout.
   * @see http://toddmotto.com/fluid-and-responsive-youtube-and-vimeo-videos-with-fluidvids-js/
   */
  embeddedVideoTransformer: function() {
    var $iframes = $('iframe');

    // Supported Players. Extend this if you need more players.
    var SUPPORTED_PLAYERS = [
      'www.youtube.com',
      'player.vimeo.com',
      'player.youku.com',
      'music.163.com',
      'www.tudou.com'
    ];
    var pattern = new RegExp(SUPPORTED_PLAYERS.join('|'));

    function getDimension($element) {
      return {
        width : $element.width(),
        height: $element.height()
      };
    }

    function getAspectRadio(width, height) {
      return height / width * 100;
    }

    $iframes.each(function() {
      var iframe = this;
      var $iframe = $(this);
      var oldDimension = getDimension($iframe);
      var newDimension;

      if (this.src.search(pattern) > 0) {

        // Calculate the video ratio based on the iframe's w/h dimensions
        var videoRatio = getAspectRadio(oldDimension.width, oldDimension.height);

        // Replace the iframe's dimensions and position the iframe absolute
        // This is the trick to emulate the video ratio
        $iframe.width('100%').height('100%')
          .css({
            position: 'absolute',
            top     : '0',
            left    : '0'
          });

        // Wrap the iframe in a new <div> which uses a dynamically fetched padding-top property
        // based on the video's w/h dimensions
        var wrap = document.createElement('div');
        wrap.className = 'fluid-vids';
        wrap.style.position = 'relative';
        wrap.style.marginBottom = '20px';
        wrap.style.width = '100%';
        wrap.style.paddingTop = videoRatio + '%';
        // Fix for appear inside tabs tag.
        (wrap.style.paddingTop === '') && (wrap.style.paddingTop = '50%');

        // Add the iframe inside our newly created <div>
        var iframeParent = iframe.parentNode;
        iframeParent.insertBefore(wrap, iframe);
        wrap.appendChild(iframe);

        // Additional adjustments for 163 Music
        if (this.src.search('music.163.com') > 0) {
          newDimension = getDimension($iframe);
          var shouldRecalculateAspect = newDimension.width > oldDimension.width
                                     || newDimension.height < oldDimension.height;

          // 163 Music Player has a fixed height, so we need to reset the aspect radio
          if (shouldRecalculateAspect) {
            wrap.style.paddingTop = getAspectRadio(newDimension.width, oldDimension.height) + '%';
          }
        }
      }
    });

  },

  hasMobileUA: function() {
    var nav = window.navigator;
    var ua = nav.userAgent;
    var pa = /iPad|iPhone|Android|Opera Mini|BlackBerry|webOS|UCWEB|Blazer|PSP|IEMobile|Symbian/g;

    return pa.test(ua);
  },

  isTablet: function() {
    return window.screen.width < 992 && window.screen.width > 767 && this.hasMobileUA();
  },

  isMobile: function() {
    return window.screen.width < 767 && this.hasMobileUA();
  },

  isDesktop: function() {
    return !this.isTablet() && !this.isMobile();
  },

  /**
   * Escape meta symbols in jQuery selectors.
   *
   * @param selector
   * @returns {string|void|XML|*}
   */
  escapeSelector: function(selector) {
    return selector.replace(/[!"$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
  },

  displaySidebar: function() {
    if (!this.isDesktop() || this.isPisces() || this.isGemini()) {
      return;
    }
    $('.sidebar-toggle').trigger('click');
  },

  isMuse: function() {
    return CONFIG.scheme === 'Muse';
  },

  isMist: function() {
    return CONFIG.scheme === 'Mist';
  },

  isPisces: function() {
    return CONFIG.scheme === 'Pisces';
  },

  isGemini: function() {
    return CONFIG.scheme === 'Gemini';
  },

  getScrollbarWidth: function() {
    var $div = $('<div />').addClass('scrollbar-measure').prependTo('body');
    var div = $div[0];
    var scrollbarWidth = div.offsetWidth - div.clientWidth;
    $div.remove();

    return scrollbarWidth;
  },

  getContentVisibilityHeight: function() {
    var docHeight = $('.container').height();
    var winHeight = $(window).height();
    var contentVisibilityHeight = docHeight > winHeight ? docHeight - winHeight : $(document).height() - winHeight;
    return contentVisibilityHeight;
  },

  getSidebarb2tHeight: function() {
    var sidebarb2tHeight = (CONFIG.back2top && CONFIG.back2top_sidebar) ? $('.back-to-top').height() : 0;
    return sidebarb2tHeight;
  },

  getSidebarSchemePadding: function() {
    var sidebarNavHeight = $('.sidebar-nav').css('display') === 'block' ? $('.sidebar-nav').outerHeight(true) : 0;
    var sidebarInner = $('.sidebar-inner');
    var sidebarPadding = sidebarInner.innerWidth() - sidebarInner.width();
    var sidebarOffset = CONFIG.sidebar.offset ? CONFIG.sidebar.offset : 12;
    var sidebarSchemePadding = this.isPisces() || this.isGemini()
      ? (sidebarPadding * 2) + sidebarNavHeight + sidebarOffset + this.getSidebarb2tHeight()
      : (sidebarPadding * 2) + (sidebarNavHeight / 2);
    return sidebarSchemePadding;
  }
};

$(document).ready(function() {

  function wrapTable() {
    $('table').not('.gist table').wrap('<div class="table-container"></div>');
  }

  /**
   * Init Sidebar & TOC inner dimensions on all pages and for all schemes.
   * Need for Sidebar/TOC inner scrolling if content taller then viewport.
   */
  function updateSidebarHeight(height) {
    height = height || 'auto';
    $('.site-overview, .post-toc').css('max-height', height);
  }

  function initSidebarDimension() {
    var updateSidebarHeightTimer;

    $(window).on('resize', function() {
      updateSidebarHeightTimer && clearTimeout(updateSidebarHeightTimer);

      updateSidebarHeightTimer = setTimeout(function() {
        var sidebarWrapperHeight = document.body.clientHeight - NexT.utils.getSidebarSchemePadding();

        updateSidebarHeight(sidebarWrapperHeight);
      }, 0);
    });

    // Initialize Sidebar & TOC Width.
    var scrollbarWidth = NexT.utils.getScrollbarWidth();
    if ($('.site-overview-wrap').height() > (document.body.clientHeight - NexT.utils.getSidebarSchemePadding())) {
      $('.site-overview').css('width', 'calc(100% + ' + scrollbarWidth + 'px)');
    }
    if ($('.post-toc-wrap').height() > (document.body.clientHeight - NexT.utils.getSidebarSchemePadding())) {
      $('.post-toc').css('width', 'calc(100% + ' + scrollbarWidth + 'px)');
    }

    // Initialize Sidebar & TOC Height.
    updateSidebarHeight(document.body.clientHeight - NexT.utils.getSidebarSchemePadding());
  }
  initSidebarDimension();
  wrapTable();
});
