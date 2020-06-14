{% if theme.needmoreshare2.enable %}
  {% set needmoreshare2_js = url_for(theme.vendors._internal + '/needsharebutton/needsharebutton.js') %}
  {% if theme.vendors.needmoreshare2_js %}
    {% set needmoreshare2_js = theme.vendors.needmoreshare2_js %}
  {% endif %}
  <script src="{{ needmoreshare2_js }}"></script>
  <script>
    {% if theme.needmoreshare2.postbottom.enable %}
      pbOptions = {};
      {% for k,v in theme.needmoreshare2.postbottom.options %}
        pbOptions.{{ k }} = "{{ v }}";
      {% endfor %}
      new needShareButton('#needsharebutton-postbottom', pbOptions);
    {% endif %}
    {% if theme.needmoreshare2.float.enable %}
      flOptions = {};
      {% for k,v in theme.needmoreshare2.float.options %}
        flOptions.{{ k }} = "{{ v }}";
      {% endfor %}
      new needShareButton('#needsharebutton-float', flOptions);
    {% endif %}
  </script>
{% endif %}
