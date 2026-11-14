// ASTRA · pantalla del escenario «Constructora Demostración SpA» (D-041) y condiciones técnicas (D-042).
// SIMULACIÓN — PROTOTIPO. La lógica está en escenario.js.
(function () {
  'use strict';
  var A = window.ASTRA, C = window.ASTRA_C, E = window.ASTRA_E;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return X().db; }, yoId = function () { return X().persona; }, yo = function () { return A.porId(db().personas, yoId()); };
  var h = function (t) { return X().h(t); };
  var filtro = { area: '', puesto: '', categoria: '' };
  var EST_PROC = { VIGENTE: ['ok', 'Aprobado para simulación'], REEMPLAZADO: ['', 'Reemplazado'], REVISION_TECNICA: ['aviso', 'En revisión técnica'], REVISION_EMPRESA: ['aviso', 'En revisión de la empresa'], BORRADOR: ['info', 'Borrador'], POR_ELABORAR: ['', 'Por elaborar'], FALTANTE: ['mal', 'Faltante (citado, no cargado)'] };
  var NIVEL_CH = { Bajo: 'ok', Medio: 'aviso', Alto: 'mal', 'Crítico': 'mal' };
  var CASOS = ['Creación e incorporación correcta a una AST', 'Requisito obligatorio declarado como faltante', 'Incumplimiento detectado durante la verificación presencial', 'Aprobación del encargado de área',
    'Revisión adicional de prevención o medio ambiente', 'Permiso especial pendiente', 'Incorporación de cuadrilla y confirmaciones individuales', 'Autorización de un subcontrato por el mandante',
    'Traslado de un trabajador entre varias áreas', 'Control de integrantes sin AST y registro del motivo', 'Fotografías capturadas exclusivamente desde la aplicación', 'Observación preventiva rotativa',
    'Hallazgos repetidos, correcciones y conteo sin duplicados', 'Cápsulas asignadas según cargo y avance individual', 'Procedimiento faltante o desactualizado', 'Sustitución de un responsable ausente',
    'Falta de conectividad y recuperación sin duplicar registros'];
  var TECNICAS = [['Identidad', 'Escribir un RUT o código solo vale en modo demo. En producción: enrolamiento presencial y credencial personal (passkey en el teléfono propio o PIN en el del capataz); el PIN se bloquea tras 3 intentos y lo desbloquea Prevención verificando en persona.'],
    ['Firmas y confirmaciones', 'Cada firma guarda persona, hora, mecanismo, teléfono usado y un hash de lo firmado. Nadie firma por otro.'],
    ['Separación entre empresas', 'Permisos con alcance (empresa, contrato, zona, área); en la versión en línea, además, aislamiento por empresa en la base de datos.'],
    ['Historial y versiones', 'Bitácora encadenada con hash, nada se borra; cada documento conserva sus versiones y cada AST la versión que usó.'],
    ['Falla de un aviso', 'Si un aviso que exige acción falla o no se atiende a tiempo, escala al reemplazo y a Prevención. Nada se aprueba por silencio.'],
    ['Sin conexión', 'Solo acciones propias (detener, recibir la información, responder, firmar, pausar o finalizar, reportar) se guardan en el teléfono y se envían sin duplicar. Aprobar, autorizar o verificar a otros exige señal.'],
    ['Vigencia de la AST', 'Vale para el turno (12 h en el escenario). Un cambio de método, equipo, lugar o un peligro nuevo obliga a responder, firmar y verificar de nuevo.']];

  function chip(cl, t) { return '<span class="chip ' + cl + '">' + h(t) + '</span>'; }
  function vEscenario() {
    var D = db(), es = D.escenario, me = yo();
    if (!es) return '<p class="suave">No hay un escenario cargado. Se carga desde la pantalla de ingreso.</p>';
    var o = es.obra, puedeEtapa = ['prevencion', 'jefe_terreno'].indexOf(me.rol) >= 0;
    var html = '<h1>Escenario de simulación</h1>' + X().mensaje() + '<div class="mensaje aviso-zona"><b>' + h(es.etiqueta) + '.</b> Datos, documentos y aprobaciones ficticios: no constituyen documentación aprobada para una obra real.</div>';
    // Obra
    html += '<h2>' + h(A.porId(D.empresas, es.codigo).nombre) + ' · ' + es.codigo + '</h2><div class="tarjeta"><b>' + h(o.nombre) + '</b> (' + o.codigo + ') · ' + h(o.descripcion) +
      '<br><b>Supuestos:</b><ul>' + o.supuestos.map(function (s) { return '<li>' + h(s) + '</li>'; }).join('') + '</ul><b>Pendiente de revisión normativa:</b><ul>' + o.pendientesNormativos.map(function (s) { return '<li>' + h(s) + '</li>'; }).join('') + '</ul>' +
      '<span class="suave">' + h(o.noAfirma) + ' ' + h(o.finalidad) + '</span><br><span class="suave">Empresas: ' + D.empresas.map(function (e) { return h(e.nombre) + ' (' + e.id + ')'; }).join(' · ') + '. Dotación de prueba: 50 personas DEMO-001 a DEMO-050 (no es una estimación del personal necesario).</span></div>';
    // Etapa y áreas
    var et = es.estado;
    html += '<h2>Etapa simulada</h2><div class="tarjeta"><b>Etapa ' + et.etapa + ': ' + h(es.etapas[et.etapa - 1].nombre) + '</b>' + (et.etapa === 7 ? ' · pisos en ejecución hasta el ' + et.pisoActual : '') +
      (puedeEtapa ? '<form data-e-etapa class="fila" style="margin-top:8px;flex-wrap:wrap"><select name="etapa">' + es.etapas.map(function (e) { return '<option value="' + e.n + '"' + (e.n === et.etapa ? ' selected' : '') + '>' + e.n + '. ' + h(e.nombre) + '</option>'; }).join('') + '</select><select name="piso">' + [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (n === et.pisoActual ? ' selected' : '') + '>Piso ' + n + '</option>'; }).join('') + '</select><button>Cambiar etapa</button></form>' : '<p class="suave">La etapa la cambia el jefe de terreno o Prevención.</p>') +
      '<div class="tabla" style="margin-top:8px"><table><tr><th>Área</th><th>Tipo</th><th>Estado</th><th>Encargado</th></tr>' + D.areas.map(function (a) {
        return '<tr><td>' + h(a.nombre) + '</td><td>' + (a.tipoArea === 'fija' ? 'fija' : 'variable') + '</td><td>' + (a.activa ? chip('ok', 'activa') : chip('', 'inactiva')) + '</td><td>' + C.responsablesDe(D, a.id, 'encargado_area', es.codigo).map(function (p) { return h(A.nombre(D, p)); }).join(', ') + ' · <a href="#/lamina/' + a.id + '">QR</a></td></tr>';
      }).join('') + '</table></div></div>';
    // Inventario
    html += '<h2>Inventario de etapas y tareas</h2><div class="tarjeta">' + es.etapas.map(function (e) {
      return '<details><summary><b>' + e.n + '. ' + h(e.nombre) + '</b> <span class="suave">(' + e.tareas.length + ' tareas' + (e.tareas.some(function (t) { return t.ficha; }) ? ', con ficha completa' : '') + ')</span></summary><ul>' + e.tareas.map(fila).join('') + '</ul></details>';
    }).join('') + '<details><summary><b>Actividades auxiliares</b></summary><ul>' + es.auxiliares.map(fila).join('') + '</ul></details></div>';
    // Procedimientos
    html += '<h2>Procedimientos</h2><div class="tarjeta tabla"><table><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Estado</th></tr>' + es.procedimientos.map(function (p) {
      var e = EST_PROC[p.estado] || ['', p.estado]; return '<tr><td>' + p.id + '</td><td>' + h(p.titulo) + '</td><td>' + p.tipo + '</td><td>' + chip(e[0], e[1]) + '</td></tr>';
    }).join('') + '</table><p class="suave">Un procedimiento puede cubrir varias tareas. Lo «por elaborar» está solo en el inventario; el ciclo de cada documento se gestiona en <a href="#/documentos">Documentos</a>.</p></div>';
    // Matriz
    var areasM = D.areas.filter(function (a) { return a.diagnostico.trabajos.length; });
    var cats = es.matriz.map(function (r) { return r.categoria; }).filter(function (c, i, l) { return l.indexOf(c) === i; });
    var filas = E.matrizFiltrada(D, filtro);
    html += '<h2>Matriz maestra</h2><p class="suave">' + h(es.metodologia.nombre) + '. ' + h(es.metodologia.nota) + '</p><form data-e-filtro class="fila" style="flex-wrap:wrap"><select name="area"><option value="">Todas las áreas</option>' + areasM.map(function (a) { return '<option value="' + a.id + '"' + (filtro.area === a.id ? ' selected' : '') + '>' + h(a.nombre) + '</option>'; }).join('') + '</select>' +
      '<input name="puesto" placeholder="Puesto o especialidad" value="' + h(filtro.puesto) + '"><select name="categoria"><option value="">Todas las categorías</option>' + cats.map(function (c) { return '<option' + (filtro.categoria === c ? ' selected' : '') + '>' + h(c) + '</option>'; }).join('') + '</select><button>Filtrar</button></form>' +
      filas.map(function (r) {
        return '<div class="tarjeta"><div class="fila" style="justify-content:space-between"><b>' + r.id + ' · ' + h(r.peligro) + '</b>' + chip(NIVEL_CH[r.evaluacion.nivel] || '', r.evaluacion.nivel + ' (' + r.evaluacion.p + '×' + r.evaluacion.c + ', supuesto)') + '</div>' +
          '<span class="suave">' + h(r.categoria) + ' · ' + h(r.tarea) + ' · ' + h(r.puesto) + ' · ' + h(r.ubicacion) + ' · expuestos: ' + h(r.expuestos) + '</span><br>Consecuencia: ' + h(r.consecuencia) + '<br>Controles existentes: ' + h(r.controles) + '<br>Medidas adicionales: ' + h(r.medidas) +
          (r.exposicion === 'NO_EVALUADA' ? '<br>' + chip('aviso', 'exposición no evaluada profesionalmente') : '') +
          '<br><span class="suave">Implementa: ' + h(r.implementa) + ' · verifica: ' + h(r.verifica) + ' · procedimientos: ' + r.procedimientos.join(', ') + (r.capacitacion.length ? ' · capacitación: ' + r.capacitacion.join(', ') : '') + (r.permisos.length ? ' · permisos: ' + r.permisos.join(', ') : '') + '</span></div>';
      }).join('') + (filas.length ? '' : '<p class="suave">Sin filas para ese filtro.</p>');
    // Ambiental
    html += '<h2>Registro de aspectos e impactos ambientales</h2><p class="suave">Separado de la evaluación de riesgos laborales.</p><div class="tarjeta tabla"><table><tr><th>Código</th><th>Aspecto</th><th>Impacto</th><th>Componente</th><th>Controles</th></tr>' + es.ambiental.map(function (r) {
      return '<tr><td>' + r.id + '</td><td>' + h(r.aspecto) + '</td><td>' + h(r.impacto) + '</td><td>' + h(r.componente) + '</td><td>' + h(r.controles) + ' <span class="suave">(' + r.documento + ')</span></td></tr>';
    }).join('') + '</table></div>';
    // Trazabilidad de los tres casos completos
    html += '<h2>Casos completos: relación entre documentos y aplicación</h2><div class="tarjeta">' + ['FT-MOL-01', 'FT-ALT-01', 'FT-MAN-01'].map(function (id) {
      var f = C.ficha(D, id), s = E.trazabilidad(D, id);
      return '<div class="mini-ast"><span><b>' + id + '</b> ' + h(f.nombre) + '<br><span class="suave">' + f.documento + ' → ' + (f.matriz || []).length + ' riesgos → ' + f.preguntas.length + ' pregunta(s) → ' + f.requisitos.length + ' requisitos → ' + f.requisitos.filter(function (r) { return r.critico; }).length + ' verificaciones críticas → ' + (f.aprobaciones.length + Object.keys(f.aprobacionesSi || {}).length) + ' aprobador(es) adicional(es) → ' + f.permisos.length + ' permiso(s)</span></span>' + (s.length ? chip('mal', s.length + ' sin fuente') : chip('ok', 'todo con fuente')) + '</div>';
    }).join('') + '</div>';
    // Casos y condiciones técnicas
    html += '<h2>Casos de prueba obligatorios</h2><div class="tarjeta"><ol>' + CASOS.map(function (c) { return '<li>' + h(c) + '</li>'; }).join('') + '</ol><p class="suave">Se comprueban de forma automática en <code>pruebas-escenario.js</code> (estados, bloqueos, avisos y registros esperados). Las aprobaciones ficticias no equivalen a una aprobación técnica.</p></div>';
    html += '<h2>Condiciones técnicas (D-042)</h2><div class="tarjeta">' + TECNICAS.map(function (t) { return '<p><b>' + h(t[0]) + ':</b> ' + h(t[1]) + '</p>'; }).join('') + '</div>';
    return html;
  }
  function fila(t) {
    return '<li>' + h(t.nombre) + ' <span class="suave">· ' + t.procedimientos.join(', ') + '</span> ' + (t.ficha ? chip('ok', 'ficha ' + t.ficha) : chip('', 'inventariada')) + '</li>';
  }

  function ruta(partes) { return partes[1] === 'escenario' ? vEscenario() : null; }
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.hasAttribute('data-e-filtro')) { e.preventDefault(); var fd = new FormData(f); filtro = { area: fd.get('area') || '', puesto: (fd.get('puesto') || '').toString().trim(), categoria: fd.get('categoria') || '' }; X().render(); return; }
    if (f.hasAttribute('data-e-etapa')) {
      e.preventDefault(); var fe = new FormData(f);
      var r = E.aplicar(db(), { tipo: 'E_ETAPA', actor: yoId(), datos: { etapa: +fe.get('etapa'), pisoActual: +fe.get('piso') } });
      X().setMsg(r.ok ? { ok: true, texto: 'Etapa cambiada: ' + r.activas.length + ' áreas activas.' } : { ok: false, texto: r.motivo }); X().guardar(); X().render();
    }
  });
  window.ASTRA_VE = { ruta: ruta };
})();
