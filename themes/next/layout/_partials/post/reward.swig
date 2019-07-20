<div id="reward-container">
  <div>{{ theme.reward_settings.comment }}</div>
  <button id="reward-button" disable="enable" onclick="var qr = document.getElementById(&quot;qr&quot;); qr.style.display = (qr.style.display === 'none') ? 'block' : 'none';">
    {{ __('reward.donate') }}
  </button>
  <div id="qr" style="display: none;">

    {% for name, image in theme.reward %}
      {% set builtin = ['wechatpay', 'alipay', 'bitcoin'] %}
      {% if builtin.indexOf(name) !== -1 %}
        {% set translation = __('reward.' + name) %}
      {% else %}
        {% set translation = name %}
      {% endif %}
      <div style="display: inline-block">
        <img src="{{ url_for(image) }}" alt="{{ author }} {{ translation }}"/>
        <p>{{ translation }}</p>
      </div>
    {% endfor %}

  </div>
</div>
