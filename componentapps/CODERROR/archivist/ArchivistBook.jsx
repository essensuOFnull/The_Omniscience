// src/archivist/ArchivistBook.jsx
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { generatePaperTexture } from './paperTexture.js';
import {
	parseText,
	segmentsLength,
	entryTextLength,
} from './links.js';

const CLICK_THRESHOLD = 6;
const COMPLETE_THRESHOLD = 0.35;
const SETTLE_MS = 320;

const SPOIL_TOTAL_MS = 2400;
const SPOIL_MIN_PER_CHAR_MS = 8;
const SPOIL_NOTE = 'открыто раньше срока';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ─────────────────────────────────────────────────────────────
//  Ссылка. Живёт внутри текста. Клик — прыжок на запись,
//  pointerdown — не отдаём родителю, иначе страница перелистнётся.
// ─────────────────────────────────────────────────────────────
function BookLink({ entryId, children, onNavigate }) {
	return (
		<span
			className="book-link"
			role="link"
			tabIndex={0}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={(e) => {
				e.stopPropagation();
				onNavigate?.(entryId);
			}}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onNavigate?.(entryId);
				}
			}}
		>
			{children}
		</span>
	);
}

// ─────────────────────────────────────────────────────────────
//  Рендер сегментов с бюджетом видимых символов.
//
//  budget — сколько символов доступно этому куску текста.
//  Возвращает [reactNode, consumed] — второй элемент нужен
//  верхнему уровню, чтобы вычесть его из общего счётчика
//  и передать остаток следующим блокам.
// ─────────────────────────────────────────────────────────────
function renderSegments(segments, budget, onNavigate) {
	const parts = [];
	let left = budget;
	let consumed = 0;

	for (let i = 0; i < segments.length; i++) {
		const s = segments[i];
		const len = s.text.length;

		if (left <= 0) {
			// весь сегмент — скрытый хвост
			parts.push(
				<span key={`h${i}`} style={{ visibility: 'hidden' }}>
					{s.text}
				</span>
			);
			continue;
		}

		if (left >= len) {
			// полностью видим
			if (s.t === 'link') {
				parts.push(
					<BookLink key={`l${i}`} entryId={s.id} onNavigate={onNavigate}>
						{s.text}
					</BookLink>
				);
			} else {
				parts.push(s.text);
			}
			left -= len;
			consumed += len;
		} else {
			// видна только часть
			const head = s.text.slice(0, left);
			const tail = s.text.slice(left);
			if (head) parts.push(head);
			if (tail) {
				parts.push(
					<span key={`t${i}`} style={{ visibility: 'hidden' }}>
						{tail}
					</span>
				);
			}
			consumed += left;
			left = 0;
		}
	}

	return [parts, consumed];
}

// ─────────────────────────────────────────────────────────────
//  Рендер одного блока. budget — тот же контракт.
// ─────────────────────────────────────────────────────────────
function renderBlock(block, budget, onNavigate) {
	switch (block.t) {
		case 'p':
		case 'em':
		case 'strong':
		case 'quote':
		case 'pre': {
			const segments = parseText(block.text || '');
			const [node, consumed] = renderSegments(segments, budget, onNavigate);
			switch (block.t) {
				case 'p':
					return [<p key="p">{node}</p>, consumed];
				case 'em':
					return [<p key="p" className="book-em">{node}</p>, consumed];
				case 'strong':
					return [<p key="p" className="book-strong">{node}</p>, consumed];
				case 'quote':
					return [
						<blockquote key="q">
							{node}
							{block.caption && consumed >= segmentsLength(segments) && (
								<footer>{block.caption}</footer>
							)}
						</blockquote>,
						consumed,
					];
				case 'pre':
					return [<pre key="pre" className="book-pre">{node}</pre>, consumed];
			}
			return [null, 0];
		}

		case 'list': {
			const items = [];
			let left = budget;
			let consumed = 0;
			(block.items || []).forEach((it, i) => {
				const segments = parseText(it);
				const [node, c] = renderSegments(segments, left, onNavigate);
				items.push(<li key={i}>{node}</li>);
				left -= c;
				consumed += c;
			});
			const list = block.ordered ? (
				<ol key="list">{items}</ol>
			) : (
				<ul key="list">{items}</ul>
			);
			return [list, consumed];
		}

		case 'hr':
			return budget > 0 ? [<hr key="hr" />, 0] : [null, 0];

		default:
			return [null, 0];
	}
}

