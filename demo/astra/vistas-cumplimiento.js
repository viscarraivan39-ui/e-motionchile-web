// ASTRA · pantallas de la obra modelo «Edificio Los Aromos»: auditor de cumplimiento, MIPER y accidentes.
// SIMULACIÓN — PROTOTIPO. La lógica está en cumplimiento.js y obra-modelo.js; aquí solo se muestra.
// Teléfono primero: una tarjeta por obligación o por fila, sin tabla ancha.
(function () {
  'use strict';
  var A = window.ASTRA, K = window.ASTRA_K, OM = window.ASTRA_OM;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return X().db; }, yo = function () { return A.porId(db().personas, X().persona); };
  var h = function (t) { return X().h(t); };
  var ROLES = ['prevencion', 'jefe_terreno', 'mandante'];
  var corte = '';
  var filtro = { area: '', ficha: '', puesto: '', factor: '', nivel: '' };
  var FACTOR = { SEGURIDAD: 'Seguridad', ERGONOMICO: 'Ergonómico', PSICOSOCIAL: 'Psicosocial', VIOLENCIA_ACOSO: 'Violencia y acoso', HIGIENE_QUIMICO: 'Higiene química', HIGIENE_FISICO: 'Higiene física', HIGIENE_BIOLOGICO: 'Higiene biológica' };
  var JER = { '1_ELIMINACION': '1 · Eliminación', '2_CONTROL_FUENTE_INGENIERIA': '2 · Control en la fuente o ingeniería', '3_ADMINISTRATIVO_PTS': '3 · Administrativo (procedimiento)', '4_EPP_RESIDUAL': '4 · EPP residual' };
  var TAREA = { RUTINARIA: 'Rutinaria', NO_RUTINARIA: 'No rutinaria', EMERGENCIA: 'Emergencia' };
  var CONTROL = { PLANIFICADA: 'Planificada', EN_EJECUCION: 'En ejecución', IMPLEMENTADA: 'Implementada', VERIFICADA: 'Verificada' };
  var ACC = { ATENCION_PRIMARIA_DERIVACION: 'Atención primaria y derivación', CONSTANCIA_TRAYECTO: 'Constancia de trayecto', FAENA_SUSPENDIDA_CRITICA: 'Faena suspendida', EN_ESPERA_MEDIDAS_INMEDIATAS: 'En espera de medidas inmediatas', REANUDADA: 'Reanudada' };
  var TIPO_ACC = { LEVE: 'Leve', TRAYECTO: 'De trayecto', GRAVE: 'Grave', FATAL: 'Fatal' };

  function permitido() { var p = yo(); return !!p && ROLES.indexOf(p.rol) >= 0; }
  function mundo() { var D = db(); return !!(D && D.cumplimiento && D.escenario && D.escenario.tipo === 'obra_modelo' && D.escenario.matriz); }
  function num(x) { return x == null || x === '' || isNaN(x) ? '—' : Number(x).toLocaleString('es-CL'); }
  function hoy() { return A.ahora(db()).slice(0, 10); }
  function sumarDias(iso, n) { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00.000Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function marca() { return '<span class="por-verificar">Por verificar</span>'; }
  function nav(actual) {
    return '<nav class="aud-nav">' + [['cumplimiento', 'Auditor'], ['miper', 'MIPER'], ['accidentes', 'Accidentes']].map(function (x) {
      return '<a class="boton' + (x[0] === actual ? ' primario' : '') + '" href="#/' + x[0] + '">' + x[1] + '</a>';
    }).join('') + '</nav>';
  }
  function intro() {
    return '<p class="marca-sim"><b>SIMULACIÓN — PROTOTIPO.</b> ' + h(db().escenario.obra.nombre) + '. No es documentación aprobada para una obra real.</p>';
  }
  function guardia(titulo) {
    if (!permitido()) return '<div class="aud"><h1>' + titulo + '</h1><div class="mensaje mal"><b>Esta pantalla es para Prevención, el jefe de terreno y el mandante.</b></div></div>';
    if (!mundo() || !K || !OM) return '<div class="aud"><h1>' + titulo + '</h1><div class="mensaje"><b>Falta la obra modelo.</b> Sal de la sesión y, en el ingreso, pulsa «Cargar obra modelo Edificio Los Aromos (SIMULACIÓN — PROTOTIPO)».</div></div>';
    return null;
  }
  function txtNivel(n) { return { TOLERABLE: 'Tolerable', ACEPTABLE: 'Aceptable', MODERADO: 'Moderado', IMPORTANTE: 'Importante', INTOLERABLE: 'Intolerable', NO_ACEPTABLE: 'No aceptable' }[n] || (n || '—'); }
  function claseNivel(n) { return (n === 'ACEPTABLE' || n === 'TOLERABLE') ? 'aceptable' : n === 'MODERADO' ? 'moderado' : 'no'; }
  function etPC(met, cual, n) { var et = met && met[cual === 'p' ? 'etiquetasP' : 'etiquetasC']; return (et && et[n - 1]) ? et[n - 1].toLowerCase() : String(n); }
  function cajaNivel(titulo, nivel, valor, p, c, met) {
    return '<div><span class="suave">' + titulo + '</span><br><b class="nr nr-' + claseNivel(nivel) + '">' + txtNivel(nivel) + '</b>' +
      '<div class="suave">Probabilidad ' + etPC(met, 'p', p) + ' (' + p + ') × consecuencia ' + etPC(met, 'c', c) + ' (' + c + ') = ' + valor + '</div></div>';
  }
  function opciones(lista, actual, vacio) {
    return '<option value="">' + vacio + '</option>' + lista.map(function (x) {
      return '<option value="' + h(x[0]) + '"' + (String(actual) === String(x[0]) ? ' selected' : '') + '>' + h(x[1]) + '</option>';
    }).join('');
  }
  function unicos(lista) { var v = [], s = {}; lista.forEach(function (x) { if (x && !s[x]) { s[x] = 1; v.push(x); } }); return v; }

  // ---------- Auditor ----------
  function vCumplimiento() {
    var g = guardia('Auditor de cumplimiento'); if (g) return g;
    var D = db(), filas = K.auditar(D), al = K.alertas(D);
    var c = { CUMPLE: 0, NO_CUMPLE: 0, NO_APLICA: 0 };
    filas.forEach(function (f) { c[f.estado] = (c[f.estado] || 0) + 1; });
    var inc = al.filter(function (x) { return x.tipo === 'INCUMPLIMIENTO'; }).length;
    var avisos = al.length - inc;
    var ver = filas.filter(function (f) { return f.verificar; }).length;
    var visibles = filas.filter(function (f) {
      if (corte === 'ALERTA') return f.alertas.length > 0;
      if (corte === 'VERIFICAR') return f.verificar;
      return !corte || f.estado === corte;
    });
    var html = '<div class="aud"><h1>Auditor de cumplimiento</h1>' + intro() + nav('cumplimiento') + X().mensaje() +
      '<div class="kpis"><div class="kpi"><div class="n">' + c.CUMPLE + '</div><div class="suave">Cumple</div></div>' +
      '<div class="kpi"><div class="n">' + c.NO_CUMPLE + '</div><div class="suave">No cumple</div></div>' +
      '<div class="kpi"><div class="n">' + c.NO_APLICA + '</div><div class="suave">No aplica</div></div></div>' +
      '<p class="suave">' + filas.length + ' obligaciones · ' + inc + ' incumplimiento(s) · ' + avisos + ' alerta(s) · ' + ver + ' con marca de revisión. La norma citada sale del auditor.</p>' +
      '<div class="cortes">' + [['', 'Todas'], ['NO_CUMPLE', 'No cumple'], ['CUMPLE', 'Cumple'], ['NO_APLICA', 'No aplica'], ['ALERTA', 'Con alerta'], ['VERIFICAR', 'Por verificar']].map(function (x) {
        return '<button type="button" data-k-corte="' + x[0] + '"' + (corte === x[0] ? ' class="primario"' : '') + '>' + x[1] + '</button>';
      }).join('') + '</div>';
    html += visibles.map(function (f) {
      var pegado = f.problemas.join(' | ');
      var ir = f.id === 'K-MIPER' ? '#/miper' : (f.id === 'K-ACCIDENTES' || f.id === 'K-ESTADISTICAS' ? '#/accidentes' : '');
      return '<article class="tarjeta sem-ob sem-' + f.estado + '"><div class="fila">' +
        '<span class="chip ' + (f.estado === 'CUMPLE' ? 'ok' : f.estado === 'NO_CUMPLE' ? 'mal' : 'info') + '">' + (f.estado === 'CUMPLE' ? 'Cumple' : f.estado === 'NO_CUMPLE' ? 'No cumple' : 'No aplica') + '</span>' +
        (f.verificar ? marca() : '') + '</div><h2>' + h(f.obligacion) + '</h2><p class="norma">' + h(f.norma) + '</p>' +
        (f.detalle && f.detalle !== pegado ? '<p>' + h(f.detalle) + '</p>' : '') +
        (f.problemas.length ? '<p><b>Problemas</b></p><ul class="lista-aud problemas">' + f.problemas.map(function (p) { return '<li>' + h(p) + '</li>'; }).join('') + '</ul>' : '') +
        (f.alertas.length ? '<p><b>Alertas</b></p><ul class="lista-aud alertas">' + f.alertas.map(function (p) { return '<li>' + h(p) + '</li>'; }).join('') + '</ul>' : '') +
        (ir ? '<p><a class="boton" href="' + ir + '">' + (ir === '#/miper' ? 'Ver la MIPER' : 'Ver accidentes') + '</a></p>' : '') +
        '</article>';
    }).join('') + (visibles.length ? '' : '<p class="suave">Nada en este corte.</p>') + '</div>';
    return html;
  }

  // ---------- MIPER ----------
  function filasMiper(D) {
    var f = { area: filtro.area, ficha: filtro.ficha && filtro.ficha !== '-' ? filtro.ficha : '', puesto: filtro.puesto, factor: filtro.factor, nivel: filtro.nivel };
    var rows = OM.matrizFiltrada(D, f);
    if (filtro.ficha === '-') rows = rows.filter(function (r) { return !r.ficha; });
    return rows;
  }
  function vMiper() {
    var g = guardia('Matriz MIPER'); if (g) return g;
    var D = db(), met = D.escenario.metodologia, todas = D.escenario.matriz, rows = filasMiper(D);
    var areas = D.areas.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }).map(function (a) { return [a.id, a.nombre]; });
    var fichas = unicos(todas.map(function (r) { return r.ficha; })).sort().map(function (id) {
      var f = D.biblioteca && A.porId(D.biblioteca.fichas, id); return [id, f ? id + ' · ' + f.nombre : id];
    });
    if (todas.some(function (r) { return !r.ficha; })) fichas.unshift(['-', 'Transversales (sin ficha)']);
    var factores = unicos(todas.map(function (r) { return r.tipo_factor_riesgo; })).map(function (k) { return [k, FACTOR[k] || k]; }).sort(function (a, b) { return a[1].localeCompare(b[1], 'es'); });
    var niveles = unicos(todas.map(function (r) { return r.magnitud_nivel_riesgo; })).map(function (k) { return [k, txtNivel(k)]; });
    var err = OM.validarMiper(D);
    var html = '<div class="aud"><h1>Matriz MIPER</h1>' + intro() + nav('miper') + X().mensaje() +
      '<p>' + h(met.nombre) + (met.verificar ? ' ' + marca() : '') + '</p><p class="suave">' + h(met.nota || '') + '</p>' +
      '<p class="suave">Mostrando ' + rows.length + ' de ' + todas.length + ' filas. En el teléfono, cada fila es una tarjeta.</p>' +
      (err.length ? '<div class="mensaje mal"><b>' + err.length + ' observación(es) de formato.</b> ' + h(err[0]) + '</div>' : '') +
      '<form data-k-filtro class="tarjeta filtros"><label class="campo" for="k-area">Área</label><select id="k-area" name="area">' + opciones(areas, filtro.area, 'Todas las áreas') + '</select>' +
      '<label class="campo" for="k-ficha">Ficha</label><select id="k-ficha" name="ficha">' + opciones(fichas, filtro.ficha, 'Todas las fichas') + '</select>' +
      '<label class="campo" for="k-puesto">Puesto</label><input id="k-puesto" name="puesto" type="text" value="' + h(filtro.puesto) + '" placeholder="Ej.: jornal, soldador" autocomplete="off">' +
      '<label class="campo" for="k-factor">Factor</label><select id="k-factor" name="factor">' + opciones(factores, filtro.factor, 'Todos los factores') + '</select>' +
      '<label class="campo" for="k-nivel">Nivel de riesgo puro</label><select id="k-nivel" name="nivel">' + opciones(niveles, filtro.nivel, 'Todos los niveles') + '</select>' +
      '<div class="fila"><button class="primario" type="submit">Filtrar</button><button type="button" data-k-limpiar>Limpiar</button></div></form>';
    html += rows.map(function (r) {
      var ficha = r.ficha ? (function () { var f = D.biblioteca && A.porId(D.biblioteca.fichas, r.ficha); return f ? f.nombre : r.ficha; })() : 'Transversal';
      return '<article class="tarjeta miper-fila"><div class="fila"><b>' + h(r.id) + '</b><span class="chip">' + h(FACTOR[r.tipo_factor_riesgo] || r.tipo_factor_riesgo) + '</span></div>' +
        '<h2>' + h(r.peligro_fuente_condicion) + '</h2><p>' + h(r.riesgo_evento_dano) + '</p>' +
        '<p class="suave">' + h(r.puesto_trabajo) + ' · ' + h(ficha) + ' · ' + h(TAREA[r.tipo_tarea] || r.tipo_tarea) + '<br>' + h(r.tarea_descripcion) +
        '<br>Expuestos: ' + r.expuestos_hombres + ' hombres, ' + r.expuestos_mujeres + ' mujeres' + (r.sensibilidad_especial_genero ? ' · con sensibilidad especial' : '') + '</p>' +
        '<div class="miper-niveles">' + cajaNivel('Riesgo puro', r.magnitud_nivel_riesgo, r.magnitud_valor, r.probabilidad_pura, r.consecuencia_pura, met) +
        cajaNivel('Riesgo residual', r.nivel_riesgo_residual, r.residual_valor, r.probabilidad_residual, r.consecuencia_residual, met) + '</div>' +
        '<p><b>Jerarquía de control:</b> ' + h(JER[r.jerarquia_control_tipo] || r.jerarquia_control_tipo) + '</p>' +
        '<p>' + h(r.medida_preventiva_detalle) + '</p>' +
        (r.justificacion_epp ? '<p class="suave">' + h(r.justificacion_epp) + '</p>' : '') +
        (r.medidas_emergencia_adicionales ? '<p><b>Emergencia:</b> ' + h(r.medidas_emergencia_adicionales) + '</p>' : '') +
        '<p class="suave">Implementa: ' + h(r.responsable_implementacion) + ' · ' + h(CONTROL[r.estado_control] || r.estado_control) + ' · plazo ' + h(r.plazo_implementacion) +
        (r.procedimientos && r.procedimientos.length ? '<br>Procedimientos: ' + h(r.procedimientos.join(', ')) : '') +
        (r.permisos && r.permisos.length ? ' · permisos: ' + h(r.permisos.join(', ')) : '') + '</p></article>';
    }).join('') + (rows.length ? '' : '<p class="suave">Sin filas para ese filtro.</p>') + '</div>';
    return html;
  }

  // ---------- Accidentes y estadísticas ----------
  function plazosDe(a, cfg, f) {
    var items = [], venceDiat = new Date(new Date(a.ocurridoEn).getTime() + cfg.horasDiat * 3600000).toISOString();
    if (a.diat) items.push((a.diat.fueraDePlazo ? 'Fuera de plazo. ' : 'En plazo. ') + 'DIAT emitida a las ' + a.diat.horasDesdeAccidente + ' h (plazo ' + cfg.horasDiat + ' h).');
    else items.push('DIAT pendiente. Plazo: ' + cfg.horasDiat + ' h desde el accidente, vence ' + X().hora(venceDiat) + (A.ahora(db()) > venceDiat ? ' · fuera de plazo' : '') + '.');
    if (a.tipo === 'GRAVE' || a.tipo === 'FATAL') {
      ['DT', 'SEREMI'].forEach(function (dst) {
        var av = (a.avisos || []).filter(function (x) { return x.destino === dst; })[0];
        var nombre = dst === 'DT' ? 'la Dirección del Trabajo' : 'la Seremi';
        if (!av) items.push('Aviso a ' + nombre + ' pendiente. Plazo de la demo: ' + cfg.minutosAvisoAutoridad + ' min desde el registro.');
        else items.push('Aviso a ' + nombre + ' a los ' + av.minutosDesdeRegistro + ' min (plazo ' + cfg.minutosAvisoAutoridad + ' min' + (av.minutosDesdeRegistro > cfg.minutosAvisoAutoridad ? ', fuera de plazo' : '') + ').');
      });
      if (a.suspension && a.suspension.activa) items.push('El área sigue suspendida hasta la reanudación autorizada.');
      if (a.reanudacion) items.push('Reanudación autorizada por ' + a.reanudacion.autoridad + ', folio ' + a.reanudacion.folio + ', el ' + a.reanudacion.fecha + '.');
    }
    var limite = sumarDias(a.registradoEn, cfg.diasInvestigacion);
    if (a.investigacion) items.push('Investigación registrada a los ' + (a.investigacion.diasDesdeRegistro != null ? a.investigacion.diasDesdeRegistro : '—') + ' días (plazo ' + cfg.diasInvestigacion + ').');
    else items.push('Investigación pendiente. Plazo: ' + cfg.diasInvestigacion + ' días, hasta el ' + limite + (f > limite ? ' · fuera de plazo' : '') + '.');
    (a.medidas || []).forEach(function (m) {
      items.push('Medida ' + m.id + (m.inmediata ? ' (inmediata)' : '') + ': ' + (m.estado === 'CERRADA' ? 'cerrada' : 'pendiente') + ', plazo ' + m.plazo + (m.estado !== 'CERRADA' && m.plazo < f ? ' · vencida' : '') + '. ' + m.descripcion);
    });
    return items;
  }
  function vAccidentes() {
    var g = guardia('Accidentes'); if (g) return g;
    var D = db(), k = D.cumplimiento, cfg = k.config, est = K.estadisticas(D), f = hoy();
    var accs = (k.accidentes || []).slice().sort(function (a, b) { return a.ocurridoEn < b.ocurridoEn ? 1 : -1; });
    var html = '<div class="aud"><h1>Estadísticas y accidentes</h1>' + intro() + nav('accidentes') + X().mensaje() +
      '<p class="suave">Período: ' + (est.periodo.desde === '0000-00-00' ? 'desde el inicio de los registros' : h(est.periodo.desde)) + ' hasta el ' + h(est.periodo.hasta) + '.</p>' +
      '<div class="kpis">' + [
        ['Accidentes del trabajo', num(est.accidentesTrabajo)], ['De trayecto', num(est.accidentesTrayecto)], ['Horas-hombre', num(est.horasHombre)],
        ['Trabajadores promedio', num(est.trabajadoresPromedio)], ['Accidentabilidad', num(est.accidentabilidad)], ['Frecuencia', num(est.frecuencia)], ['Gravedad', num(est.gravedad)]
      ].map(function (x) { return '<div class="kpi"><div class="n">' + x[1] + '</div><div class="suave">' + x[0] + '</div></div>'; }).join('') + '</div>' +
      '<div class="tarjeta"><b>Por sexo</b><p>Hombres: ' + num(est.porSexo.H.accidentes) + ' accidente(s) de trabajo · ' + num(est.porSexo.H.trabajadores) + ' en la nómina.</p>' +
      '<p>Mujeres: ' + num(est.porSexo.M.accidentes) + ' accidente(s) de trabajo · ' + num(est.porSexo.M.trabajadores) + ' en la nómina.</p></div>' +
      '<p>' + marca() + ' ' + h(est.nota) + '</p>' +
      (cfg.nota ? '<p class="suave">' + h(cfg.nota) + '</p>' : '') +
      '<h2>Accidentes (' + accs.length + ')</h2>';
    if (!accs.length) html += '<div class="tarjeta"><b>Sin accidentes registrados.</b><p>La obra modelo parte con la faena al día. Cuando se registre uno, aquí ves su estado y sus plazos.</p>' +
      '<ul class="lista-aud"><li>DIAT: ' + cfg.horasDiat + ' horas desde el accidente.</li>' +
      '<li>Grave o fatal: aviso a la Dirección del Trabajo y a la Seremi. Plazo de la demo: ' + cfg.minutosAvisoAutoridad + ' minutos desde el registro. El área queda suspendida.</li>' +
      '<li>Investigación: ' + cfg.diasInvestigacion + ' días.</li><li>Cada medida lleva su propio plazo.</li></ul></div>';
    html += accs.map(function (a) {
      var per = A.porId(D.personas, a.persona), area = a.area && A.porId(D.areas, a.area), emp = A.porId(D.empresas, a.empresa);
      var grave = a.tipo === 'GRAVE' || a.tipo === 'FATAL';
      return '<article class="tarjeta sem-ob' + (grave ? ' sem-NO_CUMPLE' : '') + '"><div class="fila"><b>' + h(a.id) + '</b> <span class="chip ' + (grave ? 'mal' : 'aviso') + '">' + h(TIPO_ACC[a.tipo] || a.tipo) + '</span> <span class="chip">' + h(ACC[a.estado] || String(a.estado || '').replace(/_/g, ' ')) + '</span></div>' +
        '<p>' + h(per ? per.nombre : a.persona) + (emp ? ' · ' + h(emp.nombre) : '') + '</p>' +
        '<p class="suave">' + (area ? h(area.nombre) : 'Sin área de faena') + '<br>Ocurrió ' + X().hora(a.ocurridoEn) + ' · se registró ' + X().hora(a.registradoEn) + '</p>' +
        '<p>' + h(a.relato) + '</p><p><b>Estado y plazos</b></p><ul class="lista-aud">' + plazosDe(a, cfg, f).map(function (t) { return '<li>' + h(t) + '</li>'; }).join('') + '</ul></article>';
    }).join('') + '</div>';
    return html;
  }

  function ruta(partes) {
    if (partes[1] === 'cumplimiento') return vCumplimiento();
    if (partes[1] === 'miper') return vMiper();
    if (partes[1] === 'accidentes') return vAccidentes();
    return null;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-k-corte], [data-k-limpiar]'); if (!b || !X()) return;
    if (b.hasAttribute('data-k-limpiar')) filtro = { area: '', ficha: '', puesto: '', factor: '', nivel: '' };
    else corte = b.getAttribute('data-k-corte') || '';
    X().render();
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.hasAttribute('data-k-filtro') || !X()) return;
    e.preventDefault();
    var d = new FormData(f);
    filtro = { area: d.get('area') || '', ficha: d.get('ficha') || '', puesto: String(d.get('puesto') || '').trim(), factor: d.get('factor') || '', nivel: d.get('nivel') || '' };
    X().render();
  });
  window.ASTRA_VK = { ruta: ruta };
})();
