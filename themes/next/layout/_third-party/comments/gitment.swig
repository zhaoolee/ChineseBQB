<!-- LOCAL: You can save these files to your site and update links -->
{% if theme.gitment.mint %}
  {% set CommentsClass = 'Gitmint' %}
  <script src="https://cdn.jsdelivr.net/gh/theme-next/theme-next-gitment@1/gitmint.browser.js"></script>
{% else %}
  {% set CommentsClass = 'Gitment' %}
  <script src="https://cdn.jsdelivr.net/gh/theme-next/theme-next-gitment@1/gitment.browser.js"></script>
{% endif %}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/theme-next/theme-next-gitment@1/default.css"/>
<!-- END LOCAL -->

<script>
  function renderGitment() {
    var gitment = new {{ CommentsClass }}({
      id: window.location.pathname,
      owner: '{{ theme.gitment.github_user }}',
      repo: '{{ theme.gitment.github_repo }}',
      {% if theme.gitment.mint %}
        lang: '{{ theme.gitment.language }}' || navigator.language || navigator.systemLanguage || navigator.userLanguage,
      {% endif %}
      oauth: {
      {% if theme.gitment.mint and theme.gitment.redirect_protocol %}
        redirect_protocol: '{{ theme.gitment.redirect_protocol }}',
      {% endif %}
      {% if theme.gitment.mint and theme.gitment.proxy_gateway %}
        proxy_gateway: '{{ theme.gitment.proxy_gateway }}',
      {% else %}
        client_secret: '{{ theme.gitment.client_secret }}',
      {% endif %}
        client_id: '{{ theme.gitment.client_id }}'
      }
    });
    gitment.render('gitment-container');
  }

  {% if not theme.gitment.lazy %}
    renderGitment();
  {% else %}
    function showGitment() {
      document.getElementById('gitment-display-button').style.display = 'none';
      document.getElementById('gitment-container').style.display = 'block';
      renderGitment();
    }
  {% endif %}
</script>
