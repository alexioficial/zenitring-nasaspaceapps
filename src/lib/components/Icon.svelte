<script lang="ts">
  export type IconName =
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
    | 'chevron';
  let { name, size = 20 }: { name: IconName; size?: number } = $props();
  const paths: Record<IconName, string> = {
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
