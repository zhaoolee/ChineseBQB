define([
  'intern!object',
  'intern/chai!assert',
  'intern/order!source/js/helpers.js'
], function (registerSuite, assert) {
  registerSuite({
    name: 'helpers',

    beforeEach: function () {
      window = {
        navigator: {
          userAgent: ''
        }
      };
      screen = {
        width: 0
      };

      minic = {
        desktop: function (screenWidth) {
          window.navigator.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36';
          screen.width = screenWidth || 992;
        },
        tablet: function (screenWidth) {
          window.navigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 4_3_5 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8L1 Safari/6533.18.5';
          screen.width = screenWidth || 750;
        },
        mobile: function (screenWidth) {
          window.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4';
          screen.width = screenWidth || 767;
        }
      };
    },

    '#hasMobileUA': {
      'should be true': function () {
        minic.mobile();
        assert.isTrue( hasMobileUA() );
        minic.tablet();
        assert.isTrue( hasMobileUA() );
      },

      'should be false': function () {
        minic.desktop();
        assert.isFalse( hasMobileUA() );
      }
    },


    '#isDesktop': {
      'should be true': function () {
        minic.desktop(992);
        assert.isTrue( isDesktop() );

        minic.desktop(1200);
        assert.isTrue( isDesktop() );
      },
      'should be false': function () {
        minic.mobile();
        assert.isFalse( isDesktop() );

        minic.tablet(992);
        assert.isFalse( isDesktop() );
      }
    },

    '#isTablet': {
      'should be true': function () {
        minic.tablet(900);
        assert.isTrue( isTablet() );

        minic.tablet(780);
        assert.isTrue( isTablet() );
      },
      'should be false': function () {
        minic.desktop(500);
        assert.isFalse( isTablet() );

        minic.tablet(1000);
        assert.isFalse( isTablet() );

        minic.tablet(500);
        assert.isFalse( isTablet() );
      }
    },

    '#isMobile': {
      'should be true': function () {
        minic.mobile();
        assert.isTrue( isMobile() );

        minic.mobile(700);
        assert.isTrue( isMobile() );
      },
      'should be false': function () {
        minic.desktop();
        assert.isFalse( isMobile() );

        minic.tablet();
        assert.isFalse( isMobile() );

        minic.mobile(1000);
        assert.isFalse( isMobile() );
      }
    },

    '#escapeSelector': function () {
      var selectors = ['(something', '.something', '$something'];
      selectors.forEach(function (s) {
        assert.equal( escapeSelector(s), '\\' + s );
      });
    },

    '#displaySidebar': function () {},

    '#isMist': {
      beforeEach: function () {
        CONFIG = {
          scheme: ''
        };
      },
      'should be true': function () {
        CONFIG.scheme = 'Mist';
        assert.isTrue( isMist() );
      },
      'should be false': function () {
        CONFIG.scheme = 'Minimal';
        assert.isFalse( isMist() );
      }
    }

  });
});
