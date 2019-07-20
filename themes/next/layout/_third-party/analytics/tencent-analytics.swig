{% if theme.tencent_analytics %}
  <script>
    (function() {
      var hm = document.createElement("script");
      hm.src = "//tajs.qq.com/stats?sId={{ theme.tencent_analytics }}";
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(hm, s);
    })();
  </script>
{% endif %}
