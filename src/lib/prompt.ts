import { t } from './i18n.svelte';
import { store } from './store.svelte';
import { uiprefs } from './uiprefs.svelte';
import type { Task } from './types';

const heading = (level: number, text: string) => `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${text}`;

/** Una nota come voce di elenco Markdown (le righe successive rientrano di due spazi). */
const noteItem = (text: string) =>
	text
		.trim()
		.split(/\r?\n/)
		.map((l, i) => (i === 0 ? `- ${l}` : l ? `  ${l}` : ''))
		.join('\n');

/**
 * Testo Markdown da dare a un assistente: titolo, descrizione e note del task e, per ogni sotto-attività
 * (a qualsiasi profondità), gli stessi campi. I titoli sono intestazioni sempre più annidate.
 * Di default le sotto-attività completate sono escluse; con l'impostazione attiva ci sono tutte,
 * ognuna con una casella Markdown (`[ ]` da fare, `[x]` fatta).
 */
export function buildPrompt(root: Task): string {
	const out: string[] = [];
	const all = uiprefs.promptDone;
	const walk = (task: Task, level: number, seen: Set<string>) => {
		seen.add(task.id);
		const box = all && level > 1 ? (task.completed ? '[x] ' : '[ ] ') : '';
		out.push(heading(level, box + (task.title.trim() || t('Senza titolo'))), '');
		const desc = task.description.trim();
		if (desc) out.push(desc, '');
		const notes = store.notesOf(task.id).filter((n) => n.text.trim());
		if (notes.length) {
			out.push(heading(level + 1, t('Note')), '');
			for (const n of notes) out.push(noteItem(n.text));
			out.push('');
		}
		const subs = store.children(task.id).filter((s) => !seen.has(s.id) && (all || !s.completed));
		if (subs.length) {
			out.push(heading(level + 1, t('Sotto-attività')), '');
			for (const s of subs) walk(s, level + 2, seen);
		}
	};
	walk(root, 1, new Set());
	return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
