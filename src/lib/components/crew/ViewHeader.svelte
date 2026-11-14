<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  let {
    title,
    context,
    keepSourceOpen = false,
    children,
  }: {
    title: string;
    context: string;
    keepSourceOpen?: boolean;
    children?: Snippet;
  } = $props();
</script>

<header class="view-header">
  <a
    class="crew-brand"
    href="/"
    target={keepSourceOpen ? '_blank' : undefined}
    rel="noreferrer"
    aria-label={keepSourceOpen ? 'ZENIT home (opens in a new tab)' : 'ZENIT home'}
  >
    <Icon name="orbit" size={27} /><span>ZENIT<small>Space health monitor</small></span>
  </a>
  <div class="view-identity" aria-label="Current workspace">
    <strong><Icon name="person" size={25} />{title}</strong>
    <span>{context}</span>
  </div>
  <a class="view-switch" href="/" target={keepSourceOpen ? '_blank' : undefined} rel="noreferrer">
    <Icon name="switch" size={23} />Switch view{keepSourceOpen ? ' ↗' : ''}
  </a>
  {#if children}<div class="view-connection">{@render children()}</div>{/if}
</header>

<style>
  .view-header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 22px 32px;
    color: #eff4f2;
    background: var(--instrument-ink);
  }
  .view-identity {
    display: grid;
    gap: 5px;
    padding-left: 24px;
    border-left: 1px solid #526773;
    margin-right: auto;
    min-width: 0;
  }
  .view-identity strong {
    font-size: 21px;
    font-weight: 600;
  }
  .view-identity span {
    font-size: 13px;
    color: #c2d0d5;
  }
  .view-header .view-switch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-height: 44px;
    padding: 10px 16px;
    border: 1px solid #92abb5;
    border-radius: 6px;
    color: #eff4f2;
    text-decoration: none;
    font-weight: 600;
  }
  .view-header a:focus-visible {
    outline-color: #b4d6dc;
  }
  .view-switch:hover {
    background: #294353;
  }
  .view-connection {
    font-size: 12px;
  }
  @media (max-width: 850px) {
    .view-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      padding: 20px;
    }
    .view-identity {
      grid-row: 2;
      grid-column: 1/-1;
      padding: 0;
      border: 0;
    }
    .view-switch {
      grid-column: 2;
      grid-row: 1;
    }
    .view-connection {
      grid-column: 1/-1;
    }
  }
  @media (max-width: 360px) {
    .view-header {
      padding: 16px;
      gap: 16px 10px;
    }
    .view-header .view-switch {
      padding: 10px;
    }
    .view-header :global(.crew-brand) {
      gap: 8px;
    }
    .view-header :global(.crew-brand > span) {
      font-size: 21px;
    }
  }
</style>
