{% set likely_js_url = '//cdn.jsdelivr.net/npm/ilyabirman-likely@2/release/likely.js' %}
{% if theme.vendors.likely_js %}
  {% set likely_js_url = theme.vendors.likely_js %}
{% endif %}
<script src="{{ likely_js_url }}"></script>

{% set likely_css_url = '//cdn.jsdelivr.net/npm/ilyabirman-likely@2/release/likely.css' %}
{% if theme.vendors.likely_css %}
  {% set likely_css_url = theme.vendors.likely_css %}
{% endif %}
<link rel="stylesheet" href="{{ likely_css_url }}">

{% if theme.likely.look == 'normal' %}
  {% set likely_look = 'likely' %}
{% else %}
  {% set likely_look = 'likely likely-' + theme.likely.look %}
{% endif %}

<div class="{{ likely_look }}">
	{% for x in theme.likely.networks %}
 	 	<div class="{{ loop.key }}">{{ x }}</div>
	{% endfor %}
</div>
