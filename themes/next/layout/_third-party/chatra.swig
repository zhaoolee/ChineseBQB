{% if theme.chatra.enable %}
	{% if theme.chatra.embed %}
	<script>
		window.ChatraSetup = {
				mode: 'frame',
				injectTo: '{{ theme.chatra.embed }}'
		};
	</script>
	{% endif %}
	<script>
		(function(d, w, c) {
			w.ChatraID = '{{ theme.chatra.id }}';
			var s = d.createElement('script');
			w[c] = w[c] || function() {
				(w[c].q = w[c].q || []).push(arguments);
			};
			s.async = {{ theme.chatra.async }};
			s.src = 'https://call.chatra.io/chatra.js';
			if (d.head) d.head.appendChild(s);
		})(document, window, 'Chatra');
	</script>
{% endif %}
