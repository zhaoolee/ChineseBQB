{% if theme.save_scroll %}
  <script src="{{ url_for(theme.js) }}/js.cookie.js?v={{ version }}"></script>
  <script src="{{ url_for(theme.js) }}/scroll-cookie.js?v={{ version }}"></script>
{% endif %}
