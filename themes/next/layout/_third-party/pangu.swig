{% if theme.pangu %}
  {% set pangu_uri = url_for(theme.vendors._internal + '/pangu/dist/pangu.min.js?v=3.3') %}
  {% if theme.vendors.pangu %}
    {% set pangu_uri = theme.vendors.pangu %}
  {% endif %}
  <script src="{{ pangu_uri }}"></script>
  <script>pangu.spacingPage();</script>
{% endif %}