// ─────────────────────────────────────────────────────────────
//  Весь поток записи: заголовок + блоки. Общий бюджет символов
//  распределяется между блоками в порядке их следования.
// ─────────────────────────────────────────────────────────────
function EntryFlow({ entry, revealed = Infinity, onNavigate }) {
	const blocks = entry.blocks || [];
	let left = revealed;
	const out = [];

	if (entry.title) {
		out.push(
			<h3 key="__title" className="book-page-title">
				{entry.title}
			</h3>
		);
	}
	if (entry.subtitle) {
		out.push(
			<div key="__sub" className="book-page-subtitle">
				{entry.subtitle}
			</div>
		);
	}

	blocks.forEach((b, i) => {
		const [node, consumed] = renderBlock(b, left, onNavigate);
		if (node) out.push(<React.Fragment key={i}>{node}</React.Fragment>);
		left -= consumed;
	});

	return <>{out}</>;
}

// ─────────────────────────────────────────────────────────────
//  Контент одной страницы.
// ─────────────────────────────────────────────────────────────
function PageContent({ page, pageSize, spoiledAt, fullySpoiled, onSpoil, onNavigate }) {
	if (!page) {
		return <div className="book-page-content book-page-empty">·</div>;
	}
	const { entry, columnIndex } = page;

	if (entry.hidden === 'spoiler') {
		return (
			<SpoilerEntry
				entry={entry}
				alreadySpoiled={!!fullySpoiled || !!spoiledAt?.[entry.id]}
				onSpoil={onSpoil}
				onNavigate={onNavigate}
			/>
		);
	}

	return (
		<div className="book-page-content">
			<div className="book-page-columns-outer">
				<div
					className="book-page-columns-inner"
					style={{
						columnWidth: `${pageSize.width}px`,
						columnGap: 0,
						columnFill: 'auto',
						transform: `translateX(${-columnIndex * pageSize.width}px)`,
					}}
				>
					<EntryFlow entry={entry} onNavigate={onNavigate} />
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
//  Скрытая запись.
// ─────────────────────────────────────────────────────────────
function SpoilerEntry({ entry, alreadySpoiled, onSpoil, onNavigate }) {
	const [open, setOpen] = useState(!!alreadySpoiled);
	const [revealed, setRevealed] = useState(alreadySpoiled ? Infinity : 0);

	const totalChars = useMemo(() => entryTextLength(entry), [entry]);

	useEffect(() => {
		if (!open || alreadySpoiled) {
			setRevealed(Infinity);
			return;
		}
		const perChar = SPOIL_TOTAL_MS / Math.max(1, totalChars);
		if (perChar < SPOIL_MIN_PER_CHAR_MS) {
			setRevealed(totalChars);
			return;
		}
		let i = 0;
		const t = setInterval(() => {
			i++;
			setRevealed(i);
			if (i >= totalChars) clearInterval(t);
		}, perChar);
		return () => clearInterval(t);
	}, [open, alreadySpoiled, totalChars]);

	if (!open) {
		return (
			<div
				className="book-page-content book-page-spoiler"
				role="button"
				tabIndex={0}
				onPointerDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.stopPropagation();
					setOpen(true);
					onSpoil?.(entry.id);
				}}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						setOpen(true);
						onSpoil?.(entry.id);
					}
				}}
			>
				<div className="book-spoiler-rect" aria-label="запись" />
			</div>
		);
	}

	const done = revealed >= totalChars;

	return (
		<div className="book-page-content book-page-spoiler-open">
			<EntryFlow entry={entry} revealed={revealed} onNavigate={onNavigate} />
			{done && <div className="book-spoiler-note">{SPOIL_NOTE}</div>}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
//  Замер и разбиение на страницы.
// ─────────────────────────────────────────────────────────────
function useBookPages(entries, pageSize) {
	const measureRef = useRef(null);
	const [pages, setPages] = useState(null);

	useLayoutEffect(() => {
		if (!pageSize.width || !pageSize.height) return;
		const host = measureRef.current;
		if (!host) return;

		const nodes = host.querySelectorAll('[data-measure-entry]');
		const result = [];
		entries.forEach((entry, i) => {
			const el = nodes[i];
			const cols = el
				? Math.max(1, Math.round(el.scrollWidth / pageSize.width))
				: 1;
			for (let c = 0; c < cols; c++) {
				result.push({ entry, columnIndex: c, totalColumns: cols });
			}
		});
		setPages(result);
	}, [entries, pageSize.width, pageSize.height]);

	return { pages, measureRef };
}

// ─────────────────────────────────────────────────────────────
//  Книга.
// ─────────────────────────────────────────────────────────────
export default function ArchivistBook({
	entries,
	spoiledAt = {},
	fullySpoiled = false,
	onSpoil,
	onClose,
}) {
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

	const { pages, measureRef } = useBookPages(entries, pageSize);
	const ready = pages && pages.length > 0;

	// ── замерный офскрин ─────────────────────────────────────────
	const measureLayer = (
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
	);

	// ── флип ─────────────────────────────────────────────────────
	const [leftIdx, setLeftIdx] = useState(0);
	const [rightIdx, setRightIdx] = useState(1);
	const [flip, setFlip] = useState(null);
	const dragRef = useRef(null);
	const settleTimerRef = useRef(null);

	useEffect(() => {
		const tex = generatePaperTexture(512, 512);
		document.documentElement.style.setProperty(
			'--paper-texture',
			`url(${tex})`
		);
	}, []);

	useEffect(() => () => clearTimeout(settleTimerRef.current), []);

	useEffect(() => {
		setLeftIdx(0);
		setRightIdx(1);
		setFlip(null);
	}, [entries]);

	const totalSpreads = ready ? Math.ceil(pages.length / 2) : 0;
	const currentSpread = rightIdx >> 1;
	const canPrev = ready && leftIdx > 0;
	const canNext = ready && currentSpread + 1 < totalSpreads;

	// ── навигация по ссылкам ────────────────────────────────────
	// Прыгаем на разворот, где запись начинается. Первая колонка.
	// Если запись короткая и уже видна — всё равно прыгаем; это
	// предсказуемее, чем «ничего не произошло».
	const goToEntry = useCallback(
		(id) => {
			if (!ready) return;
			const idx = pages.findIndex(
				(p) => p.entry.id === id && p.columnIndex === 0
			);
			if (idx < 0) {
				console.warn('[archivist] ссылка ведёт в никуда:', id);
				return;
			}
			const spreadStart = idx % 2 === 0 ? idx : idx - 1;
			const right = Math.min(spreadStart + 1, pages.length - 1);
			setLeftIdx(spreadStart);
			setRightIdx(right);
			setFlip(null);
		},
		[pages, ready]
	);

	const beginFlip = (direction) => {
		if (direction === 'next') {
			if (!canNext) return;
			setRightIdx(rightIdx + 2);
			setFlip({
				direction,
				frontIdx: rightIdx,
				backIdx: rightIdx + 1,
				angle: 0,
				dragging: false,
			});
		} else {
			if (!canPrev) return;
			setLeftIdx(leftIdx - 2);
			setFlip({
				direction,
				frontIdx: leftIdx,
				backIdx: leftIdx - 1,
				angle: 0,
				dragging: false,
			});
		}
	};

	const settleComplete = () => {
		setFlip((f) => {
			if (!f) return null;
			if (f.direction === 'next') setLeftIdx(f.backIdx);
			else setRightIdx(f.backIdx);
			return null;
		});
	};

	const settleCancel = () => {
		setFlip((f) => {
			if (!f) return null;
			if (f.direction === 'next') setRightIdx(f.frontIdx);
			else setLeftIdx(f.frontIdx);
			return null;
		});
	};

	const animateTo = (targetAngle, onDone) => {
		setFlip((f) =>
			f ? { ...f, angle: targetAngle, dragging: false } : null
		);
		clearTimeout(settleTimerRef.current);
		settleTimerRef.current = setTimeout(onDone, SETTLE_MS);
	};

	const flyFlip = (direction) => {
		const target = direction === 'next' ? -180 : 180;
		beginFlip(direction);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				animateTo(target, settleComplete);
			});
		});
	};

	const goNext = () => {
		if (!canNext || flip) return;
		flyFlip('next');
	};

	const goPrev = () => {
		if (!canPrev || flip) return;
		flyFlip('prev');
	};

	const onPointerDown = (e) => {
		if (flip || !ready) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const isRight = e.clientX - rect.left >= rect.width / 2;
		if (isRight && !canNext) return;
		if (!isRight && !canPrev) return;

		dragRef.current = {
			side: isRight ? 'next' : 'prev',
			startX: e.clientX,
			halfWidth: rect.width / 2,
			moved: false,
		};
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e) => {
		const d = dragRef.current;
		if (!d) return;
		const dx = e.clientX - d.startX;

		if (!d.moved) {
			if (Math.abs(dx) < CLICK_THRESHOLD) return;
			d.moved = true;
			beginFlip(d.side);
		}

		const progress =
			d.side === 'next'
				? clamp01(-dx / d.halfWidth)
				: clamp01(dx / d.halfWidth);
		const angle = d.side === 'next' ? -180 * progress : 180 * progress;

		setFlip((f) => (f ? { ...f, angle, dragging: true } : f));
	};

	const onPointerUp = (e) => {
		const d = dragRef.current;
		if (!d) return;
		dragRef.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}

		if (!d.moved) {
			flyFlip(d.side);
			return;
		}

		setFlip((f) => {
			if (!f) return null;
			const progress = Math.abs(f.angle) / 180;
			const complete = progress > COMPLETE_THRESHOLD;
			const target = complete
				? f.direction === 'next'
					? -180
					: 180
				: 0;

			clearTimeout(settleTimerRef.current);
			settleTimerRef.current = setTimeout(
				complete ? settleComplete : settleCancel,
				SETTLE_MS
			);

			return { ...f, angle: target, dragging: false };
		});
	};

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
				<div
					className="book-spread"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
				>
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

					<div className="book-page book-page-left">
						<PageContent
							page={ready ? pages[leftIdx] : null}
							pageSize={pageSize}
							spoiledAt={spoiledAt}
							fullySpoiled={fullySpoiled}
							onSpoil={onSpoil}
							onNavigate={goToEntry}
						/>
					</div>
					<div className="book-page book-page-right">
						<PageContent
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
							<div className="book-flip-face book-flip-front">
								<PageContent
									page={pages[flip.frontIdx]}
									pageSize={pageSize}
									spoiledAt={spoiledAt}
									fullySpoiled={fullySpoiled}
									onSpoil={onSpoil}
									onNavigate={goToEntry}
								/>
							</div>
							<div className="book-flip-face book-flip-back">
								<PageContent
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
				</div>

				<div className="book-nav">
					<button onClick={goPrev} disabled={!canPrev || !!flip} aria-label="назад">
						←
					</button>
					<span className="book-nav-pager">
						{ready ? `${currentSpread + 1} / ${totalSpreads}` : '…'}
					</span>
					<button onClick={goNext} disabled={!canNext || !!flip} aria-label="вперёд">
						→
					</button>
				</div>
			</div>

			{measureLayer}
		</div>
	);
}