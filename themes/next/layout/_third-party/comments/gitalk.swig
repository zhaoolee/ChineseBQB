{% set gitalk_js_url = '//cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.min.js' %}
{% if theme.vendors.gitalk_js %}
  {% set gitalk_js_url = theme.vendors.gitalk_js %}
{% endif %}
<script src="{{ gitalk_js_url }}"></script>

{% set gitalk_css_url = '//cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.min.css' %}
{% if theme.vendors.gitalk_css %}
  {% set gitalk_css_url = theme.vendors.gitalk_css %}
{% endif %}
<link rel="stylesheet" href="{{ gitalk_css_url }}"/>

{% set md5_url = '//cdn.jsdelivr.net/npm/js-md5@0.7.3/src/md5.min.js' %}
{% if theme.vendors.md5 %}
  {% set md5_url = theme.vendors.md5 %}
{% endif %}
<script src="{{ md5_url }}"></script>

<script>
  var gitalk = new Gitalk({
    clientID: '{{ theme.gitalk.client_id }}',
    clientSecret: '{{ theme.gitalk.client_secret }}',
    repo: '{{ theme.gitalk.repo }}',
    owner: '{{ theme.gitalk.github_id }}',
    admin: ['{{ theme.gitalk.admin_user }}'],
    id: md5(location.pathname),
    {% if theme.gitalk.language == '' %}
      language: window.navigator.language || window.navigator.userLanguage,
    {% else %}
      language: '{{ theme.gitalk.language }}',
    {% endif %}
    distractionFreeMode: '{{ theme.gitalk.distraction_free_mode }}'
  });
  gitalk.render('gitalk-container');
</script>
