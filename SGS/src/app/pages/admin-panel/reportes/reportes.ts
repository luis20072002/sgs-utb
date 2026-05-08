// src/app/pages/admin-panel/reportes/reportes.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

// ─── Tipos de datos ──────────────────────────────────────────────────────────

interface Registro {
  id_registro:        number;
  id_usuario:         number;
  id_aula:            number;
  fecha_registro:     string;
  asistencia_docente: boolean;
  uso_av?:            boolean;
  observaciones?:     string | null;
}

interface Novedad {
  id_novedad:   number;
  id_registro:  number;
  descripcion:  string;
  fecha_novedad: string;
}

interface Solicitud {
  id_solicitud:       number;
  id_registro:        number;
  descripcion:        string;
  estado:             'pendiente' | 'en_proceso' | 'resuelta';
  fecha_solicitud:    string;
  fecha_resolucion?:  string | null;
  nota_resolucion?:   string | null;
}

interface Docente {
  id_docente: number;
  nombre:     string;
  apellido:   string;
  correo:     string;
  telefono:   string;
  estado:     boolean;
}

interface RegistroConDocente extends Registro {
  id_docente?: number;
  asistencia_docente: boolean;
}

interface Aula {
  id_aula:     number;
  codigo:      string;
  nombre_aula: string | null;
  piso:        number;
  id_edificio: number;
}

interface Edificio {
  id_edificio:    number;
  nombre:         string;
  codigo:         string;
}

interface UsuarioAux {
  id_usuario: number;
  nombre:     string;
  correo:     string;
}

// ─── Tipos de reporte ────────────────────────────────────────────────────────

type TipoReporte = 'registros' | 'novedades' | 'solicitudes' | 'asistencia_docente';
type FormatoExport = 'excel' | 'pdf';

interface ConfigReporte {
  tipo:        TipoReporte;
  label:       string;
  icon:        string;
  descripcion: string;
  columnas:    string[];
}

const REPORTES: ConfigReporte[] = [
  {
    tipo:        'registros',
    label:       'Registros de aula',
    icon:        'assignment',
    descripcion: 'Todos los registros de recorrido con asistencia docente y uso de A/V.',
    columnas:    ['ID', 'Fecha', 'Auxiliar', 'Aula', 'Edificio', 'Asistencia Docente', 'Uso A/V', 'Observaciones'],
  },
  {
    tipo:        'novedades',
    label:       'Novedades',
    icon:        'campaign',
    descripcion: 'Novedades reportadas por auxiliares durante sus recorridos.',
    columnas:    ['ID', 'Fecha', 'Auxiliar', 'Aula', 'Edificio', 'Descripción'],
  },
  {
    tipo:        'solicitudes',
    label:       'Solicitudes',
    icon:        'support_agent',
    descripcion: 'Solicitudes generadas, su estado actual y resolución.',
    columnas:    ['ID', 'Fecha Solicitud', 'Auxiliar', 'Aula', 'Edificio', 'Descripción', 'Estado', 'Fecha Resolución', 'Nota Resolución'],
  },
  {
    tipo:        'asistencia_docente',
    label:       'Asistencia docente',
    icon:        'school',
    descripcion: 'Resumen de asistencia e inasistencia por docente en el período.',
    columnas:    ['Docente', 'Correo', 'Total Registros', 'Asistencias', 'Inasistencias', '% Asistencia'],
  },
];

/**
 * /admin/reportes
 *
 * RF: el Administrador selecciona tipo de reporte, rango de fechas, edificio
 * y formato (Excel o PDF). El sistema genera el archivo y lo descarga.
 *
 * Generación 100% en cliente:
 *  - Excel: SheetJS (xlsx) — importado dinámicamente
 *  - PDF:   jsPDF + jspdf-autotable — importado dinámicamente
 *
 * Flujo:
 *  1. El admin configura los parámetros en el formulario.
 *  2. Al "Generar", se cargan los datos necesarios de la API.
 *  3. Se filtran en cliente según rango de fechas y edificio.
 *  4. Se construye la tabla y se descarga el archivo.
 */
