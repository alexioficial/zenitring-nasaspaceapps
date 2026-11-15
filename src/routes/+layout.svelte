<script lang="ts">
  import '../app.css';
  import '$lib/crew/medbay.css';
  import '$lib/crew/medbay-reference.css';
  import '$lib/crew/insight.css';

  let { children } = $props();
</script>

<div class="medbay-shell">{@render children()}</div>
