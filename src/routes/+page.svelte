<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import RingScene from '$lib/components/RingScene.svelte';
  import { crewDefaults } from '$lib/crew/model';
  import '$lib/landing.css';

  let selected = $state('vega');
  let selectedName = $derived(crewDefaults.find((person) => person.id === selected)?.name ?? '');
  let context = $state<'exercise' | 'rest' | 'unwell'>('exercise');
  const examples = {
    exercise: {
      title: 'Recent exercise may explain the rise.',
      explanation:
        'Activity could contribute to a higher pulse. Your readings alone cannot tell us how recovery is going.',
      action:
        'Record when you finished and how you feel. Review the trend during your planned rest period and share persistent changes with the crew.',
    },
    rest: {
      title: 'The change still needs context.',
      explanation:
        'Without recent exercise, we cannot use activity to explain the rise. These readings do not identify its cause.',
      action:
        'Tell the crew medical officer about a persistent change. Include when it began and any symptoms.',
    },
    unwell: {
      title: 'How you feel needs attention.',
      explanation:
        'Your symptoms matter even if the readings look reassuring. This example cannot assess your condition.',
      action:
        'Contact your crew directly and follow the mission medical procedure. Selecting this answer does not send an alert.',
    },
  };
  let example = $derived(examples[context]);
</script>

<svelte:head>
  <title>ZENIT Ring · Space health. Human first.</title>
  <meta
    name="description"
    content="Meet ZENIT Ring: a space-health prototype connecting simulated sensor readings, astronaut context and a real crew monitor. Explore the NASA Space Apps demo."
  />
</svelte:head>

