<header class="post-header">

<{% if theme.seo %}h2{% else %}h1{% endif %} class="post-title" itemprop="name headline">
  {{- page.title -}}
  {% include '../post-edit.swig' %}
</{% if theme.seo %}h2{% else %}h1{% endif %}>

<div class="post-meta">
  {% if page.description %}
    <div class="post-description">{{ page.description }}</div>
  {% endif %}
  {% include 'breadcrumb.swig' %}
</div>

</header>
