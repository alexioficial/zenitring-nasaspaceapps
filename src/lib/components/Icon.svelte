<script lang="ts">
  export type IconName =
    | 'person'
    | 'switch'
    | 'database'
    | 'eye'
    | 'ring'
    | 'broadcast'
    | 'activity'
    | 'chair'
    | 'medical'
    | 'pen'
    | 'rise'
    | 'cabin'
    | 'bed'
    | 'orbit'
    | 'pulse'
    | 'moon'
    | 'heart'
    | 'meal'
    | 'archive'
    | 'arrow'
    | 'check'
    | 'link'
    | 'unlink'
    | 'monitor'
    | 'save'
    | 'play'
    | 'pause'
    | 'book'
    | 'chevron'
    | 'lungs'
    | 'oxygen'
    | 'temperature';
  let { name, size = 20 }: { name: IconName; size?: number } = $props();
  const paths: Record<IconName, string> = {
    person: 'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3',
    switch: 'M3 7h18l-5-5M21 17H3l5 5',
    database:
      'M21 5c0 2-4 3-9 3S3 7 3 5s4-3 9-3 9 1 9 3Zm0 0v14c0 2-4 3-9 3s-9-1-9-3V5m0 7c0 2 4 3 9 3s9-1 9-3',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm14 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    ring: 'M18 3c4 3 3 9-1 14S7 23 4 20s-2-9 2-14S15 0 18 3Zm-1 1C10 4 4 12 4 18m3 2c7 0 13-8 13-14',
    broadcast:
      'M12 9v13M7 22l5-10 5 10M9 17h6M8 5a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8M5 2a10 10 0 0 0 0 14M19 2a10 10 0 0 1 0 14M13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
    activity: 'M15 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0ZM5 9l5-3 5 4 5 1M13 8l-3 6 5 3-1 5M10 14l-4 6H2',
    chair: 'M9 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0ZM10 8v6h7l3 8M6 8v10h9m-9 0v4m9-4v4M11 10l5 2',
    medical: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
    pen: 'm3 16 13-13 5 5L8 21H3v-5Zm10-10 5 5M3 16l5 5',
    rise: 'M12 21V3M4 11l8-8 8 8',
    cabin: 'M3 7h18v14H3ZM8 7V3h8v4M7 10v8m10-8v8M12 10v8',
    bed: 'M3 3v19m0-6h18v6M3 7h6v6H3m6-3h10a2 2 0 0 1 2 2v4H9Z',
    lungs:
      'M12 3v8m0-3-3 3M12 8l3 3M8 7C5 9 3 13 3 18c0 3 6 3 6 0V9M16 7c3 2 5 6 5 11 0 3-6 3-6 0V9',
    oxygen: 'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12ZM8 15a4 4 0 0 0 4 4',
    temperature: 'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3-7v10m5-11h3m-3 4h2',
    orbit: 'M20 4 4 20M9 5a8 8 0 1 1-4 4M15 3h6v6',
    pulse: 'M2 12h4l3-7 5 14 3-7h5',
    moon: 'M20 14a8 8 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z',
    heart: 'M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z',
    meal: 'M5 3v6m4-6v6M3 3v5a4 4 0 0 0 8 0V3M7 12v9M20 21V3c-5 3-5 10 0 10',
    archive: 'M4 8h16v13H4ZM3 3h18v5H3Zm6 9h6',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    check: 'm5 12 4 4L19 6',
    link: 'm10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
    unlink: 'm3 3 18 18M8 16l-2 2a4 4 0 0 1-5-5l3-3m12-2 2-2a4 4 0 0 0-5-5l-3 3',
    monitor: 'M3 3h18v14H3Zm5 18h8m-4-4v4',
    save: 'M4 3h13l4 4v14H3V3Zm3 0v6h10V3M7 21v-8h10v8',
    play: 'm8 4 12 8-12 8Z',
    pause: 'M8 4v16M16 4v16',
    book: 'M12 5v16M3 3h5l4 2 4-2h5v16h-5l-4 2-4-2H3Z',
    chevron: 'm8 4 8 8-8 8',
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={paths[name]} /></svg
>