@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: 'reportes.html',
  styleUrls: ['reportes.css'],
})
export class AdminReportesComponent implements OnInit {
  private fb   = inject(FormBuilder);
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  readonly REPORTES = REPORTES;

  // ── Estado ────────────────────────────────────────────────────────────────
  edificios    = signal<Edificio[]>([]);
  loadingEd    = signal(false);

  tipoSeleccionado = signal<TipoReporte | null>(null);

  generating   = signal(false);
  genError     = signal('');
  lastGenerated = signal<{ tipo: string; formato: string; filas: number } | null>(null);

  // ── Formulario ────────────────────────────────────────────────────────────
  form: FormGroup = this.fb.group({
    tipo:          ['', Validators.required],
    fecha_inicio:  ['', Validators.required],
    fecha_fin:     ['', Validators.required],
    id_edificio:   [null],
    formato:       ['excel', Validators.required],
  });

  readonly configSeleccionada = computed(() =>
    REPORTES.find(r => r.tipo === this.tipoSeleccionado()) ?? null
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarEdificios();
    // Fechas por defecto: último mes
    const hoy    = new Date();
    const inicio = new Date(hoy); inicio.setMonth(inicio.getMonth() - 1);
    this.form.patchValue({
      fecha_inicio: inicio.toISOString().slice(0, 10),
      fecha_fin:    hoy.toISOString().slice(0, 10),
    });
  }

  cargarEdificios(): void {
    this.loadingEd.set(true);
    this.http.get<Edificio[]>(`${this.base}/edificios/`).pipe(catchError(() => of([]))).subscribe(eds => {
      this.edificios.set(eds);
      this.loadingEd.set(false);
    });
  }

