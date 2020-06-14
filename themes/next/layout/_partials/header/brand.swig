<div class="site-brand-wrapper">
  <div class="site-meta{% if theme.custom_logo.enable %} custom-logo{% endif %}">
    {% if theme.custom_logo.enable and theme.custom_logo.image and theme.scheme === 'Muse' %}
      <div class="site-meta-headline">
        <a>
          <img class="custom-logo-image" src="{{ theme.custom_logo.image }}" alt="{{ title }}"/>
        </a>
      </div>
    {% endif %}

    <div class="custom-logo-site-title">
      <a href="{{ config.root }}" class="brand" rel="start">
        <span class="logo-line-before"><i></i></span>
        <span class="site-title">{{ title }}</span>
        <span class="logo-line-after"><i></i></span>
      </a>
    </div>
    {% if subtitle %}
      {% if theme.seo %}
        <h1 class="site-subtitle" itemprop="description">{{ subtitle }}</h1>
      {% else %}
        <p class="site-subtitle">{{ subtitle }}</p>
      {% endif %}
    {% endif %}
    {% if theme.custom_logo.enable and theme.custom_logo.image and (theme.scheme === 'Gemini' or theme.scheme === 'Pisces') %}
      <a>
        <img class="custom-logo-image" src="{{ theme.custom_logo.image }}" alt="{{ title }}"/>
      </a>
    {% endif %}
  </div>

  <div class="site-nav-toggle">
    <button aria-label="{{ __('accessibility.nav_toggle') }}">
      <span class="btn-bar"></span>
      <span class="btn-bar"></span>
      <span class="btn-bar"></span>
    </button>
  </div>
</div>
