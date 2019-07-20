{% if theme.vkontakte_api.enable %}
  <div id="vk_api_transport"></div>
  <script>
    window.vkAsyncInit = function() {
      VK.init({
        apiId: {{ theme.vkontakte_api.app_id }}
      });

      {% if not is_home() and (is_post() and theme.vkontakte_api.like) %}
        VK.Widgets.Like("vk_like", {type: "mini", height: 20});
      {% endif %}

      {% if page.comments and theme.vkontakte_api.comments %}
        VK.Widgets.Comments("vk_comments", {limit: {{ theme.vkontakte_api.num_of_posts }}, attach: "*"});
      {% endif %}
    };
    setTimeout(function() {
      var el = document.createElement("script");
      el.type = "text/javascript";
      el.src = "//vk.com/js/api/openapi.js";
      el.async = true;
      document.getElementById("vk_api_transport").appendChild(el);
    }, 0);
  </script>
{% endif %}
