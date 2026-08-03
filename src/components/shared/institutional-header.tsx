import { useState, useRef, useEffect } from 'react';
import { LOGO_ESCUDO, LOGO_ACADEMIA, LOGO_GOBIERNO } from '@/lib/header-logos-base64';

export interface HeaderLayout {
    colLeft?: number;
    colCenter?: number;
    colRight?: number;
    escudoSize?: number;
    academiaSize?: number;
    gobiernoSize?: number;
    gobiernoWidth?: number;
    gobiernoAlign?: 'left' | 'center' | 'right';
}

export interface HeaderTexts {
    line1?: string;
    line2?: string;
    line3?: string;
    line4?: string;
    line5?: string;
    line6?: string;
    policeLabel?: string;
}

interface InstitutionalHeaderProps {
    className?: string;
    texts?: HeaderTexts;
    layout?: HeaderLayout;
    editable?: boolean;
    onLayoutChange?: (layout: HeaderLayout) => void;
}

interface ControlPanelProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    onClose: () => void;
    align?: 'left' | 'center' | 'right';
    onAlignChange?: (a: 'left' | 'center' | 'right') => void;
    position?: 'left' | 'right';
}

function ControlPanel({ label, value, min, max, onChange, onClose, align, onAlignChange, position = 'left' }: ControlPanelProps) {
    return (
        <div
            onMouseDown={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="button"
            tabIndex={0}
            style={{
                position: 'absolute',
                top: '105%',
                ...(position === 'right' ? { right: 0 } : { left: 0 }),
                zIndex: 200,
                background: '#18181b',
                border: '1.5px solid #3b82f6',
                borderRadius: 8,
                padding: '10px 14px',
                minWidth: 190,
                boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>✕</button>
            </div>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: '#a1a1aa' }}>Tamaño</span>
                    <span style={{ fontSize: 11, color: '#e4e4e7', fontWeight: 600 }}>{value}px</span>
                </div>
                <input type="range" min={min} max={max} value={value}
                    onChange={e => onChange(+e.target.value)}
                    style={{ width: '100%', accentColor: '#3b82f6', margin: '2px 0 0' }} />
            </div>
            {onAlignChange && (
                <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 5 }}>Alineación</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {(['left', 'center', 'right'] as const).map(a => (
                            <button key={a} onClick={() => onAlignChange(a)} style={{
                                flex: 1, fontSize: 14, padding: '4px 0', borderRadius: 5,
                                border: `1.5px solid ${align === a ? '#3b82f6' : '#3f3f46'}`,
                                background: align === a ? '#1d4ed8' : 'transparent',
                                color: align === a ? '#fff' : '#71717a',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                                {a === 'left' ? '←' : a === 'right' ? '→' : '↔'}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function InstitutionalHeader({ className, texts, layout, editable, onLayoutChange }: InstitutionalHeaderProps) {
    const [active, setActive] = useState<'escudo' | 'academia' | 'gobierno' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!active) return;
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setActive(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [active]);

    const t = {
        line1: texts?.line1 || "INSTITUTO SUPERIOR DE EDUCACION POLICIAL",
        line2: texts?.line2 || "Reconocido por Ley № 2946/06",
        line3: texts?.line3 || "DIRECCIÓN DE GRADO",
        line4: texts?.line4 || "ACADEMIA NACIONAL DE POLICIA GRAL. JOSÉ E. DÍAZ.",
        line5: texts?.line5 || "Avenida del Cadete y Ofic. Insp. Leongino Santacruz - Ñu Guazú – Luque",
        line6: texts?.line6 || "DIVISION DE ESTUDIO - SECCION E. FISICA",
        policeLabel: texts?.policeLabel || "POLICÍA NACIONAL"
    };

    const colLeft      = layout?.colLeft      ?? 30;
    const colCenter    = layout?.colCenter    ?? 40;
    const colRight     = layout?.colRight     ?? 30;
    const escudoSize   = layout?.escudoSize   ?? 65;
    const academiaSize = layout?.academiaSize ?? 110;
    const gobiernoSize = layout?.gobiernoSize ?? 200;
    const gobiernoWidth = layout?.gobiernoWidth ?? 620;
    const gobiernoAlign = layout?.gobiernoAlign ?? 'left';

    const govJustify = gobiernoAlign === 'left' ? 'flex-start' : gobiernoAlign === 'right' ? 'flex-end' : 'center';

    const update = (patch: Partial<HeaderLayout>) => {
        onLayoutChange?.({ colLeft, colCenter, colRight, escudoSize, academiaSize, gobiernoSize, gobiernoWidth, gobiernoAlign, ...layout, ...patch });
    };

    const toggle = (id: typeof active) => {
        if (!editable) return;
        setActive(prev => prev === id ? null : id);
    };

    const editableStyle = (id: typeof active): React.CSSProperties => editable ? {
        cursor: 'pointer',
        outline: `2px dashed ${active === id ? '#3b82f6' : 'rgba(59,130,246,0.35)'}`,
        outlineOffset: 3,
        borderRadius: 4,
        transition: 'outline-color 0.15s',
    } : {};

    return (
        <div ref={containerRef} className={className} style={{
            paddingBottom: '2px',
            marginBottom: '20px',
            fontFamily: '"Times New Roman", Times, serif',
            backgroundColor: '#fff',
            width: '100%',
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: `${colLeft}% ${colCenter}% ${colRight}%`,
                alignItems: 'center',
                marginBottom: '12px',
            }}>
                {/* Izquierda */}
                <div style={{ position: 'relative' }}>
                    <div onClick={() => toggle('escudo')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('escudo'); } }} role="button" tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: '8px', ...editableStyle('escudo') }}
                        title={editable ? 'Clic para ajustar escudo' : undefined}>
                        <img src={LOGO_ESCUDO} alt="" style={{ height: `${escudoSize}px`, width: 'auto', objectFit: 'contain' }} />
                        <p style={{ fontSize: '11pt', fontWeight: 'bold', margin: 0, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{t.policeLabel}</p>
                    </div>
                    {active === 'escudo' && (
                        <ControlPanel label="Escudo" value={escudoSize} min={30} max={120}
                            onChange={v => update({ escudoSize: v })}
                            onClose={() => setActive(null)} />
                    )}
                </div>

                {/* Centro */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div onClick={() => toggle('academia')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('academia'); } }} role="button" tabIndex={0} style={{ ...editableStyle('academia') }}
                        title={editable ? 'Clic para ajustar academia' : undefined}>
                        <img src={LOGO_ACADEMIA} alt="" style={{ height: `${academiaSize}px`, width: 'auto', objectFit: 'contain', display: 'block' }} />
                    </div>
                    {active === 'academia' && (
                        <ControlPanel label="Academia" value={academiaSize} min={50} max={160}
                            onChange={v => update({ academiaSize: v })}
                            onClose={() => setActive(null)} />
                    )}
                </div>

                {/* Derecha */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: govJustify, alignItems: 'center' }}>
                    <div onClick={() => toggle('gobierno')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('gobierno'); } }} role="button" tabIndex={0} style={{ width: '100%', ...editableStyle('gobierno') }}
                        title={editable ? 'Clic para ajustar gobierno' : undefined}>
                        {/* Aspect ratio libre manipulado a través de tamaño y ancho independientes */}
                        <img src={LOGO_GOBIERNO} alt="" style={{ 
                            height: `${gobiernoSize}px`, 
                            width: `${gobiernoWidth}px`, 
                            objectFit: 'fill', 
                            display: 'block' 
                        }} />
                    </div>
                    {active === 'gobierno' && (
                        <ControlPanel label="Gobierno" value={gobiernoSize} min={60} max={200}
                            onChange={v => update({ gobiernoSize: v })}
                            onClose={() => setActive(null)}
                            align={gobiernoAlign}
                            onAlignChange={a => update({ gobiernoAlign: a })}
                            position="right" />
                    )}
                </div>
            </div>

            <div style={{ textAlign: 'center', color: '#000', lineHeight: 1.1, marginTop: '5px' }}>
                <p style={{ fontSize: '15pt', fontWeight: 'bold', margin: '2px 0', letterSpacing: '0.01em' }}>{t.line1}</p>
                <p style={{ fontSize: '11.5pt', fontStyle: 'italic', margin: '0 0 3px', color: '#000' }}>{t.line2}</p>
                <p style={{ fontSize: '13.5pt', fontWeight: 'bold', margin: '2px 0', letterSpacing: '0.02em', textDecoration: 'underline' }}>{t.line3}</p>
                <p style={{ fontSize: '12.5pt', fontWeight: 'bold', margin: '1px 0' }}>{t.line4}</p>
                <p style={{ fontSize: '9.5pt', fontStyle: 'italic', margin: '0', color: '#444' }}>{t.line5}</p>
                <p style={{ fontSize: '11.5pt', fontWeight: 'bold', fontStyle: 'italic', margin: '2px 0' }}>{t.line6}</p>
            </div>

            {/* Doble línea divisoria característica */}
            <div style={{ marginTop: '10px', borderTop: '2px solid #003366' }}></div>
            <div style={{ marginTop: '2px', borderTop: '1px solid #003366' }}></div>
        </div>
    );
}
