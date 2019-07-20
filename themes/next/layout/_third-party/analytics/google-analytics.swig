{% if theme.google_analytics.tracking_id %}
  <script async src="https://www.googletagmanager.com/gtag/js?id={{ theme.google_analytics.tracking_id }}"></script>
  <script>
    var host = window.location.hostname;
    if (host !== "localhost" || !{{theme.google_analytics.localhost_ignored}}) {
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '{{ theme.google_analytics.tracking_id }}');
    }
  </script>
{% endif %}
