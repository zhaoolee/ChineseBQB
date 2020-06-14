{% if theme.baidu_push %}
  <script>
    (function(){
      var bp = document.createElement('script');
      var curProtocol = window.location.protocol.split(':')[0];
      bp.src = (curProtocol === 'https') ? 'https://zz.bdstatic.com/linksubmit/push.js' : 'http://push.zhanzhang.baidu.com/push.js';
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(bp, s);
    })();
  </script>
{% endif %}
