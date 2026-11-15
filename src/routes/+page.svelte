<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import AstronautFigure from '$lib/components/crew/AstronautFigure.svelte';
  import { crewDefaults } from '$lib/crew/model';
  import '$lib/crew/crew.css';

  let selected = $state('vega');
</script>

<svelte:head>
  <title>ZENIT · Choose your view</title>
  <meta
    name="description"
    content="Choose an astronaut's personal health view or the shared crew monitor."
  />
</svelte:head>

<div class="crew-app entry-app">
  <a class="crew-skip" href="#choose-view">Skip to view selection</a>
  <header class="entry-header">
    <a class="crew-brand" href="/" aria-label="ZENIT home"
      ><Icon name="orbit" size={29} /><span>ZENIT<small>Space health monitor</small></span></a
    >
    <span>NASA Space Apps</span>
  </header>
  <main id="choose-view" class="entry-main">
    <section class="entry-mission" aria-label="Space health monitor introduction">
      <h1>Space health.<br />Human first.</h1>
      <p>From astronaut signals to a clearer next step.</p>
      <AstronautFigure decorative />
      <div class="entry-mechanism">
        <Icon name="pulse" size={20} /><span>Telemetry</span><Icon name="arrow" size={15} /><span
          >Insight</span
        ><Icon name="arrow" size={15} /><span>Next step</span>
      </div>
    </section>
    <div class="entry-workspaces">
      <div class="entry-intro">
        <h2>Choose your view</h2>
        <p>Personal health or the whole crew.</p>
      </div>
      <div class="view-choices">
        <section class="view-choice astronaut-choice" aria-labelledby="astronaut-title">
          <Icon name="heart" size={30} />
          <h2 id="astronaut-title">Astronaut view</h2>
          <p>Understand <strong>my health</strong>, report how I feel and see what to do next.</p>
          <label for="choose-astronaut">Who are you in this demo?</label>
          <select id="choose-astronaut" bind:value={selected}>
            {#each crewDefaults as person}<option value={person.id}
                >{person.callsign} · {person.name}</option
              >{/each}
          </select>
          <a class="crew-button" href={`/astronaut/${selected}`}
            >Open astronaut view <Icon name="arrow" size={18} /></a
          >
        </section>
        <section class="view-choice monitor-choice" aria-labelledby="monitor-title">
          <Icon name="monitor" size={30} />
          <h2 id="monitor-title">Crew monitor</h2>
          <p>
            See <strong>all four astronauts</strong>, review shared records and follow up on
            requests for help.
          </p>
          <p class="view-audience">For the person monitoring the crew.</p>
          <a class="crew-button secondary" href="/crew"
            >Open crew monitor <Icon name="arrow" size={18} /></a
          >
        </section>
      </div>
      <p class="entry-hint">
        Your current view and astronaut stay visible at the top. Use <strong>Switch view</strong> to return
        here.
      </p>
      <details class="entry-tools">
        <summary>Demo tools <span>Simulate a device or try a research scenario</span></summary>
        <p>
          Ring and suit simulators generate the readings. Keep them open in another tab while you
          use either health view.
        </p>
        <nav aria-label="Demo tools">
          <a href={`/ring?astronaut=${selected}`} target="_blank" rel="noreferrer"
            >Ring simulator · {selected.toUpperCase()} ↗</a
          >
          <a href={`/suit?astronaut=${selected}`} target="_blank" rel="noreferrer"
            >Suit simulator · {selected.toUpperCase()} ↗</a
          >
          <a href="/research">Research scenarios <Icon name="arrow" size={16} /></a>
        </nav>
      </details>
      <p class="entry-note">Demo identities · no sign-in required</p>
    </div>
  </main>
</div>

<style>
  .entry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 23px 32px;
    background: var(--instrument-ink);
    color: #eff4f2;
  }
  .entry-header > span {
    color: #d1e1e9;
    font-size: 12px;
  }
  .entry-main {
    max-width: 1280px;
    margin: auto;
    padding: 48px 32px 28px;
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 64px;
  }
  .entry-mission h1 {
    font-size: clamp(44px, 4.5vw, 64px);
    line-height: 1.06;
    margin: 8px 0 20px;
  }
  .entry-mission > p {
    color: var(--instrument-muted);
    font-size: 16px;
  }
  .entry-mission :global(.medbay-figure) {
    height: 420px;
    margin-top: 16px;
  }
  .entry-mission :global(.medbay-figure img) {
    height: 100%;
    width: 100%;
    object-fit: contain;
  }
  .entry-mechanism {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 14px;
    color: var(--instrument-accent);
    font-size: 12px;
    padding: 20px 0;
    border-top: 1px solid var(--instrument-line);
    margin-top: 18px;
    font-weight: 650;
  }
  .entry-intro {
    margin-bottom: 22px;
  }
  .entry-intro h2 {
    font-size: 28px;
    margin-bottom: 8px;
  }
  .entry-intro p {
    color: var(--instrument-muted);
    margin: 0;
  }
  .view-choices {
    display: grid;
    background: white;
    border: 1px solid var(--instrument-line);
    border-radius: 12px;
    overflow: hidden;
  }
  .view-choice {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 9px 14px;
    align-items: center;
    padding: 24px;
  }
  .view-choice > :global(svg) {
    color: var(--instrument-accent);
  }
  .view-choice h2 {
    font-size: 23px;
  }
  .view-choice p,
  .view-choice label,
  .view-choice select,
  .view-choice a {
    grid-column: 2;
  }
  .view-choice > p {
    color: var(--instrument-muted);
    font-size: 13px;
  }
  .view-choice strong {
    color: var(--instrument-ink);
  }
  .view-choice label {
    margin-top: 9px;
    font-size: 12px;
  }
  .view-choice .crew-button {
    width: 100%;
    margin-top: 5px;
    text-decoration: none;
    color: white;
  }
  .view-choice .crew-button.secondary {
    color: var(--instrument-ink);
  }
  .monitor-choice {
    border-top: 1px solid var(--instrument-line);
    background: #f8fafb;
  }
  .view-choice .view-audience {
    font-size: 11px;
  }
  .entry-hint {
    color: var(--instrument-muted);
    margin: 18px 0;
    font-size: 12px;
  }
  .entry-tools {
    border-top: 1px solid var(--instrument-line);
    border-bottom: 1px solid var(--instrument-line);
  }
  .entry-tools summary {
    min-height: 54px;
    padding: 17px 0;
    cursor: pointer;
    font-weight: 650;
    font-size: 13px;
  }
  .entry-tools summary span {
    display: block;
    margin-top: 7px;
    font-size: 12px;
    font-weight: 400;
    color: var(--instrument-muted);
  }
  .entry-tools p {
    color: var(--instrument-muted);
    font-size: 12px;
  }
  .entry-tools nav {
    display: grid;
    gap: 4px;
    padding: 8px 0 14px;
  }
  .entry-tools a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    font-size: 12px;
  }
  .entry-note {
    color: var(--instrument-muted);
    margin-top: 18px;
    font-size: 11px;
  }
  @media (max-width: 900px) {
    .entry-main {
      gap: 30px;
      padding: 36px 24px;
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    }
    .view-choice {
      padding: 20px;
      gap: 10px;
    }
    .entry-mission h1 {
      font-size: 45px;
    }
    .entry-mechanism {
      gap: 8px;
      font-size: 10px;
    }
  }
  @media (max-width: 650px) {
    .entry-header {
      padding: 20px;
    }
    .entry-header > span {
      max-width: 120px;
      text-align: right;
      font-size: 10px;
    }
    .entry-main {
      grid-template-columns: 1fr;
      gap: 26px;
      padding: 28px 20px;
    }
    .entry-mission {
      position: relative;
      padding: 12px 125px 18px 0;
      min-height: 190px;
    }
    .entry-mission h1 {
      font-size: 36px;
      margin: 0 0 14px;
    }
    .entry-mission > p {
      font-size: 12px;
    }
    .entry-mission :global(.medbay-figure) {
      position: absolute;
      right: -8px;
      top: -12px;
      width: 130px;
      height: 200px;
      margin: 0;
    }
    .entry-mission :global(figcaption) {
      font-size: 7px;
    }
    .entry-mechanism {
      display: none;
    }
    .entry-intro h2 {
      font-size: 25px;
    }
    .view-choice {
      padding: 20px 16px;
    }
    .view-choice h2 {
      font-size: 21px;
    }
    .view-choice select,
    .view-choice a {
      grid-column: 1 / -1;
    }
  }
</style>
