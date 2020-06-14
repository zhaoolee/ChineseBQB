{% if theme.leancloud_visitors.enable and !theme.valine.visitor %}
  {# custom analytics part create by xiamo; edited by LEAFERx #}
  <script>
    {% if page.layout === 'post' %}
    function addCount(Counter) {
      var $visitors = $('.leancloud_visitors');
      var url = $visitors.attr('id').trim();
      var title = $visitors.attr('data-flag-title').trim();

      Counter('get', '/classes/Counter', { where: JSON.stringify({ url }) })
        .done(function({ results }) {
          if (results.length > 0) {
            var counter = results[0];
            {% if theme.leancloud_visitors.betterPerformance %}
              var $element = $(document.getElementById(url));
              $element.find('.leancloud-visitors-count').text(counter.time + 1);
            {% endif %}
            Counter('put', '/classes/Counter/' + counter.objectId, JSON.stringify({ time: { '__op': 'Increment', 'amount': 1 } }))
            {% if not theme.leancloud_visitors.betterPerformance %}
              .done(function() {
                var $element = $(document.getElementById(url));
                $element.find('.leancloud-visitors-count').text(counter.time + 1);
              })
            {% endif %}
              .fail(function ({ responseJSON }) {
                console.log('Failed to save Visitor num, with error message: ' + responseJSON.error);
              })
          } else {
            {% if theme.leancloud_visitors.security %}
              var $element = $(document.getElementById(url));
              $element.find('.leancloud-visitors-count').text('Counter not initialized! More info at console err msg.');
              console.error('ATTENTION! LeanCloud counter has security bug, see how to solve it here: https://github.com/theme-next/hexo-leancloud-counter-security. \n However, you can still use LeanCloud without security, by setting `security` option to `false`.');
            {% else %}
              Counter('post', '/classes/Counter', JSON.stringify({ title: title, url: url, time: 1 }))
                .done(function() {
                  var $element = $(document.getElementById(url));
                  $element.find('.leancloud-visitors-count').text(1);
                })
                .fail(function() {
                  console.log('Failed to create');
                });
            {% endif %}
          }
        })
        .fail(function ({ responseJSON }) {
          console.log('LeanCloud Counter Error: ' + responseJSON.code + ' ' + responseJSON.error);
        });
    }
    {% else %}
    function showTime(Counter) {
      var entries = [];
      var $visitors = $('.leancloud_visitors');

      $visitors.each(function() {
        entries.push( $(this).attr('id').trim() );
      });

      Counter('get', '/classes/Counter', { where: JSON.stringify({ url: { '$in': entries } }) })
        .done(function({ results }) {
          var COUNT_CONTAINER_REF = '.leancloud-visitors-count';

          if (results.length === 0) {
            $visitors.find(COUNT_CONTAINER_REF).text(0);
            return;
          }

          for (var i = 0; i < results.length; i++) {
            var item = results[i];
            var url = item.url;
            var time = item.time;
            var element = document.getElementById(url);

            $(element).find(COUNT_CONTAINER_REF).text(time);
          }
          for (var i = 0; i < entries.length; i++) {
            var url = entries[i];
            var element = document.getElementById(url);
            var countSpan = $(element).find(COUNT_CONTAINER_REF);
            if (countSpan.text() == '') {
              countSpan.text(0);
            }
          }
        })
        .fail(function ({ responseJSON }) {
          console.log('LeanCloud Counter Error: ' + responseJSON.code + ' ' + responseJSON.error);
        });
    }
    {% endif %}

    $(function() {
      $.get('https://app-router.leancloud.cn/2/route?appId=' + '{{ theme.leancloud_visitors.app_id }}')
        .done(function({ api_server }) {
          var Counter = function(method, url, data) {
            return $.ajax({
              method: method,
              url: 'https://' + api_server + '/1.1' + url,
              headers: {
                'X-LC-Id': '{{ theme.leancloud_visitors.app_id }}',
                'X-LC-Key': '{{ theme.leancloud_visitors.app_key }}',
                'Content-Type': 'application/json',
              },
              data: data
            });
          };
          {% if page.layout === 'post' %}
            addCount(Counter);
          {% else %}
            if ($('.post-title-link').length >= 1) {
              showTime(Counter);
            }
          {% endif %}
        });
    });
  </script>

{% endif %}
