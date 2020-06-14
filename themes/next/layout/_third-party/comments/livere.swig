<script>
  window.livereOptions = {
    refer: '{{ page.path }}'
  };
  (function(d, s) {
    var j, e = d.getElementsByTagName(s)[0];
    if (typeof LivereTower === 'function') { return; }
    j = d.createElement(s);
    j.src = 'https://cdn-city.livere.com/js/embed.dist.js';
    j.async = true;
    e.parentNode.insertBefore(j, e);
  })(document, 'script');
</script>
