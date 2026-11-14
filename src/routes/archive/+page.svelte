<script lang="ts">
  import ApolloExplorer from '$lib/components/ApolloExplorer.svelte';
  import { goto } from '$app/navigation';
</script>
<svelte:head><title>ZENIT · Apollo 11 archive</title></svelte:head>
<main class="standalone-archive"><a href="/">← Crew monitor</a><h1>The human side of Apollo.</h1><ApolloExplorer onSimulate={()=>goto('/')}/></main>
<style>.standalone-archive{max-width:1250px;padding:32px 24px;margin:auto}.standalone-archive h1{margin-top:28px}</style>
