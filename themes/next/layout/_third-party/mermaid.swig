{% if theme.mermaid.enable %}
<script>
if ($('body').find('pre.mermaid').length) {
  $.ajax({
    type: 'GET',
    url: '{{ theme.mermaid.cdn }}',
    dataType: 'script',
    cache: true,
    success: function() {
      mermaid.initialize({
        theme: '{{ theme.mermaid.theme }}',
        logLevel: 3,
        flowchart: { curve: 'linear' },
        gantt: { axisFormat: '%m/%d/%Y' },
        sequence: { actorMargin: 50 }
      });
    }
  });
}
</script>
{% endif %}
