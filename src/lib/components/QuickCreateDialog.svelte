<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { Folder, FolderX, Flag } from '@lucide/svelte';
	import Modal from './Modal.svelte';
	import { t } from '../i18n.svelte';
	import { store } from '../store.svelte';
	import { qc, createAndShow } from '../quickcreate.svelte';
	import { PRIORITIES, type Priority } from '../types';

	/** Scelta rapida di gruppo, descrizione e priorità per un task appena scritto nella barra di aggiunta. */
	let open = $state(false);
	let title = $state('');
	let description = $state('');
	let priority = $state<Priority>(0);
	let groupId = $state('');
	let openDetail = $state(true);
	let lastGroup = '';
	let listEl = $state<HTMLDivElement>();

	const options = $derived.by(() => {
		const out: { id: string; name: string; depth: number }[] = [{ id: '', name: t('Nessun gruppo'), depth: 0 }];
		const walk = (parent: string | null, depth: number) => {
			for (const g of store.groupChildren(parent)) {
				out.push({ id: g.id, name: g.name, depth });
				walk(g.id, depth + 1);
			}
		};
		walk(null, 0);
		return out;
	});

	// arriva una bozza: si apre la finestra con il gruppo scelto l'ultima volta (se esiste ancora)
	$effect(() => {
		const d = qc.draft;
		if (!d) return;
		untrack(() => {
			title = d.title;
			description = d.description ?? '';
			priority = (d.priority ?? 0) as Priority;
			groupId = lastGroup && store.groupsById.has(lastGroup) ? lastGroup : '';
			openDetail = d.open;
			open = true;
			setTimeout(async () => {
				await tick();
				listEl?.focus();
				listEl?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
			}, 60);
		});
	});
	// chiusa (Esc, clic fuori, Annulla): la bozza si scarta
	let wasOpen = false;
	$effect(() => {
		if (open) wasOpen = true;
		else if (wasOpen) {
			wasOpen = false;
			qc.draft = null;
		}
	});

	async function confirm() {
		const d = qc.draft;
		const name = title.trim();
		if (!d || !name) return;
		lastGroup = groupId;
		const { open: _o, ...rest } = d;
		open = false;
		await createAndShow({ ...rest, title: name, description: description.trim() || rest.description || '', priority, group_id: groupId || null }, openDetail);
	}

	function move(delta: number) {
		const i = options.findIndex((o) => o.id === groupId);
		const next = options[Math.max(0, Math.min(options.length - 1, i + delta))];
		groupId = next.id;
		tick().then(() => listEl?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
	}
	function listKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
		else if (e.key === 'Home') { e.preventDefault(); move(-999); }
		else if (e.key === 'End') { e.preventDefault(); move(999); }
		else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); confirm(); }
	}
</script>

<Modal bind:open title={t('Nuovo task')} width={500}>
	<div class="space-y-3.5 text-[13px]" role="presentation" onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); confirm(); } }}>
		<input
			bind:value={title}
			placeholder={t('Titolo del task')}
			class="h-10 w-full rounded-lg border border-border bg-panel px-3 text-[15px] font-semibold outline-none focus:border-accent"
			onkeydown={(e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); confirm(); } }}
		/>

		<div>
			<div class="mb-1 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-accent uppercase"><Folder size={13} />{t('Gruppo')}</div>
			<div
				bind:this={listEl}
				role="listbox"
				tabindex="0"
				aria-label={t('Gruppo')}
				class="max-h-52 overflow-y-auto rounded-lg border border-border bg-panel p-1 outline-none focus:border-accent"
				onkeydown={listKey}
			>
				{#each options as o (o.id)}
					<button
						type="button"
						role="option"
						tabindex="-1"
						aria-selected={groupId === o.id}
						class="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left hover:bg-hover {groupId === o.id ? 'bg-accent-soft font-semibold text-accent' : ''}"
						style="padding-left:{8 + o.depth * 18}px"
						onclick={() => (groupId = o.id)}
						ondblclick={confirm}
					>
						{#if o.id === ''}<FolderX size={14} class="shrink-0 opacity-70" />{:else}<Folder size={14} class="shrink-0 opacity-70" />{/if}
						<span class="min-w-0 truncate">{o.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<div>
			<div class="mb-1 text-[12px] font-semibold tracking-wide text-accent uppercase">{t('Descrizione')}</div>
			<textarea
				bind:value={description}
				rows="3"
				placeholder={t('Descrizione (facoltativa)')}
				class="block w-full resize-none rounded-lg border border-border bg-panel px-3 py-2 outline-none focus:border-accent"
			></textarea>
		</div>

		<div class="flex gap-1">
			{#each PRIORITIES as p}
				<button
					type="button"
					class="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border text-[12px] transition-colors {priority === p.value ? 'border-transparent font-semibold text-white' : 'border-border text-muted hover:bg-hover'}"
					style={priority === p.value ? `background:var(--${p.cls})` : ''}
					aria-pressed={priority === p.value}
					onclick={() => (priority = p.value as Priority)}
				>
					<Flag size={12} style={priority === p.value ? '' : `color:var(--${p.cls})`} />{p.label}
				</button>
			{/each}
		</div>

		<div class="flex items-center justify-end gap-2 pt-1">
			<span class="mr-auto text-[11.5px] text-faint">{t('↑↓ per scegliere il gruppo · Invio per creare')}</span>
			<button class="btn" onclick={() => (open = false)}>{t('Annulla')}</button>
			<button class="btn btn-primary" disabled={!title.trim()} onclick={confirm}>{t('Crea')}</button>
		</div>
	</div>
</Modal>
