<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { spanish } from '$lib/landing-i18n';
  import Icon from '$lib/components/Icon.svelte';
  import RingScene from '$lib/components/RingScene.svelte';
  import { crewDefaults } from '$lib/crew/model';
  import '$lib/landing.css';

  let language: 'en' | 'es' = $derived(page.url.searchParams.get('lang') === 'es' ? 'es' : 'en');
  const t = (text: string) => (language === 'es' ? (spanish[text] ?? text) : text);
  function changeLanguage(value: string) {
    const url = new URL(page.url);
    if (value === 'es') url.searchParams.set('lang', 'es');
    else url.searchParams.delete('lang');
    void goto(url.pathname + url.search + url.hash, {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  }

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
  <title>{t('ZENIT Ring · Space health. Human first.')}</title>
  <meta
    name="description"
    content={t(
      'Meet ZENIT Ring: a space-health prototype connecting simulated sensor readings, astronaut context and a real crew monitor. Explore the NASA Space Apps demo.',
    )}
  />
</svelte:head>

<div class="zenit-landing" lang={language}>
  <a class="landing-skip" href="#main">{t('Skip to content')}</a>
  <header class="landing-header">
    <a class="landing-brand" href="/" aria-label={t('ZENIT Ring home')}
      ><Icon name="orbit" size={30} /><span>ZENIT<span class="brand-ring"> RING</span></span></a
    >
    <nav aria-label={t('Project navigation')}>
      <select
        class="landing-language"
        aria-label="Language / Idioma"
        value={language}
        onchange={(event) => changeLanguage(event.currentTarget.value)}
      >
        <option value="en" lang="en">EN</option><option value="es" lang="es">ES</option>
      </select>
      <a href="#how-it-works">{t('How it works')}</a><a href="#science">{t('The science')}</a>
      <a class="landing-button small" href="#choose-view"
        >{t('Explore the demo')}<Icon name="arrow" size={17} /></a
      >
    </nav>
  </header>
  <main id="main" class="landing-main" tabindex="-1">
    <section class="landing-hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <h1 id="hero-title">{t('Space health.')}<br /><span>{t('Human first.')}</span></h1>
        <p class="hero-lead">{t('Your signals. Your context.')}<br />{t('A clearer next step.')}</p>
        <p class="hero-description">
          {t(
            'ZENIT connects an astronaut’s readings with how they feel, helping them understand a change and share the moment with their crew.',
          )}
        </p>
        <div class="hero-actions">
          <a class="landing-button" href="#choose-view"
            >{t('Explore the demo')}<Icon name="arrow" size={19} /></a
          >
          <a class="landing-text-link" href="#how-it-works"
            >{t('See how it works')}<Icon name="chevron" size={16} /></a
          >
        </div>
        <p class="hero-disclosure">
          <span></span>{t('Simulated readings. Real device-to-device connection.')}
        </p>
      </div>
      <figure class="hero-figure">
        <div class="hero-orbit" aria-hidden="true"></div>
        <img
          class="hero-astronaut"
          src="/images/medbay-astronaut.webp"
          alt={t('Concept illustration of an astronaut in a white spacesuit with a gold visor')}
          width="1024"
          height="1536"
          fetchpriority="high"
        />
        <div class="hero-source ring-source">
          <Icon name="ring" size={23} /><span
            ><strong>{t('Ring')}</strong>{t('Cabin & recovery')}</span
          >
        </div>
        <div class="hero-source suit-source">
          <Icon name="pulse" size={23} /><span
            ><strong>{t('Suit ECG')}</strong>{t('Spacewalk')}</span
          >
        </div>
        <figcaption>
          {t('AI-generated concept illustration · no physical sensor connected')}
        </figcaption>
      </figure>
    </section>
    <div class="project-strip">
      <span>{t('A NASA Space Apps project')}</span>
      <p>{t('Built around the astronaut. Connected to the crew.')}</p>
      <a href="#prototype">{t('What works today')}<Icon name="arrow" size={17} /></a>
    </div>

    <section
      id="how-it-works"
      class="landing-section context-section"
      aria-labelledby="context-title"
    >
      <div class="section-intro">
        <h2 id="context-title">{t('A reading is only')}<br />{t('half the story.')}</h2>
        <p>
          {t(
            'A higher pulse after exercise and a higher pulse at rest need different context. ZENIT asks the person behind the numbers.',
          )}
        </p>
      </div>
      <div class="context-layout">
        <div class="workflow-copy">
          <ol class="workflow-steps">
            <li>
              <strong>{t('Notice the change.')}</strong>
              <p>
                {t(
                  'Local rules look for persistent patterns across comparable readings from the active source.',
                )}
              </p>
            </li>
            <li>
              <strong>{t('Add your side of the story.')}</strong>
              <p>
                {t(
                  'Activity and how you feel help put the observation in context. Symptoms take priority.',
                )}
              </p>
            </li>
            <li>
              <strong>{t('Understand your next step.')}</strong>
              <p>
                {t('Review educational guidance, save a check-in and record how things change.')}
              </p>
            </li>
          </ol>
          <div class="ai-note">
            <Icon name="book" size={23} />
            <p>
              <strong>{t('AI explains. Local rules guide.')}</strong>{t(
                'Gemini can explain the evidence and its limits. The next step remains available if AI does not respond.',
              )}
            </p>
          </div>
        </div>
        <div class="context-example">
          <div class="example-heading">
            <Icon name="pulse" size={23} /><strong>{t('Your pulse is staying higher')}</strong>
          </div>
          <p class="example-label">
            {t('Interactive example · fictional readings, not live telemetry')}
          </p>
          <div
            class="example-readings"
            aria-label={t(
              'Illustrative pulse comparison: earlier 72 beats per minute, recent 96 beats per minute',
            )}
          >
            <div><span>{t('Earlier')}</span><strong>72 <small>bpm</small></strong></div>
            <Icon name="arrow" size={26} />
            <div><span>{t('Recent')}</span><strong>96 <small>bpm</small></strong></div>
          </div>
          <fieldset class="context-options">
            <legend>{t('What is happening around the reading?')}</legend>
            <button aria-pressed={context === 'exercise'} onclick={() => (context = 'exercise')}
              >{t('After exercise')}</button
            >
            <button aria-pressed={context === 'rest'} onclick={() => (context = 'rest')}
              >{t('At rest')}</button
            >
            <button aria-pressed={context === 'unwell'} onclick={() => (context = 'unwell')}
              >{t('I feel unwell')}</button
            >
          </fieldset>
          <div
            class="example-answer"
            class:example-help={context === 'unwell'}
            aria-live="polite"
            aria-atomic="true"
          >
            <h3>{t(example.title)}</h3>
            <p>{t(example.explanation)}</p>
            <h4>{t('Your next step')}</h4>
            <p>{t(example.action)}</p>
          </div>
          <p class="example-footnote">
            {t('Try a different context. Nothing here is saved or sent to the crew.')}
          </p>
        </div>
      </div>
    </section>

    <section class="connection-section" aria-labelledby="connection-title">
      <div class="connection-inner">
        <div class="ring-stage">
          <RingScene connected={false} {language} />
          <p>{t('Wearable concept.')}<br /><strong>{t('Working communication.')}</strong></p>
        </div>
        <div class="connection-copy">
          <h2 id="connection-title">
            {t('A moment on your hand.')}<br />{t('Context for your crew.')}
          </h2>
          <p>
            {t(
              'Capture what happened, preserve the readings and keep the original time with the event.',
            )}
          </p>
          <dl class="gesture-list">
            <div>
              <dt><Icon name="save" size={22} />{t('Double tap')}</dt>
              <dd>{t('Save a moment with its available sensor readings.')}</dd>
            </div>
            <div>
              <dt><Icon name="broadcast" size={22} />{t('Deliberate swipe')}</dt>
              <dd>{t('Send an emergency event to the crew monitor when connected.')}</dd>
            </div>
            <div>
              <dt><Icon name="check" size={22} />{t('Confirmed receipt')}</dt>
              <dd>
                {t(
                  'See when the server has saved the event. The crew can then acknowledge and follow up.',
                )}
              </dd>
            </div>
          </dl>
          <p class="connection-note">
            {t('Delivery stays pending while disconnected. A gesture never infers a symptom.')}
          </p>
        </div>
      </div>
    </section>

    <section id="science" class="landing-section science-section" aria-labelledby="science-title">
      <div class="section-intro">
        <h2 id="science-title">{t('Space research.')}<br />{t('Made approachable.')}</h2>
        <p>
          {t(
            'Explore 17 educational health topics and two guided simulations, with sources from NASA and the Canadian Space Agency.',
          )}
        </p>
      </div>
      <div class="research-stories">
        <article>
          <div class="research-symbol">
            <Icon name="moon" size={38} /><span>{t('Sleep · Activity · Wellbeing')}</span>
          </div>
          <h3>{t('How does your day')}<br />{t('shape how you feel?')}</h3>
          <p>
            {t(
              'Follow three fictional days to explore sleep, activity and reported wellbeing in a simulation inspired by ARCHeR.',
            )}
          </p>
          <a class="landing-text-link" href={`/astronaut/${selected}?view=health&scenario=archer`}
            >{t('Try the sleep simulation')}<Icon name="arrow" size={18} /></a
          >
          <a
            class="research-source"
            href="https://www.nasa.gov/reference/archer/"
            target="_blank"
            rel="noreferrer">{t('Source: NASA · ARCHeR')}<Icon name="link" size={14} /></a
          >
        </article>
        <article>
          <div class="research-symbol">
            <Icon name="orbit" size={38} /><span>{t('Radiation · Observation · Evidence')}</span>
          </div>
          <h3>{t('What can a detector')}<br />{t('really tell us?')}</h3>
          <p>
            {t(
              'Compare fictional bubble-detector counts across locations in a Radi-N2-inspired exercise. Counts are not personal radiation dose.',
            )}
          </p>
          <a class="landing-text-link" href={`/astronaut/${selected}?view=health&scenario=radin2`}
            >{t('Try the radiation simulation')}<Icon name="arrow" size={18} /></a
          >
          <a
            class="research-source"
            href="https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp"
            target="_blank"
            rel="noreferrer"
            >{t('Source: Canadian Space Agency · Radi-N2')}<Icon name="link" size={14} /></a
          >
        </article>
      </div>
      <div class="science-note">
        <Icon name="book" size={22} />
        <p>
          {t(
            'Practice with synthetic scenarios. Explore historical NASA observations separately inside the app. These resources provide context, not clinical validation or agency endorsement.',
          )}
        </p>
      </div>
    </section>

    <section
      id="prototype"
      class="landing-section prototype-section"
      aria-labelledby="prototype-title"
    >
      <div class="prototype-intro">
        <h2 id="prototype-title">
          {t('A working prototype.')}<br />{t('An honest starting point.')}
        </h2>
        <p>
          {t(
            'Built for a demonstration, with a clear distinction between the concept and what runs today.',
          )}
        </p>
      </div>
      <dl class="prototype-facts">
        <div>
          <dt>{t('Simulated')}</dt>
          <dd>
            {t(
              'Ring and suit readings, fictional astronaut identities and guided research scenarios.',
            )}
          </dd>
        </div>
        <div>
          <dt>{t('Working today')}</dt>
          <dd>
            {t(
              'Communication across devices, saved events, delivery receipts, crew acknowledgement and check-in follow-up.',
            )}
          </dd>
        </div>
        <div>
          <dt>{t('Beyond this demo')}</dt>
          <dd>
            {t(
              'Physical wearable integration, clinical validation and mission-approved operational procedures.',
            )}
          </dd>
        </div>
      </dl>
    </section>

    <section id="choose-view" class="demo-section" aria-labelledby="demo-title">
      <div class="demo-inner">
        <div class="demo-intro">
          <h2 id="demo-title">{t('Step into the mission.')}</h2>
          <p>{t('Explore one astronaut’s perspective or see the whole crew.')}</p>
        </div>
        <div class="demo-choices">
          <section class="demo-astronaut" aria-labelledby="astronaut-title">
            <Icon name="heart" size={27} />
            <h3 id="astronaut-title">{t('Astronaut view')}</h3>
            <p>{t('Understand your signals, add context and record how you feel.')}</p>
            <label for="choose-astronaut">{t('Choose a demo astronaut')}</label>
            <select id="choose-astronaut" bind:value={selected}
              >{#each crewDefaults as person}<option value={person.id}>{person.name}</option
                >{/each}</select
            >
            <a class="landing-button" href={`/astronaut/${selected}`}
              >{t('Open astronaut view')}<Icon name="arrow" size={18} /></a
            >
            <a class="landing-text-link" href={`/astronaut/${selected}?view=health&scenario=archer`}
              >{t('Start guided simulation')}<Icon name="arrow" size={16} /></a
            >
            <small>{t('No devices needed for guided simulations.')}</small>
          </section>
          <section class="demo-monitor" aria-labelledby="monitor-title">
            <Icon name="monitor" size={27} />
            <h3 id="monitor-title">{t('Crew monitor')}</h3>
            <p>
              {t(
                'See all four astronauts, review shared records and follow up on requests for help.',
              )}
            </p>
            <a class="landing-button secondary" href="/crew"
              >{t('Open crew monitor')}<Icon name="arrow" size={18} /></a
            >
            <p class="demo-monitor-note">
              {t(
                'Presenting with two devices? Keep the monitor on one and open a ring simulator on the other.',
              )}
            </p>
          </section>
        </div>
        <details class="demo-tools">
          <summary>{t('Set up a connected demo')}</summary>
          <p>
            {t(
              'Use devices on the same accessible server. Link a simulator to your selected astronaut and keep its page visible while exploring the app. Each simulator opens in a new tab.',
            )}
          </p>
          <nav aria-label={t('Demo tools')}>
            <a href={`/ring?astronaut=${selected}`} target="_blank" rel="noreferrer"
              >{t('Ring simulator \u00b7')} {selectedName} <Icon name="link" size={16} /></a
            >
            <a href={`/suit?astronaut=${selected}`} target="_blank" rel="noreferrer"
              >{t('Suit simulator \u00b7')} {selectedName} <Icon name="link" size={16} /></a
            >
            <a href="/research">{t('Research scenarios')}<Icon name="arrow" size={16} /></a>
          </nav>
        </details>
        <p class="demo-disclosure">
          {t(
            'Fictional identities · No sign-in required · Use fictional data on a trusted demo network',
          )}
        </p>
      </div>
    </section>
  </main>
  <footer class="landing-footer">
    <a class="landing-brand" href="#main"><Icon name="orbit" size={25} /><span>ZENIT</span></a>
    <p>{t('Understand your signals. Share your story.')}</p>
    <span>{t('Educational prototype. No diagnosis or life-support control.')}</span>
  </footer>
</div>
