{% if theme.rating.enable and (not is_home() and is_post()) %}
  <script>
    wpac_init = window.wpac_init || [];
    wpac_init.push({
      widget: 'Rating',
      id: {{ theme.rating.id }},
      el: 'wpac-rating',
      color: '{{ theme.rating.color }}'
    });
    (function() {
      if ('WIDGETPACK_LOADED' in window) return;
      WIDGETPACK_LOADED = true;
      var mc = document.createElement('script');
      mc.type = 'text/javascript';
      mc.async = true;
      mc.src = '//embed.widgetpack.com/widget.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(mc, s.nextSibling);
    })();
  </script>
{% endif %}
