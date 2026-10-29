<script lang="ts">
	import UnscheduledPanel from './UnscheduledPanel.svelte';
	import MonthGrid from './MonthGrid.svelte';
	import WeekGrid from './WeekGrid.svelte';
	import { store } from '../store.svelte';
	import { untrack } from 'svelte';
	import { nav, go, reveal } from '../nav.svelte';
	import { startOfWeek } from '../dates';
	import { inScope } from '../views';

	// le viste "Oggi" / "Prossimi 7 giorni" limiterebbero il calendario: mostriamo tutto
	const scope = $derived(nav.scope === 'today' || nav.scope === 'next7' ? 'all' : nav.scope);
	const tasks = $derived(store.tasks.filter((t) => inScope(t, scope, store.filters, store.blockedIds)));

	// un task creato o spostato dal pannello: il calendario va alla settimana (o al mese) della sua scadenza
	$effect(() => {
		const n = reveal.n;
		const id = reveal.id;
		if (!n || !id) return;
		untrack(() => {
			const d = store.byId.get(id)?.due_date;
			if (!d) return;
			const a = nav.date;
			const visible = nav.cal === 'month' ? d.slice(0, 7) === a.slice(0, 7) : startOfWeek(d) === startOfWeek(a);
			if (!visible) go({ d });
		});
	});
</script>

<div class="flex h-full min-h-0">
	<UnscheduledPanel {tasks} />
	{#if nav.cal === 'month'}
		<MonthGrid {tasks} anchor={nav.date} />
	{:else}
		<WeekGrid {tasks} anchor={nav.date} />
	{/if}
</div>
