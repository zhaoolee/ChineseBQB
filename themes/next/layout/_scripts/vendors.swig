{# Reset `window.Promise` when it was not a function. #}
{# IE refers the element whose id is `Promise` as `window.Promise`, this causes Velocity throwing an exception #}
<script>
  if (Object.prototype.toString.call(window.Promise) !== '[object Function]') {
    window.Promise = null;
  }
</script>

{% set js_vendors = {} %}
{% set js_vendors.jquery = 'jquery/index.js?v=2.1.3' %}

{% if theme.fastclick %}
  {% set js_vendors.fastclick = 'fastclick/lib/fastclick.min.js?v=1.0.6' %}
{% endif %}

{% if theme.lazyload %}
  {% set js_vendors.lazyload = 'jquery_lazyload/jquery.lazyload.js?v=1.9.7' %}
{% endif %}

{% set js_vendors.velocity = 'velocity/velocity.min.js?v=1.2.1' %}
{% set js_vendors.velocity_ui = 'velocity/velocity.ui.min.js?v=1.2.1' %}

{% if theme.fancybox %}
  {% set js_vendors.fancybox = 'fancybox/source/jquery.fancybox.pack.js' %}
{% endif %}

{% if theme.canvas_nest.enable %}
  {% if theme.canvas_nest.onmobile %}
    {% set canvas_nest_uri = url_for(theme.vendors._internal + '/canvas-nest/canvas-nest.min.js') %}
    {% if theme.vendors.canvas_nest %}
      {% set canvas_nest_uri = theme.vendors.canvas_nest %}
    {% endif %}
  {% else %}
    {% set canvas_nest_uri = url_for(theme.vendors._internal + '/canvas-nest/canvas-nest-nomobile.min.js') %}
    {% if theme.vendors.canvas_nest_nomobile %}
      {% set canvas_nest_uri = theme.vendors.canvas_nest_nomobile %}
    {% endif %}
  {% endif %}
  <script color='{{ theme.canvas_nest.color }}' opacity='{{ theme.canvas_nest.opacity }}' zIndex='{{ theme.canvas_nest.zIndex }}' count='{{ theme.canvas_nest.count }}' src="{{ canvas_nest_uri }}"></script>
{% endif %}

{% if theme.three_waves %}
  {% set js_vendors.three = 'three/three.min.js' %}
  {% set js_vendors.three_waves = 'three/three-waves.min.js' %}
{% endif %}

{% if theme.canvas_lines %}
  {% set js_vendors.three = 'three/three.min.js' %}
  {% set js_vendors.canvas_lines = 'three/canvas_lines.min.js' %}
{% endif %}

{% if theme.canvas_sphere %}
  {% set js_vendors.three = 'three/three.min.js' %}
  {% set js_vendors.canvas_sphere = 'three/canvas_sphere.min.js' %}
{% endif %}

{% if theme.canvas_ribbon.enable %}
  {% set canvas_ribbon_uri = url_for(theme.vendors._internal + '/canvas-ribbon/canvas-ribbon.js') %}
  {% if theme.vendors.canvas_ribbon %}
    {% set canvas_ribbon_uri = theme.vendors.canvas_ribbon %}
  {% endif %}
  <script id="ribbon" size="{{ theme.canvas_ribbon.size }}" alpha="{{ theme.canvas_ribbon.alpha }}" zIndex="{{theme.canvas_ribbon.zIndex }}" src="{{ canvas_ribbon_uri }}"></script>
{% endif %}

{% if theme.reading_progress.enable %}
  {% set js_vendors.reading_progress = 'reading_progress/reading_progress.js' %}
{% endif %}

{% for name, internal in js_vendors %}
  {% set internal_script = url_for(theme.vendors._internal + '/' + internal) %}
  <script src="{{ theme.vendors[name] | default(internal_script) }}"></script>
{% endfor %}
