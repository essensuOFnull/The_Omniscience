import React, { useCallback, useEffect, useRef, useState } from 'react';

import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import NorthWestIcon from '@mui/icons-material/NorthWest';
import NorthIcon from '@mui/icons-material/North';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import WestIcon from '@mui/icons-material/West';
import EastIcon from '@mui/icons-material/East';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import SouthIcon from '@mui/icons-material/South';
import SouthEastIcon from '@mui/icons-material/SouthEast';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';

const CELL = 20;
const GAP = 1;

const CURSORS = {
    nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
    w: 'ew-resize', e: 'ew-resize',
    sw: 'nesw-resize', s: 'ns-resize', se: 'nwse-resize',
};

const EMPTY = 'rgba(255,255,255,0.03)';
const HOVER = 'rgba(168,85,247,0.25)';

function Cell({ children, cursor, onClick, onMouseDown, title, disabled, col, row }) {
    const [hover, setHover] = useState(false);
    return (
        <div
            onMouseDown={disabled ? undefined : onMouseDown}
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: CELL, height: CELL,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hover && !disabled ? HOVER : EMPTY,
                cursor: disabled ? 'default' : (cursor || 'pointer'),
                borderRadius: 3,
                color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
                transition: 'background 0.1s',
                WebkitAppRegion: 'no-drag',
                userSelect: 'none',
                gridColumn: col, gridRow: row,
            }}
            title={title}
        >
            {children}
        </div>
    );
}

export default function ControlGrid({ activeWindow, onOpenDevTools }) {
    const iconSize = 14;

    const awRef = useRef(activeWindow);
    awRef.current = activeWindow;

    const hasWin = !!activeWindow;
    const isMaximized = !!activeWindow?.maximized;

    /* ── Начать drag/resize: один IPC, дальше main сам всё делает ── */
    const beginAction = useCallback((mode, direction) => (e) => {
        const aw = awRef.current;
        if (!aw || aw.maximized || !aw.id) return;
        e.preventDefault?.();
        e.stopPropagation?.();

        window.electron_desktop_API.invoke('native-window:begin-drag', {
            id: aw.id,
            mode,
            direction: direction || null,
        }).catch((err) => console.error('[ControlGrid] begin-drag failed:', err));
    }, []);

    /* ── Если мышь отпустили над TopBar — сообщим main'у досрочно ── */
    useEffect(() => {
        const onUp = () => {
            window.electron_desktop_API.send('native-window:end-drag', {});
        };
        document.addEventListener('mouseup', onUp);
        return () => document.removeEventListener('mouseup', onUp);
    }, []);

    /* ── Кнопки окна ── */
    const closeWin = useCallback(() => {
        const aw = awRef.current;
        if (aw?.id) window.electron_desktop_API.send('native-window:close', { id: aw.id });
    }, []);
    const minimizeWin = useCallback(() => {
        const aw = awRef.current;
        if (aw?.id) window.electron_desktop_API.send('native-window:minimize', { id: aw.id });
    }, []);
    const maximizeWin = useCallback(() => {
        const aw = awRef.current;
        if (aw?.id) window.electron_desktop_API.send('native-window:maximize', {
            id: aw.id, maximized: !!aw.maximized,
        });
    }, []);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(5, ${CELL}px)`,
            gridTemplateRows: `repeat(3, ${CELL}px)`,
            gap: GAP,
        }}>
            {/* Колонка 1: иконка / поиск / devtools */}
            <Cell col={1} row={1} title={activeWindow?.title || 'Нет активного окна'} disabled={!hasWin}>
                {activeWindow?.icon
                    ? <img src={activeWindow.icon} width={iconSize} height={iconSize} alt="" draggable={false} />
                    : <DesktopWindowsIcon style={{ fontSize: iconSize }} />}
            </Cell>

            <Cell col={1} row={2} title="Поиск / адресная строка"
                disabled={!hasWin} onClick={() => {}}>
                <SearchIcon style={{ fontSize: iconSize }} />
            </Cell>

            <Cell col={1} row={3} title="Открыть DevTools"
                disabled={!hasWin} onClick={() => onOpenDevTools?.(activeWindow?.id)}>
                <BuildIcon style={{ fontSize: iconSize }} />
            </Cell>

            {/* Колонка 2: NW / W / SW */}
            <Cell col={2} row={1} cursor={CURSORS.nw}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 'nw')} title="↖">
                <NorthWestIcon style={{ fontSize: iconSize }} />
            </Cell>
            <Cell col={2} row={2} cursor={CURSORS.w}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 'w')} title="←">
                <WestIcon style={{ fontSize: iconSize }} />
            </Cell>
            <Cell col={2} row={3} cursor={CURSORS.sw}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 'sw')} title="↙">
                <SouthWestIcon style={{ fontSize: iconSize }} />
            </Cell>

            {/* Колонка 3: N / MOVE / S */}
            <Cell col={3} row={1} cursor={CURSORS.n}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 'n')} title="↑">
                <NorthIcon style={{ fontSize: iconSize }} />
            </Cell>
            <Cell col={3} row={2} cursor="move"
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('move', null)} title="Переместить окно">
                <OpenWithIcon style={{ fontSize: Math.round(iconSize * 1.2) }} />
            </Cell>
            <Cell col={3} row={3} cursor={CURSORS.s}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 's')} title="↓">
                <SouthIcon style={{ fontSize: iconSize }} />
            </Cell>

            {/* Колонка 4: NE / E / SE */}
            <Cell col={4} row={1} cursor={CURSORS.ne}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 'ne')} title="↗">
                <NorthEastIcon style={{ fontSize: iconSize }} />
            </Cell>
            <Cell col={4} row={2} cursor={CURSORS.e}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 'e')} title="→">
                <EastIcon style={{ fontSize: iconSize }} />
            </Cell>
            <Cell col={4} row={3} cursor={CURSORS.se}
                disabled={!hasWin || isMaximized}
                onMouseDown={beginAction('resize', 'se')} title="↘">
                <SouthEastIcon style={{ fontSize: iconSize }} />
            </Cell>

            {/* Колонка 5: □ / − / × */}
            <Cell col={5} row={1} disabled={!hasWin} onClick={maximizeWin}
                title={isMaximized ? 'Восстановить' : 'На весь экран'}>
                {isMaximized
                    ? <FilterNoneIcon style={{ fontSize: iconSize }} />
                    : <CropSquareIcon style={{ fontSize: iconSize }} />}
            </Cell>
            <Cell col={5} row={2} disabled={!hasWin} onClick={minimizeWin} title="Свернуть">
                <MinimizeIcon style={{ fontSize: iconSize }} />
            </Cell>
            <Cell col={5} row={3} disabled={!hasWin} onClick={closeWin} title="Закрыть окно">
                <CloseIcon style={{ fontSize: iconSize }} />
            </Cell>
        </div>
    );
}