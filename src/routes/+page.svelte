<script lang="ts">
	import ListView from '../lib/components/ListView.svelte';
	import KanbanView from '../lib/components/KanbanView.svelte';
	import CalendarView from '../lib/components/CalendarView.svelte';
	import GanttView from '../lib/components/GanttView.svelte';
	import GraphView from '../lib/components/GraphView.svelte';
	import OrbitView from '../lib/components/OrbitView.svelte';
	import MetroView from '../lib/components/MetroView.svelte';
	import CorkView from '../lib/components/CorkView.svelte';
	import RoadView from '../lib/components/RoadView.svelte';
	import MatrixView from '../lib/components/MatrixView.svelte';
	import MosaicView from '../lib/components/MosaicView.svelte';
	import RidgeView from '../lib/components/RidgeView.svelte';
	import GroveView from '../lib/components/GroveView.svelte';
	import SlotView from '../lib/components/SlotView.svelte';
	import BudgetView from '../lib/components/BudgetView.svelte';
	import { tick, untrack } from 'svelte';
	import { nav, reveal } from '../lib/nav.svelte';
	import { store } from '../lib/store.svelte';
	import { expandGroup } from '../lib/groupui.svelte';

	// «porta in vista»: apre i gruppi che nascondono il task e scorre fino a lui nelle viste a scorrimento semplice
	// (Lista, Kanban, Mosaic, Ridge, Road, Slot…). Gantt, Graph e le mappe si riposizionano da sole (data-reveal-self).
	$effect(() => {
		const n = reveal.n;
		const id = reveal.id;
		if (!n || !id) return;
		untrack(async () => {
			const task = store.byId.get(id);
			if (!task) return;
			let g = task.group_id ? store.groupsById.get(task.group_id) : undefined;
			while (g) {
				expandGroup(g.id);
				g = g.parent_id ? store.groupsById.get(g.parent_id) : undefined;
			}
			await tick();
			await tick();
			const el = document.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(id)}"]`);
			if (!el || el.closest('[data-reveal-self], [data-drawer]')) return;
			el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
		});
	});
</script>

{#if nav.mode === 'kanban'}
	<KanbanView />
{:else if nav.mode === 'calendar'}
	<CalendarView />
{:else if nav.mode === 'gantt'}
	<GanttView />
{:else if nav.mode === 'graph'}
	<GraphView />
{:else if nav.mode === 'orbit'}
	<OrbitView />
{:else if nav.mode === 'metro'}
	<MetroView />
{:else if nav.mode === 'cork'}
	<CorkView />
{:else if nav.mode === 'road'}
	<RoadView />
{:else if nav.mode === 'matrix'}
	<MatrixView />
{:else if nav.mode === 'mosaic'}
	<MosaicView />
{:else if nav.mode === 'ridge'}
	<RidgeView />
{:else if nav.mode === 'grove'}
	<GroveView />
{:else if nav.mode === 'slot'}
	<SlotView />
{:else if nav.mode === 'budget'}
	<BudgetView />
{:else}
	<ListView />
{/if}