<div class="zenit-landing">
  <a class="landing-skip" href="#main">Skip to content</a>
  <header class="landing-header">
    <a class="landing-brand" href="/" aria-label="ZENIT Ring home"
      ><Icon name="orbit" size={30} /><span>ZENIT<span class="brand-ring"> RING</span></span></a
    >
    <nav aria-label="Project navigation">
      <a href="#how-it-works">How it works</a><a href="#science">The science</a>
      <a class="landing-button small" href="#choose-view"
        >Explore the demo <Icon name="arrow" size={17} /></a
      >
    </nav>
  </header>
  <main id="main" class="landing-main" tabindex="-1">
    <section class="landing-hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <h1 id="hero-title">Space health.<br /><span>Human first.</span></h1>
        <p class="hero-lead">Your signals. Your context.<br />A clearer next step.</p>
        <p class="hero-description">
          ZENIT connects an astronaut’s readings with how they feel, helping them understand a
          change and share the moment with their crew.
        </p>
        <div class="hero-actions">
          <a class="landing-button" href="#choose-view"
            >Explore the demo <Icon name="arrow" size={19} /></a
          >
          <a class="landing-text-link" href="#how-it-works"
            >See how it works <Icon name="chevron" size={16} /></a
          >
        </div>
        <p class="hero-disclosure">
          <span></span>Simulated readings. Real device-to-device connection.
        </p>
      </div>
      <figure class="hero-figure">
        <div class="hero-orbit" aria-hidden="true"></div>
        <img
          class="hero-astronaut"
          src="/images/medbay-astronaut.webp"
          alt="Concept illustration of an astronaut in a white spacesuit with a gold visor"
          width="1024"
          height="1536"
          fetchpriority="high"
        />
        <div class="hero-source ring-source">
          <Icon name="ring" size={23} /><span><strong>Ring</strong>Cabin &amp; recovery</span>
        </div>
        <div class="hero-source suit-source">
          <Icon name="pulse" size={23} /><span><strong>Suit ECG</strong>Spacewalk</span>
        </div>
        <figcaption>AI-generated concept illustration · no physical sensor connected</figcaption>
      </figure>
    </section>
    <div class="project-strip">
      <span>A NASA Space Apps project</span>
      <p>Built around the astronaut. Connected to the crew.</p>
      <a href="#prototype">What works today <Icon name="arrow" size={17} /></a>
    </div>

    <section
      id="how-it-works"
      class="landing-section context-section"
      aria-labelledby="context-title"
    >
      <div class="section-intro">
        <h2 id="context-title">A reading is only<br />half the story.</h2>
        <p>
          A higher pulse after exercise and a higher pulse at rest need different context. ZENIT
          asks the person behind the numbers.
        </p>
      </div>
      <div class="context-layout">
        <div class="workflow-copy">
          <ol class="workflow-steps">
            <li>
              <strong>Notice the change.</strong>
              <p>
                Local rules look for persistent patterns across comparable readings from the active
                source.
              </p>
            </li>
            <li>
              <strong>Add your side of the story.</strong>
              <p>
                Activity and how you feel help put the observation in context. Symptoms take
                priority.
              </p>
            </li>
            <li>
              <strong>Understand your next step.</strong>
              <p>Review educational guidance, save a check-in and record how things change.</p>
            </li>
          </ol>
          <div class="ai-note">
            <Icon name="book" size={23} />
            <p>
              <strong>AI explains. Local rules guide.</strong>Gemini can explain the evidence and
              its limits. The next step remains available if AI does not respond.
            </p>
          </div>
        </div>
        <div class="context-example">
          <div class="example-heading">
            <Icon name="pulse" size={23} /><strong>Your pulse is staying higher</strong>
          </div>
          <p class="example-label">Interactive example · fictional readings, not live telemetry</p>
          <div
            class="example-readings"
            aria-label="Illustrative pulse comparison: earlier 72 beats per minute, recent 96 beats per minute"
          >
            <div><span>Earlier</span><strong>72 <small>bpm</small></strong></div>
            <Icon name="arrow" size={26} />
            <div><span>Recent</span><strong>96 <small>bpm</small></strong></div>
          </div>
          <fieldset class="context-options">
            <legend>What is happening around the reading?</legend>
            <button aria-pressed={context === 'exercise'} onclick={() => (context = 'exercise')}
              >After exercise</button
            >
            <button aria-pressed={context === 'rest'} onclick={() => (context = 'rest')}
              >At rest</button
            >
            <button aria-pressed={context === 'unwell'} onclick={() => (context = 'unwell')}
              >I feel unwell</button
            >
          </fieldset>
          <div
            class="example-answer"
            class:example-help={context === 'unwell'}
            aria-live="polite"
            aria-atomic="true"
          >
            <h3>{example.title}</h3>
            <p>{example.explanation}</p>
            <h4>Your next step</h4>
            <p>{example.action}</p>
          </div>
          <p class="example-footnote">
            Try a different context. Nothing here is saved or sent to the crew.
          </p>
        </div>
      </div>
    </section>

    <section class="connection-section" aria-labelledby="connection-title">
      <div class="connection-inner">
        <div class="ring-stage">
          <RingScene connected={false} />
          <p>Wearable concept.<br /><strong>Working communication.</strong></p>
        </div>
        <div class="connection-copy">
          <h2 id="connection-title">A moment on your hand.<br />Context for your crew.</h2>
          <p>
            Capture what happened, preserve the readings and keep the original time with the event.
          </p>
          <dl class="gesture-list">
            <div>
              <dt><Icon name="save" size={22} />Double tap</dt>
              <dd>Save a moment with its available sensor readings.</dd>
            </div>
            <div>
              <dt><Icon name="broadcast" size={22} />Deliberate swipe</dt>
              <dd>Send an emergency event to the crew monitor when connected.</dd>
            </div>
            <div>
              <dt><Icon name="check" size={22} />Confirmed receipt</dt>
              <dd>
                See when the server has saved the event. The crew can then acknowledge and follow
                up.
              </dd>
            </div>
          </dl>
          <p class="connection-note">
            Delivery stays pending while disconnected. A gesture never infers a symptom.
          </p>
        </div>
      </div>
    </section>

    <section id="science" class="landing-section science-section" aria-labelledby="science-title">
      <div class="section-intro">
        <h2 id="science-title">Space research.<br />Made approachable.</h2>
        <p>
          Explore 17 educational health topics and two guided simulations, with sources from NASA
          and the Canadian Space Agency.
        </p>
      </div>
      <div class="research-stories">
        <article>
          <div class="research-symbol">
            <Icon name="moon" size={38} /><span>Sleep · Activity · Wellbeing</span>
          </div>
          <h3>How does your day<br />shape how you feel?</h3>
          <p>
            Follow three fictional days to explore sleep, activity and reported wellbeing in a
            simulation inspired by ARCHeR.
          </p>
          <a class="landing-text-link" href={`/astronaut/${selected}?view=health&scenario=archer`}
            >Try the sleep simulation <Icon name="arrow" size={18} /></a
          >
          <a
            class="research-source"
            href="https://www.nasa.gov/reference/archer/"
            target="_blank"
            rel="noreferrer">Source: NASA · ARCHeR <Icon name="link" size={14} /></a
          >
        </article>
        <article>
          <div class="research-symbol">
            <Icon name="orbit" size={38} /><span>Radiation · Observation · Evidence</span>
          </div>
          <h3>What can a detector<br />really tell us?</h3>
          <p>
            Compare fictional bubble-detector counts across locations in a Radi-N2-inspired
            exercise. Counts are not personal radiation dose.
          </p>
          <a class="landing-text-link" href={`/astronaut/${selected}?view=health&scenario=radin2`}
            >Try the radiation simulation <Icon name="arrow" size={18} /></a
          >
          <a
            class="research-source"
            href="https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp"
            target="_blank"
            rel="noreferrer"
            >Source: Canadian Space Agency · Radi-N2 <Icon name="link" size={14} /></a
          >
        </article>
      </div>
      <div class="science-note">
        <Icon name="book" size={22} />
        <p>
          Practice with synthetic scenarios. Explore historical NASA observations separately inside
          the app. These resources provide context, not clinical validation or agency endorsement.
        </p>
      </div>
    </section>

    <section
      id="prototype"
      class="landing-section prototype-section"
      aria-labelledby="prototype-title"
    >
      <div class="prototype-intro">
        <h2 id="prototype-title">A working prototype.<br />An honest starting point.</h2>
        <p>
          Built for a demonstration, with a clear distinction between the concept and what runs
          today.
        </p>
      </div>
      <dl class="prototype-facts">
        <div>
          <dt>Simulated</dt>
          <dd>
            Ring and suit readings, fictional astronaut identities and guided research scenarios.
          </dd>
        </div>
        <div>
          <dt>Working today</dt>
          <dd>
            Communication across devices, saved events, delivery receipts, crew acknowledgement and
            check-in follow-up.
          </dd>
        </div>
        <div>
          <dt>Beyond this demo</dt>
          <dd>
            Physical wearable integration, clinical validation and mission-approved operational
            procedures.
          </dd>
        </div>
      </dl>
    </section>

    <section id="choose-view" class="demo-section" aria-labelledby="demo-title">
      <div class="demo-inner">
        <div class="demo-intro">
          <h2 id="demo-title">Step into the mission.</h2>
          <p>Explore one astronaut’s perspective or see the whole crew.</p>
        </div>
        <div class="demo-choices">
          <section class="demo-astronaut" aria-labelledby="astronaut-title">
            <Icon name="heart" size={27} />
            <h3 id="astronaut-title">Astronaut view</h3>
            <p>Understand your signals, add context and record how you feel.</p>
            <label for="choose-astronaut">Choose a demo astronaut</label>
            <select id="choose-astronaut" bind:value={selected}
              >{#each crewDefaults as person}<option value={person.id}>{person.name}</option
                >{/each}</select
            >
            <a class="landing-button" href={`/astronaut/${selected}`}
              >Open astronaut view <Icon name="arrow" size={18} /></a
            >
            <a class="landing-text-link" href={`/astronaut/${selected}?view=health&scenario=archer`}
              >Start guided simulation <Icon name="arrow" size={16} /></a
            >
            <small>No devices needed for guided simulations.</small>
          </section>
          <section class="demo-monitor" aria-labelledby="monitor-title">
            <Icon name="monitor" size={27} />
            <h3 id="monitor-title">Crew monitor</h3>
            <p>
              See all four astronauts, review shared records and follow up on requests for help.
            </p>
            <a class="landing-button secondary" href="/crew"
              >Open crew monitor <Icon name="arrow" size={18} /></a
            >
            <p class="demo-monitor-note">
              Presenting with two devices? Keep the monitor on one and open a ring simulator on the
              other.
            </p>
          </section>
        </div>
        <details class="demo-tools">
          <summary>Set up a connected demo</summary>
          <p>
            Use devices on the same accessible server. Link a simulator to your selected astronaut
            and keep its page visible while exploring the app. Each simulator opens in a new tab.
          </p>
          <nav aria-label="Demo tools">
            <a href={`/ring?astronaut=${selected}`} target="_blank" rel="noreferrer"
              >Ring simulator · {selectedName} <Icon name="link" size={16} /></a
            >
            <a href={`/suit?astronaut=${selected}`} target="_blank" rel="noreferrer"
              >Suit simulator · {selectedName} <Icon name="link" size={16} /></a
            >
            <a href="/research">Research scenarios <Icon name="arrow" size={16} /></a>
          </nav>
        </details>
        <p class="demo-disclosure">
          Fictional identities · No sign-in required · Use fictional data on a trusted demo network
        </p>
      </div>
    </section>
  </main>
  <footer class="landing-footer">
    <a class="landing-brand" href="#main"><Icon name="orbit" size={25} /><span>ZENIT</span></a>
    <p>Understand your signals. Share your story.</p>
    <span>Educational prototype. No diagnosis or life-support control.</span>
  </footer>
</div>
