import { useAppStore } from '../../store/appStore';

const ROWS = [
  { color: 'bg-brand-400', label: 'Zona de barba — dónde debe quedar pelo' },
  { color: 'bg-danger-400', label: 'Zona a afeitar — retirar por completo' },
  { color: 'bg-accent-400', label: 'Líneas de cuello y contorno a perfilar' },
  { color: 'bg-white', label: 'Línea del bigote' },
];

/** Hoja de ayuda: cómo usar la app y qué significan los colores. */
export function HelpSheet() {
  const showHelp = useAppStore((s) => s.showHelp);
  const setShowHelp = useAppStore((s) => s.setShowHelp);

  if (!showHelp) return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Cerrar ayuda"
        onClick={() => setShowHelp(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative max-h-[80vh] overflow-y-auto rounded-t-3xl bg-ink-900 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-semibold text-white">Cómo usarla</h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm text-white/70">
          <li>1. Permite el acceso a la cámara frontal.</li>
          <li>
            2. Coloca el rostro centrado; la app detecta tu forma facial
            automáticamente.
          </li>
          <li>3. Elige uno de los 5 estilos de barba.</li>
          <li>
            4. Sigue las líneas sobre tu cara con la máquina o la cuchilla,
            mirándote en un espejo.
          </li>
        </ol>

        <h3 className="mt-5 text-sm font-semibold text-white/90">
          Qué significa cada color
        </h3>
        <ul className="mt-2 flex flex-col gap-2">
          {ROWS.map((row) => (
            <li key={row.label} className="flex items-center gap-3 text-xs text-white/60">
              <span className={`h-3 w-3 shrink-0 rounded-sm ${row.color}`} />
              <span>{row.label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[11px] leading-relaxed text-white/35">
          Consejo: usa una luz frontal uniforme y evita contraluz. Si las líneas
          saltan, acerca el rostro al centro del encuadre. Todo el procesamiento
          es local; no se envía ninguna imagen.
        </p>

        <button
          type="button"
          onClick={() => setShowHelp(false)}
          className="mt-5 w-full rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-950 active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
