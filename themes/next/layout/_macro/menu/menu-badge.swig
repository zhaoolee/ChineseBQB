{% macro render(name) %}

  {% set badges = {
    archives: site.posts.length,
    categories: site.categories.length,
    tags: site.tags.length }
  %}
  {% for menu, count in badges %}
    {% if name == menu %}
      <span class="badge">{{ count }}</span>
    {% endif %}
  {% endfor %}

{% endmacro %}
