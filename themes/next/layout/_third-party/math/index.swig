{% if theme.math.enable %}
  {% set is_index_has_math = false %}

  {# At home, check if there has `mathjax: true` post #}
  {% if is_home() %}
    {% for post in page.posts %}
      {% if post.mathjax and not is_index_has_math %}
        {% set is_index_has_math = true %}
      {% endif %}
    {% endfor %}
  {% endif %}

  {% if not theme.math.per_page or (is_index_has_math or page.mathjax) %}
    {% if theme.math.engine == 'mathjax' %}
      {% include 'mathjax.swig' %}
    {% elif theme.math.engine == 'katex' %}
      {% include 'katex.swig' %}
    {% endif %}
  {% endif %}
{% endif %}
