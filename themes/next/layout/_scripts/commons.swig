{%
  set js_commons = [
    'utils.js',
    'motion.js'
  ]
%}

{% for common in js_commons %}
  <script src="{{ url_for(theme.js) }}/{{ common }}?v={{ version }}"></script>
{% endfor %}
