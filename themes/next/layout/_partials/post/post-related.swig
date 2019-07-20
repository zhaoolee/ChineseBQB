{% set popular_posts = popular_posts_json(theme.related_posts.params, post) %}
{% if popular_posts.json and popular_posts.json.length > 0 %}
  <div class="popular-posts-header">{{ theme.related_posts.title | default(__('post.related_posts')) }}</div>
  <ul class="popular-posts">
  {% for popular_post in popular_posts.json %}
    <li class="popular-posts-item">
      {% if popular_post.date and popular_post.date != '' %}
        <div class="popular-posts-date">{{ popular_post.date }}</div>
      {% endif %}
      {% if popular_post.img && popular_post.img != '' %}
        <div class="popular-posts-img"><img src="{{ popular_post.img }}"/></div>
      {% endif %}
      <div class="popular-posts-title"><a href="{{ popular_post.path }}" rel="bookmark">{{ popular_post.title }}</a></div>
      {% if popular_post.excerpt && popular_post.excerpt != '' %}
        <div class="popular-posts-excerpt"><p>{{ popular_post.excerpt }}</p></div>
      {% endif %}
    </li>
  {% endfor %}
  </ul>
{% endif %}
