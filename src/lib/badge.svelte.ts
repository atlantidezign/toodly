import { untrack } from 'svelte';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Image } from '@tauri-apps/api/image';
import { listDatasets } from './datasets';
import { openWorkspaceDb } from './db';
import { store } from './store.svelte';
import { uiprefs } from './uiprefs.svelte';
import { todayISO } from './dates';

/**
 * Cerchietto sull'icona nella barra delle applicazioni: numero dei task aperti scaduti o in scadenza oggi,
 * sommati su tutti i set di dati. Rosso se c'è almeno uno scaduto, viola se solo «oggi».
 * Windows: icona sovrapposta (overlay) disegnata qui con un canvas; macOS/Linux: contatore del badge.
 */
const REFRESH_MS = 60_000;
const SIZE = 64;
const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform);

type Count = { late: number; today: number };
let lastKey = '';

async function countAll(): Promise<Count> {
	const day = todayISO();
	const sets = await listDatasets().catch(() => []);
	let late = 0;
	let today = 0;
	for (const ds of sets) {
		try {
			const db = await openWorkspaceDb(ds.id);
			const rows = await db.select<{ late: number | null; today: number | null }[]>(
				`SELECT SUM(CASE WHEN due_date < $1 THEN 1 ELSE 0 END) AS late, SUM(CASE WHEN due_date = $1 THEN 1 ELSE 0 END) AS today
				 FROM tasks WHERE completed = 0 AND due_date IS NOT NULL AND due_date <= $1`,
				[day]
			);
			late += rows[0]?.late ?? 0;
			today += rows[0]?.today ?? 0;
		} catch {
			/* set non leggibile: lo si salta */
		}
	}
	return { late, today };
}

function draw(n: number, red: boolean): Uint8Array {
	const c = document.createElement('canvas');
	c.width = c.height = SIZE;
	const g = c.getContext('2d')!;
	g.fillStyle = red ? '#e5484d' : '#7c4dcc';
	g.beginPath();
	g.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
	g.fill();
	const text = n > 99 ? '99+' : String(n);
	g.fillStyle = '#ffffff';
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	const px = text.length === 1 ? 42 : text.length === 2 ? 36 : 28;
	g.font = `700 ${px}px "Segoe UI", system-ui, sans-serif`;
	g.fillText(text, SIZE / 2, SIZE / 2 + 2);
	return new Uint8Array(g.getImageData(0, 0, SIZE, SIZE).data.buffer);
}

async function apply(c: Count | null) {
	const n = c ? c.late + c.today : 0;
	const key = n ? `${n}|${c!.late > 0}` : '';
	if (key === lastKey) return;
	lastKey = key;
	const win = getCurrentWindow();
	try {
		if (isWindows) await win.setOverlayIcon(n ? await Image.new(draw(n, c!.late > 0), SIZE, SIZE) : undefined);
		else await win.setBadgeCount(n || undefined);
	} catch (e) {
		lastKey = '';
		console.error(e);
	}
}

async function refresh() {
	if (!uiprefs.showBadge) return apply(null);
	await apply(await countAll());
}

/** Avvia l'aggiornamento (a intervalli e a ogni modifica dei task del set); restituisce la funzione che lo ferma. */
export function startBadge(): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const later = (ms: number) => {
		clearTimeout(timer);
		timer = setTimeout(refresh, ms);
	};
	const stopEffect = $effect.root(() => {
		$effect(() => {
			// cambia ciò che conta (scadenze, completamenti, impostazione): ricalcolo poco dopo, a scrittura avvenuta
			const day = todayISO();
			void uiprefs.showBadge;
			let sig = 0;
			for (const t of store.tasks) if (!t.completed && t.due_date && t.due_date <= day) sig++;
			void sig;
			untrack(() => later(1500));
		});
	});
	const iv = setInterval(refresh, REFRESH_MS);
	later(2500);
	return () => {
		stopEffect();
		clearInterval(iv);
		clearTimeout(timer);
	};
}