  selectTipo(tipo: TipoReporte): void {
    this.tipoSeleccionado.set(tipo);
    this.form.patchValue({ tipo });
    this.genError.set('');
    this.lastGenerated.set(null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Generación de reportes
  // ═══════════════════════════════════════════════════════════════════════════

  generar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.generating.set(true);
    this.genError.set('');
    this.lastGenerated.set(null);

    const { tipo, fecha_inicio, fecha_fin, id_edificio, formato } = this.form.value;
    const desde = new Date(fecha_inicio);
    const hasta = new Date(fecha_fin); hasta.setHours(23, 59, 59);

    // Cargar datos según tipo
    forkJoin({
      registros:  this.http.get<Registro[]>(`${this.base}/registros/`).pipe(catchError(() => of([]))),
      novedades:  tipo === 'novedades'  || tipo === 'registros'          ? this.http.get<Novedad[]>(`${this.base}/novedades/`).pipe(catchError(() => of([])))    : of([]),
      solicitudes: tipo === 'solicitudes'                                ? this.http.get<Solicitud[]>(`${this.base}/solicitudes/`).pipe(catchError(() => of([]))) : of([]),
      docentes:   tipo === 'asistencia_docente'                          ? this.http.get<Docente[]>(`${this.base}/docentes/`).pipe(catchError(() => of([])))      : of([]),
      aulas:      this.http.get<Aula[]>(`${this.base}/aulas/`).pipe(catchError(() => of([]))),
      usuarios:   this.http.get<UsuarioAux[]>(`${this.base}/usuarios/`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ registros, novedades, solicitudes, docentes, aulas, usuarios }) => {
        try {
          // Filtrar registros por fecha y edificio
          const regsEnRango = registros.filter(r => {
            const d = new Date(r.fecha_registro);
            if (d < desde || d > hasta) return false;
            if (id_edificio) {
              const aula = aulas.find(a => a.id_aula === r.id_aula);
              if (!aula || aula.id_edificio !== Number(id_edificio)) return false;
            }
            return true;
          });

          const regIds = new Set(regsEnRango.map(r => r.id_registro));

          let filas: any[][] = [];
          let headers: string[] = [];
          const config = REPORTES.find(c => c.tipo === tipo)!;
          headers = config.columnas;

          if (tipo === 'registros') {
            filas = this.buildRegistrosRows(regsEnRango, aulas, usuarios);
          } else if (tipo === 'novedades') {
            const novsFiltradas = (novedades as Novedad[]).filter(n => regIds.has(n.id_registro));
            filas = this.buildNovedadesRows(novsFiltradas, regsEnRango, aulas, usuarios);
          } else if (tipo === 'solicitudes') {
            const solsFiltradas = (solicitudes as Solicitud[]).filter(s => regIds.has(s.id_registro));
            filas = this.buildSolicitudesRows(solsFiltradas, regsEnRango, aulas, usuarios);
          } else if (tipo === 'asistencia_docente') {
            filas = this.buildAsistenciaDocenteRows(regsEnRango as RegistroConDocente[], docentes as Docente[]);
          }

          if (filas.length === 0) {
            this.genError.set('No hay datos para los filtros seleccionados. Prueba con otro rango de fechas o edificio.');
            this.generating.set(false);
            return;
          }

          const nombreArchivo = this.buildNombreArchivo(tipo, fecha_inicio, fecha_fin, formato);

          if (formato === 'excel') {
            this.exportarExcel(headers, filas, config.label, nombreArchivo);
          } else {
            this.exportarPDF(headers, filas, config.label, fecha_inicio, fecha_fin, nombreArchivo);
          }

          this.lastGenerated.set({ tipo: config.label, formato, filas: filas.length });
        } catch (e: any) {
          this.genError.set('Error al generar el archivo: ' + (e?.message ?? 'Error desconocido'));
        } finally {
          this.generating.set(false);
        }
      },
      error: (err) => {
        this.genError.set(err?.error?.detail || 'No se pudieron cargar los datos necesarios.');
        this.generating.set(false);
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Constructores de filas por tipo
  // ═══════════════════════════════════════════════════════════════════════════

  private buildRegistrosRows(regs: Registro[], aulas: Aula[], usuarios: UsuarioAux[]): any[][] {
    return regs.map(r => {
      const aula = aulas.find(a => a.id_aula === r.id_aula);
      const aux  = usuarios.find(u => u.id_usuario === r.id_usuario);
      return [
        r.id_registro,
        this.formatFecha(r.fecha_registro),
        aux?.nombre ?? `Usuario #${r.id_usuario}`,
        aula?.codigo ?? `Aula #${r.id_aula}`,
        aula ? `Edif. ${aula.id_edificio}` : '—',
        r.asistencia_docente ? 'Sí' : 'No',
        r.uso_av !== undefined ? (r.uso_av ? 'Sí' : 'No') : '—',
        r.observaciones ?? '',
      ];
    });
  }

  private buildNovedadesRows(
    novs: Novedad[], regs: Registro[], aulas: Aula[], usuarios: UsuarioAux[]
  ): any[][] {
    return novs.map(n => {
      const reg  = regs.find(r => r.id_registro === n.id_registro);
      const aula = reg ? aulas.find(a => a.id_aula === reg.id_aula) : undefined;
      const aux  = reg ? usuarios.find(u => u.id_usuario === reg.id_usuario) : undefined;
      return [
        n.id_novedad,
        this.formatFecha(n.fecha_novedad),
        aux?.nombre ?? '—',
        aula?.codigo ?? '—',
        aula ? `Edif. ${aula.id_edificio}` : '—',
        n.descripcion,
      ];
    });
  }

  private buildSolicitudesRows(
    sols: Solicitud[], regs: Registro[], aulas: Aula[], usuarios: UsuarioAux[]
  ): any[][] {
    const estadoMap: Record<string, string> = {
      pendiente:  'Pendiente',
      en_proceso: 'En proceso',
      resuelta:   'Resuelta',
    };
    return sols.map(s => {
      const reg  = regs.find(r => r.id_registro === s.id_registro);
      const aula = reg ? aulas.find(a => a.id_aula === reg.id_aula) : undefined;
      const aux  = reg ? usuarios.find(u => u.id_usuario === reg.id_usuario) : undefined;
      return [
        s.id_solicitud,
        this.formatFecha(s.fecha_solicitud),
        aux?.nombre ?? '—',
        aula?.codigo ?? '—',
        aula ? `Edif. ${aula.id_edificio}` : '—',
        s.descripcion,
        estadoMap[s.estado] ?? s.estado,
        s.fecha_resolucion ? this.formatFecha(s.fecha_resolucion) : '—',
        s.nota_resolucion ?? '',
      ];
    });
  }

  private buildAsistenciaDocenteRows(
    regs: RegistroConDocente[], docentes: Docente[]
  ): any[][] {
    // Agrupa por docente (usa id_docente si existe en el registro, sino no hay datos de docente)
    const map = new Map<number, { total: number; asistio: number }>();
    regs.forEach(r => {
      if (r.id_docente === undefined || r.id_docente === null) return;
      const cur = map.get(r.id_docente) ?? { total: 0, asistio: 0 };
      cur.total  += 1;
      if (r.asistencia_docente) cur.asistio += 1;
      map.set(r.id_docente, cur);
    });

    if (map.size === 0) {
      // Fallback: agregar todos los docentes con 0 registros en el rango
      return docentes.filter(d => d.estado).map(d => [
        `${d.nombre} ${d.apellido}`, d.correo, 0, 0, 0, '—',
      ]);
    }

    return Array.from(map.entries())
      .sort(([, a], [, b]) => (a.asistio / a.total) - (b.asistio / b.total))
      .map(([idDoc, v]) => {
        const doc = docentes.find(d => d.id_docente === idDoc);
        const pct = v.total > 0 ? ((v.asistio / v.total) * 100).toFixed(1) + '%' : '—';
        return [
          doc ? `${doc.nombre} ${doc.apellido}` : `Docente #${idDoc}`,
          doc?.correo ?? '—',
          v.total,
          v.asistio,
          v.total - v.asistio,
          pct,
        ];
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Exportadores
  // ═══════════════════════════════════════════════════════════════════════════

  private exportarExcel(
    headers: string[], filas: any[][], sheetName: string, nombreArchivo: string
  ): void {
    // SheetJS disponible como import en el entorno Angular (librería en package.json)
    import('xlsx').then(XLSX => {
      const wsData = [headers, ...filas];
      const ws     = XLSX.utils.aoa_to_sheet(wsData);

      // Ancho de columnas automático
      const colWidths = headers.map((h, i) => {
        const maxLen = Math.max(
          h.length,
          ...filas.map(f => String(f[i] ?? '').length)
        );
        return { wch: Math.min(maxLen + 4, 50) };
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
      XLSX.writeFile(wb, nombreArchivo);
    }).catch(() => {
      this.genError.set('No se pudo cargar la librería de Excel. Verifica que xlsx esté instalada.');
    });
  }

  private exportarPDF(
    headers: string[], filas: any[][], titulo: string,
    fechaInicio: string, fechaFin: string, nombreArchivo: string
  ): void {
    import('jspdf').then(({ jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });

        // Encabezado del documento
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`SGS — ${titulo}`, 14, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 14, 26);
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 32);
        doc.text(`Total registros: ${filas.length}`, 14, 38);
        doc.setTextColor(0);

        // Tabla
        (doc as any).autoTable({
          head:       [headers],
          body:       filas.map(f => f.map(v => v ?? '')),
          startY:     44,
          styles:     { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [59, 92, 255], fontStyle: 'bold', textColor: 255 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { left: 14, right: 14 },
        });

        // Pie de página
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
          );
        }

        doc.save(nombreArchivo);
      }).catch(() => {
        this.genError.set('No se pudo cargar jspdf-autotable. Verifica la instalación.');
      });
    }).catch(() => {
      this.genError.set('No se pudo cargar la librería jsPDF. Verifica que esté instalada.');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private buildNombreArchivo(
    tipo: string, desde: string, hasta: string, fmt: string
  ): string {
    const ext = fmt === 'excel' ? 'xlsx' : 'pdf';
    return `SGS_${tipo}_${desde}_${hasta}.${ext}`;
  }

  private formatFecha(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatoPretty(fmt: string): string {
    return fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF';
  }

  edificioNombreLabel(id: any): string {
    if (!id) return 'Todos los edificios';
    const ed = this.edificios().find(e => e.id_edificio === Number(id));
    return ed ? `${ed.nombre} (${ed.codigo})` : `Edificio #${id}`;
  }

  fieldHasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }
}