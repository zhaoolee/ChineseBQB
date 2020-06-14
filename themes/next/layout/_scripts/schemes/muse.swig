{%
  set scripts = [
    'schemes/muse.js'
  ]
%}

{% for script in scripts %}
  <script src="{{ url_for(theme.js) }}/{{ script }}?v={{ version }}"></script>
{% endfor %}
