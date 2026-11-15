<script lang="ts">
  import '../app.css';
  import '$lib/crew/medbay.css';
  import '$lib/crew/medbay-reference.css';
  import '$lib/crew/insight.css';
  import '$lib/crew/taste-workspace.css';
  import '$lib/crew/taste-surfaces.css';

  let { children } = $props();
</script>

<div class="medbay-shell">{@render children()}</div>
