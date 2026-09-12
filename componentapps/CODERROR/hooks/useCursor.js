import { useEffect, useRef } from 'react';

/**
 * Отслеживает позицию курсора относительно контейнера.
 * Возвращает ref: { x, y, active } — координаты локальные для контейнера.
 */
export function useCursor(containerRef) {
	const cursorRef = useRef({ x: -9999, y: -9999, active: false });

	useEffect(() => {
		const onMove = (e) => {
			const el = containerRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			cursorRef.current.x = e.clientX - r.left;
			cursorRef.current.y = e.clientY - r.top;
			cursorRef.current.active = true;
		};
		const onLeave = () => {
			cursorRef.current.active = false;
		};

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseout', onLeave);
		return () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseout', onLeave);
		};
	}, [containerRef]);

	return cursorRef;
}