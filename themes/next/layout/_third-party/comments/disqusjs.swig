{% set disqusjs_css_url = '//cdn.jsdelivr.net/npm/disqusjs@1/dist/disqusjs.css' %}
{% if theme.vendors.disqusjs_css %}
  {% set disqusjs_css_url = theme.vendors.disqusjs_css %}
{% endif %}
<link rel="stylesheet" href="{{ disqusjs_css_url }}"/>

{% set disqusjs_js_url = '//cdn.jsdelivr.net/npm/disqusjs@1/dist/disqus.js' %}
{% if theme.vendors.disqusjs_js %}
  {% set disqusjs_js_url = theme.vendors.disqusjs_js %}
{% endif %}
<script src="{{ disqusjs_js_url }}"></script>

<script>
  var dsqjs = new DisqusJS({
    api: '{{ theme.disqusjs.api }}' || 'https://disqus.com/api/',
    apikey: '{{ theme.disqusjs.apikey }}',
    shortname: '{{ theme.disqusjs.shortname }}'
  });
</script>
