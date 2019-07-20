{% if theme.disqus.enable %}
  {% include 'disqus.swig' %}
{% elif theme.changyan.enable and theme.changyan.appid and theme.changyan.appkey %}
  {% include 'changyan.swig' %}
{% elif theme.valine.enable and theme.valine.appid and theme.valine.appkey %}
  {% include 'valine.swig' %}
{% endif %}

{% if page.comments %}
  {% if theme.livere_uid %}
    {% include 'livere.swig' %}
  {% elif theme.gitment.enable and theme.gitment.client_id %}
    {% include 'gitment.swig' %}
  {% elif theme.gitalk.enable %}
    {% include 'gitalk.swig' %}
  {% elif theme.disqusjs.enable and theme.disqusjs.apikey and theme.disqusjs.shortname %}
    {% include 'disqusjs.swig' %}
  {% endif %}
{% endif %}
