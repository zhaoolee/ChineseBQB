{% if theme.codeblock.copy_button.enable %}
<script>
  $('.highlight').not('.gist .highlight').each(function(i, e) {
    var $wrap = $('<div>').addClass('highlight-wrap');
    $(e).after($wrap);
    $wrap.append($('<button>').addClass('copy-btn').append('{{__("post.copy_button")}}').on('click', function(e) {
      var code = $(this).parent().find('.code').find('.line').map(function(i, e) {
        return $(e).text();
      }).toArray().join('\n');
      var ta = document.createElement('textarea');
      var yPosition = window.pageYOffset || document.documentElement.scrollTop;
      ta.style.top = yPosition + 'px'; // Prevent page scroll
      ta.style.position = 'absolute';
      ta.style.opacity = '0';
      ta.readOnly = true;
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, code.length);
      ta.readOnly = false;
      var result = document.execCommand('copy');
      {% if theme.codeblock.copy_button.show_result %}
        if (result) $(this).text('{{__("post.copy_success")}}');
        else $(this).text('{{__("post.copy_failure")}}');
      {% endif %}
      ta.blur(); // For iOS
      $(this).blur();
    })).on('mouseleave', function(e) {
      var $b = $(this).find('.copy-btn');
      setTimeout(function() {
        $b.text('{{__("post.copy_button")}}');
      }, 300);
    }).append(e);
  })
</script>
{% endif %}
