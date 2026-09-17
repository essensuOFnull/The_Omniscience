// src/archivist/ArchivistBook.jsx
//
// Свод. Оркестратор: пул текстур, обложка, разметка разворота.
//
// Тяжёлая логика разложена по соседним модулям:
//   useBookPages  — замер и разбиение записей на страницы
//   useBookFlip   — состояние листа и drag
//   BookPage      — рендер одной страницы (включая spoiler)
//   EntryFlow     — разбор блоков записи в JSX
//   BookCover     — обложка с логотипом
//   BookNav       — кнопки ←/→ и счётчик
//
// — Архивариус

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
	generatePaperTexture,
	generateCoverTexture,
} from './paperTexture.js';
import { useBookPages } from './useBookPages.js';
import { useBookFlip } from './useBookFlip.js';
import EntryFlow from './EntryFlow.jsx';
import BookPage from './BookPage.jsx';
import BookCover from './BookCover.jsx';
import BookNav from './BookNav.jsx';
import { COVER_OPEN_MS, SETTLE_MS } from './bookConstants.js';

export default function ArchivistBook({
	entries,
	spoiledAt = {},
	fullySpoiled = false,
	onSpoil,
	onClose,
}) {
	// ── размер страницы ────────────────────────────────────────
	// Скрытый зонд той же геометрии, что настоящая страница.
	// ResizeObserver пересчитывает при смене размеров окна.
	const pageProbeRef = useRef(null);
	const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

	useLayoutEffect(() => {
		const el = pageProbeRef.current;
		if (!el) return;
		const measure = () => {
			const inner = el.querySelector('.book-page-content');
			if (!inner) return;
			const cs = getComputedStyle(inner);
			const px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
			const py = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
			const rect = inner.getBoundingClientRect();
			const w = rect.width - px;
			const h = rect.height - py;
			if (!(w > 0 && h > 0)) return;
			setPageSize((prev) =>
				prev.width === w && prev.height === h ? prev : { width: w, height: h }
			);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// ── пагинация ──────────────────────────────────────────────
	const { pages, measureRef } = useBookPages(entries, pageSize);
	const ready = !!pages && pages.length > 0;

	// ── пул текстур ────────────────────────────────────────────
	// Четыре слота: [левая, правая, стендбай-1, стендбай-2].
	// Ротация — в onSettle от useBookFlip.
	//
	//   next → [L, R, S1, S2]  →  [S2, S1, new, new]
	//   prev → [L, R, S1, S2]  →  [S2, S1, new, new]
	//
	// Симметрично. Что едет на лист, что остаётся на статике —
	// разобрано в texFor() ниже.
	const [pageTex, setPageTex] = useState(() => [
		generatePaperTexture(),
		generatePaperTexture(),
		generatePaperTexture(),
		generatePaperTexture(),
	]);
	const [coverTex] = useState(() => generateCoverTexture(840, 560));

	const rotateTextures = useCallback(() => {
		setPageTex(([, , c, d]) => [
			d,
			c,
			generatePaperTexture(),
			generatePaperTexture(),
		]);
	}, []);

	// ── флип ───────────────────────────────────────────────────
	const {
		leftIdx,
		rightIdx,
		flip,
		currentSpread,
		totalSpreads,
		canPrev,
		canNext,
		goPrev,
		goNext,
		goToEntry,
		pointerHandlers,
	} = useBookFlip(pages, ready, rotateTextures);

	// ── обложка ────────────────────────────────────────────────
	const [coverOpened, setCoverOpened] = useState(false);
	const [coverOpening, setCoverOpening] = useState(false);

	const openCover = useCallback(() => {
		if (coverOpening || coverOpened) return;
		setCoverOpening(true);
		setTimeout(() => {
			setCoverOpened(true);
			setCoverOpening(false);
		}, COVER_OPEN_MS);
	}, [coverOpening, coverOpened]);

	// ── какая текстура куда идёт ───────────────────────────────
	//
	// Слоты и их роль в конкретный момент:
	//   'left'      — статичная левая страница
	//   'right'     — статичная правая
	//   'flipFront' — передняя грань листа (то, что видно в начале)
	//   'flipBack'  — задняя грань (то, что видно после 90°)
	//
	const texFor = (role) => {
		if (!flip) {
			if (role === 'left') return pageTex[0];
			if (role === 'right') return pageTex[1];
			return null;
		}
		if (flip.direction === 'next') {
			if (role === 'left') return pageTex[0]; // уходит под лист
			if (role === 'right') return pageTex[2]; // новая правая
			if (role === 'flipFront') return pageTex[1]; // старый правый лист
			if (role === 'flipBack') return pageTex[3]; // новая левая
		} else {
			if (role === 'left') return pageTex[3]; // новая левая
			if (role === 'right') return pageTex[1]; // уходит под лист
			if (role === 'flipFront') return pageTex[0]; // старый левый лист
			if (role === 'flipBack') return pageTex[2]; // новая правая
		}
		return null;
	};

	const paperStyle = (role) => ({
		'--paper-texture': `url(${texFor(role)})`,
	});

	// ── разметка ───────────────────────────────────────────────
	// Пока обложка не открыта — pointer-события разворота молчат.
	const spreadHandlers = coverOpened ? pointerHandlers : {};

	return (
		<div className="archivist-book-wrap">
			<button
				className="archivist-book-close"
				onClick={onClose}
				aria-label="закрыть"
			>
				×
			</button>

			<div className="book-stage">
				<div className="book-spread" {...spreadHandlers}>
					{/* Скрытый зонд: та же геометрия, что у настоящей страницы.
              Нужен только чтобы измерить pageSize через CSS. */}
					<div
						ref={pageProbeRef}
						className="book-page book-page-left"
						style={{
							visibility: 'hidden',
							position: 'absolute',
							top: 0,
							left: 0,
							pointerEvents: 'none',
						}}
						aria-hidden="true"
					>
						<div className="book-page-content" />
					</div>

					<div
						className={
							'book-page book-page-left' +
							((coverOpening || coverOpened) ? '' : ' book-page-behind-cover')
						}
						style={paperStyle('left')}
					>
						<BookPage
							page={ready ? pages[leftIdx] : null}
							pageSize={pageSize}
							spoiledAt={spoiledAt}
							fullySpoiled={fullySpoiled}
							onSpoil={onSpoil}
							onNavigate={goToEntry}
						/>
					</div>

					<div className="book-page book-page-right" style={paperStyle('right')}>
						<BookPage
							page={ready ? pages[rightIdx] : null}
							pageSize={pageSize}
							spoiledAt={spoiledAt}
							fullySpoiled={fullySpoiled}
							onSpoil={onSpoil}
							onNavigate={goToEntry}
						/>
					</div>

					{flip && ready && (
						<div
							className={`book-flip book-flip-${flip.direction}`}
							style={{
								transform: `rotateY(${flip.angle}deg)`,
								transition: flip.dragging
									? 'none'
									: `transform ${SETTLE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
							}}
						>
							<div
								className="book-flip-face book-flip-front"
								style={paperStyle('flipFront')}
							>
								<BookPage
									page={pages[flip.frontIdx]}
									pageSize={pageSize}
									spoiledAt={spoiledAt}
									fullySpoiled={fullySpoiled}
									onSpoil={onSpoil}
									onNavigate={goToEntry}
								/>
							</div>
							<div
								className="book-flip-face book-flip-back"
								style={paperStyle('flipBack')}
							>
								<BookPage
									page={pages[flip.backIdx]}
									pageSize={pageSize}
									spoiledAt={spoiledAt}
									fullySpoiled={fullySpoiled}
									onSpoil={onSpoil}
									onNavigate={goToEntry}
								/>
							</div>
						</div>
					)}

					{!coverOpened && (
						<BookCover
							coverTex={coverTex}
							opening={coverOpening}
							onOpen={openCover}
						/>
					)}
				</div>

				<BookNav
					currentSpread={currentSpread}
					totalSpreads={totalSpreads}
					canPrev={canPrev}
					canNext={canNext}
					onPrev={goPrev}
					onNext={goNext}
					disabled={!!flip}
					ready={ready}
				/>
			</div>

			{/* Замерный офскрин: каждая запись лежит в блоке высотой
          ровно в страницу. scrollWidth покажет, во сколько колонок
          она разложилась. */}
			<div ref={measureRef} className="book-measure-host" aria-hidden="true">
				{pageSize.width > 0 &&
					entries.map((entry) => (
						<div
							key={entry.id}
							data-measure-entry
							className="book-measure-entry book-page-columns-inner"
							style={{
								width: pageSize.width,
								height: pageSize.height,
								columnWidth: `${pageSize.width}px`,
								columnGap: 0,
								columnFill: 'auto',
							}}
						>
							{entry.hidden === 'spoiler' ? (
								<div style={{ height: '100%' }} />
							) : (
								<EntryFlow entry={entry} />
							)}
						</div>
					))}
			</div>
		</div>
	);
}