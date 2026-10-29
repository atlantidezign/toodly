import { store } from './store.svelte';
import { revealTask } from './nav.svelte';
import type { Task } from './types';

export type NewTask = Partial<Task> & { title: string };

/** Bozza in attesa della scelta del gruppo (la mostra QuickCreateDialog). */
export const qc = $state<{ draft: (NewTask & { open: boolean }) | null }>({ draft: null });

/** Crea il task e lo porta in vista; con `open` ne apre anche il dettaglio. */
export async function createAndShow(input: NewTask, open = true): Promise<Task> {
	const created = await store.createTask(input);
	void revealTask(created.id, open);
	return created;
}

/**
 * Creazione dalla barra di aggiunta: se esistono gruppi (e il task non ne ha già uno)
 * si sceglie al volo dove metterlo, con descrizione e priorità; altrimenti si crea subito.
 */
export function requestCreate(input: NewTask, open = true) {
	if (store.groups.length === 0 || input.group_id) {
		void createAndShow(input, open);
		return;
	}
	qc.draft = { ...input, open };
}
