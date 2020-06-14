{% if theme.tencent_mta %}
  <script>
    var _mtac = {};
    (function() {
      var mta = document.createElement("script");
      mta.src = "https://pingjs.qq.com/h5/stats.js";
      mta.setAttribute("name", "MTAH5");
      mta.setAttribute("sid", "{{theme.tencent_mta}}");
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(mta, s);
    })();
  </script>
{% endif %}
