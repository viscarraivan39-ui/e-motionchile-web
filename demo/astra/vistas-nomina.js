// ASTRA · pantallas del control diario de cuadrillas (D-036) y de la nómina de terreno (D-037).
// La lógica está en nomina.js. El área mostrada es la del registro de la AST, no una ubicación en tiempo real.
(function () {
  'use strict';
  var A = window.ASTRA, C = window.ASTRA_C, N = window.ASTRA_N;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return N.preparar(X().db); }, yoId = function () { return X().persona; }, yo = function () { return A.porId(db().personas, yoId()); };
  var h = function (t) { return X().h(t); }, chip = function (e) { return X().chip(e); }, hora = function (i) { return X().hora(i); };
  var CHIP_E = { SIN_REGISTRO: 'mal', SIN_VIGENTE: 'aviso', INCOMPLETA: 'aviso', REQUISITOS: 'mal', APROBACION: 'aviso', HABILITADO: 'ok', BLOQUEADO: 'mal' };
  var CLASE = { registrado: '', fuera: 'Fuera del conteo (motivo informado)', justificado: 'Pendiente justificado', pendiente: 'Sin registro ni motivo', pendiente_con_motivo: 'Pendiente con motivo informado' };
  var abierto = null; // persona con el formulario de motivo abierto

  function misCuadrillas() { var me = yo(); return db().cuadrillas.filter(function (c) { return [c.responsable, c.reemplazo, c.jefatura].indexOf(me.id) >= 0 || me.rol === 'prevencion'; }); }
  function tarjetasInicio() {
    return misCuadrillas().map(function (c) {
      var s = N.situacion(db(), c.id);
      return '<a class="tarjeta enlace' + (s.pendientes.length ? ' destacada' : '') + '" href="#/cuadrilla/' + c.id + '"><b>👷 ' + h(c.nombre) + '</b><br><span class="suave">' + s.registrados.length + ' de ' + s.esperados + ' con incorporación registrada · ' + s.habilitados.length + ' habilitados · ' + s.pendientes.length + ' pendientes</span></a>';
    }).join('');
  }

  function vCuadrilla(id, persona) {
    var D = db(), cu = A.porId(D.cuadrillas, id), me = yo();
    if (!cu) return '<p>Cuadrilla no encontrada.</p>';
    if ([cu.responsable, cu.reemplazo, cu.jefatura].indexOf(me.id) < 0 && me.rol !== 'prevencion') return '<div class="mensaje mal">Este control lo ven el responsable de la cuadrilla, su reemplazo, la jefatura y Prevención.</div>';
    if (persona) abierto = persona;
    var s = N.situacion(D, id), cfg = D.config.controlCuadrillas;
    var html = '<h1>' + h(cu.nombre) + '</h1><p class="suave">Responsable ' + h(A.nombre(D, cu.responsable)) + (cu.reemplazo ? ' · reemplazo ' + h(A.nombre(D, cu.reemplazo)) : '') + ' · jefatura ' + h(A.nombre(D, cu.jefatura)) + ' · ' + s.fecha + ' ' + s.hora + '</p>' + X().mensaje() +
      '<div class="tarjeta grande-t">' + h(N.resumen(D, id)) + '</div>' +
      '<div class="kpis">' + [['Esperados', s.esperados], ['Registrados', s.registrados.length], ['Habilitados', s.habilitados.length], ['Pend. de aprobación', s.pendientesAprobacion.length], ['Pendientes', s.pendientes.length]].map(function (k) { return '<div class="kpi"><div class="n">' + k[1] + '</div><div class="suave">' + k[0] + '</div></div>'; }).join('') + '</div>' +
      '<p class="suave">Controles: primer control ' + cfg.primerControl + ', luego cada ' + cfg.cada + ' min hasta las ' + cfg.hasta + '. Sirven para detectar pendientes; no autorizan a trabajar. El área es la del registro de la AST, no una ubicación en tiempo real.</p>' +
      '<div class="fila"><button data-n-control="' + id + '">Ejecutar control ahora</button></div>';
    html += '<h2>Trabajadores</h2>' + s.filas.map(function (f) {
      var p = A.porId(D.personas, f.persona), g = f.gestion;
      var fila = '<div class="tarjeta trabajador' + (f.clase === 'pendiente' ? ' pendiente' : '') + '" id="t-' + f.persona + '"><div class="fila" style="justify-content:space-between"><b>' + h(p.nombre) + '</b><span><span class="chip ' + CHIP_E[f.estado] + '">' + h(N.ESTADO_TXT[f.estado]) + '</span></span></div>' +
        '<span class="suave">' + (f.ast ? 'Ahora: <a href="#/c/' + f.ast + '">' + f.ast + '</a> · ' + h(f.astNombre || '') + ' · registrada en ' + h(A.porId(D.areas, f.area).nombre) : f.tuvoAst ? 'Tuvo AST en el turno; ahora sin participación vigente' : 'Sin incorporación registrada a una AST en ninguna de las áreas consultadas') + '</span>' +
        ((f.participaciones || []).filter(function (x) { return x.ast !== f.ast; }).length ? '<br><span class="suave">Antes hoy: ' + f.participaciones.filter(function (x) { return x.ast !== f.ast; }).map(function (x) { return x.ast + ' (' + h(A.porId(D.areas, x.area).nombre) + ', ' + x.participacion.toLowerCase() + ')'; }).join(' · ') + ' — <a href="#/ficha/' + f.persona + '">jornada</a></span>' : '') +
        (f.clase !== 'registrado' ? '<br><span class="chip ' + (f.clase === 'pendiente' ? 'mal' : 'aviso') + '">' + h(CLASE[f.clase]) + (f.vencido ? ' · terminó el plazo' : '') + '</span>' : '') +
        (g ? '<br><span class="suave">Motivo: ' + h(N.MOTIVOS[g.motivo].txt) + (g.texto ? ' — ' + h(g.texto) : '') + (g.horaPrevista ? ' · hasta ' + g.horaPrevista : '') + (g.observacion ? ' · ' + h(g.observacion) : '') + ' · informado por ' + h(A.nombre(D, g.por)) + ' ' + hora(g.en).slice(11, 16) + '</span>' : '');
      if (f.clase !== 'registrado') {
        fila += abierto === f.persona ? '<form data-n-motivo="' + f.persona + '" data-cu="' + id + '" class="tarjeta"><b>Informar motivo</b> <span class="suave">(no incorpora ni firma por la persona)</span><select name="motivo">' + Object.keys(N.MOTIVOS).map(function (k) { return '<option value="' + k + '">' + h(N.MOTIVOS[k].txt) + '</option>'; }).join('') + '</select>' +
          '<input name="texto" placeholder="Si es «otro motivo»: descríbelo" style="margin-top:6px"><input name="observacion" placeholder="Observación (opcional)" style="margin-top:6px"><label class="campo">Hora prevista de incorporación (si corresponde)</label><input type="time" name="horaPrevista"><button class="primario" style="margin-top:8px">Guardar motivo</button></form>'
          : '<div><button data-n-abrir="' + f.persona + '">Informar motivo</button></div>';
      }
      return fila + '</div>';
    }).join('');
    if (s.excluidos.length) html += '<p class="suave">Con excepción registrada para hoy (no esperados): ' + s.excluidos.map(function (pid) { return h(A.nombre(D, pid)); }).join(', ') + '.</p>';
    // Excepciones registradas antes del turno
    html += '<form data-n-excepcion="' + id + '" class="tarjeta"><b>Registrar excepción anticipada</b> <span class="suave">(ausencia, permiso o cambio de cuadrilla: evita avisos incorrectos)</span><div class="grilla" style="margin-top:6px"><select name="persona">' + cu.integrantes.map(function (pid) { return '<option value="' + pid + '">' + h(A.nombre(D, pid)) + '</option>'; }).join('') + '</select><select name="tipo"><option value="AUSENCIA">Ausencia</option><option value="PERMISO">Permiso</option><option value="CAMBIO_CUADRILLA">Cambio de cuadrilla</option></select><input type="date" name="fecha" value="' + s.fecha + '"><select name="destino"><option value="">(destino si es cambio)</option>' + D.cuadrillas.filter(function (c) { return c.id !== id; }).map(function (c) { return '<option value="' + c.id + '">' + h(c.nombre) + '</option>'; }).join('') + '</select></div><button style="margin-top:6px">Registrar</button></form>';
    // Historial del día
    var ctls = D.nominaControles.filter(function (c) { return c.cuadrilla === id && c.fecha === s.fecha; });
    var gs = D.nominaGestiones.filter(function (x) { return x.cuadrilla === id && x.fecha === s.fecha; });
    html += '<h2>Historial de hoy</h2><div class="tarjeta tabla"><table><tr><th>Hora</th><th>Esperados</th><th>Registrados</th><th>Pendientes</th><th>Aviso</th></tr>' + ctls.map(function (c) { return '<tr><td>' + c.hora + (c.origen === 'manual' ? ' (manual)' : '') + '</td><td>' + c.esperados + '</td><td>' + c.registrados + '</td><td>' + c.pendientes.length + '</td><td class="suave">' + (c.aviso ? h(c.aviso.texto) : '— (sin cambios)') + (c.escalado ? ' · escalado a reemplazo y jefatura' : '') + '</td></tr>'; }).join('') + '</table>' +
      (gs.length ? '<b>Gestiones</b>' + gs.map(function (x) { return '<div class="mini-ast"><span>' + h(A.nombre(D, x.persona)) + ' · ' + h(N.MOTIVOS[x.motivo].txt) + ' · ' + h(A.nombre(D, x.por)) + ' ' + hora(x.en).slice(11, 16) + '</span><span class="suave">' + (x.resueltaEn ? 'resuelta ' + hora(x.resueltaEn).slice(11, 16) : 'abierta') + '</span></div>'; }).join('') : '') +
      '<p class="suave">Un retraso de registro no es una falta disciplinaria. «No asistió» es una explicación operativa del responsable, no un registro de asistencia.</p></div>';
    return html;
  }

  // Configuración: horario de control y nómina de terreno (D-036 §2, D-037)
  function seccionConfig() {
    var D = db(), me = yo(); if (me.rol !== 'prevencion' && me.rol !== 'administrador') return '';
    var cfg = D.config.controlCuadrillas;
    var html = '<h2>Control diario de cuadrillas</h2><form data-n-config class="tarjeta grilla"><label>Inicio del turno <input type="time" name="inicio" value="' + cfg.inicio + '"></label><label>Primer control <input type="time" name="primerControl" value="' + cfg.primerControl + '"></label><label>Cada (min) <input type="number" name="cada" value="' + cfg.cada + '"></label><label>Hasta <input type="time" name="hasta" value="' + cfg.hasta + '"></label><label>Recordatorio cada (min) <input type="number" name="recordatorioCada" value="' + cfg.recordatorioCada + '"></label><label>Escalar tras (min) <input type="number" name="escalarTras" value="' + cfg.escalarTras + '"></label><button class="primario">Guardar horario</button></form>';
    html += '<h2>Nómina activa de terreno</h2><p class="suave">Sin reloj control ni planillas: solo quienes participan en terreno, con su función. Las cuentas solo administrativas o de consulta no entran.</p><div class="tarjeta tabla"><table><tr><th>Persona</th><th>Función en terreno</th><th>Cuadrilla</th></tr>' + D.personas.filter(function (p) { return p.rut || p.codigo; }).map(function (p) {
      var cu = D.cuadrillas.filter(function (c) { return c.integrantes.indexOf(p.id) >= 0; })[0];
      return '<tr><td>' + h(p.nombre) + '<br><span class="suave">' + h(p.cargo) + '</span></td><td><select data-n-funcion="' + p.id + '"><option value="">— fuera de la nómina —</option>' + Object.keys(N.FUNCION_TXT).map(function (k) { return '<option value="' + k + '"' + (p.enNominaTerreno && p.funcionTerreno === k ? ' selected' : '') + '>' + h(N.FUNCION_TXT[k]) + '</option>'; }).join('') + '</select></td><td><select data-n-cuadrilla="' + p.id + '"><option value="ninguna">—</option>' + D.cuadrillas.map(function (c) { return '<option value="' + c.id + '"' + (cu && cu.id === c.id ? ' selected' : '') + '>' + h(c.nombre) + '</option>'; }).join('') + '</select></td></tr>';
    }).join('') + '</table></div>';
    return html;
  }

  function ruta(partes) { if (partes[1] === 'cuadrilla') return vCuadrilla(partes[2], partes[3]); if (partes[1] === 'cuadrillas') return '<h1>Cuadrillas</h1>' + (tarjetasInicio() || '<p class="suave">No tienes cuadrillas a cargo.</p>'); return null; }

  function act(tipo, datos, txt) { var r = N.aplicar(db(), { tipo: tipo, actor: yoId(), datos: datos }); X().setMsg(r.ok ? { ok: true, texto: txt } : { ok: false, texto: 'No se pudo: ' + r.motivo }); X().guardar(); return r; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-n-control],[data-n-abrir]'); if (!b) return; e.preventDefault();
    if (b.dataset.nControl) { var r = act('N_CONTROL', { cuadrilla: b.dataset.nControl }, 'Control ejecutado.'); if (r.ok) X().setMsg({ ok: true, texto: r.control.aviso ? 'Aviso enviado: ' + r.control.aviso.texto : 'Sin cambios desde el último aviso: no se repite.' }); X().render(); return; }
    if (b.dataset.nAbrir) { abierto = b.dataset.nAbrir; X().render(); var el = document.getElementById('t-' + abierto); if (el) el.scrollIntoView(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.nFuncion !== undefined) { act('N_NOMINA', { persona: t.dataset.nFuncion, funcion: t.value || null, enNomina: !!t.value }, 'Nómina actualizada.'); X().render(); }
    if (t.dataset && t.dataset.nCuadrilla !== undefined) { act('N_NOMINA', { persona: t.dataset.nCuadrilla, cuadrilla: t.value }, 'Cuadrilla actualizada.'); X().render(); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, ds = f.dataset; if (!Object.keys(ds).some(function (k) { return /^n[A-Z]/.test(k); })) return;
    e.preventDefault(); var fd = new FormData(f), v = function (k) { return (fd.get(k) || '').toString().trim(); };
    if (ds.nMotivo) { var r = act('N_MOTIVO', { cuadrilla: ds.cu, persona: ds.nMotivo, motivo: v('motivo'), texto: v('texto') || null, observacion: v('observacion') || null, horaPrevista: v('horaPrevista') || null }, 'Motivo registrado. No incorpora ni firma por la persona.'); if (r.ok) abierto = null; return X().render(); }
    if (ds.nExcepcion) { act('N_EXCEPCION', { persona: v('persona'), tipo: v('tipo'), fecha: v('fecha'), cuadrillaDestino: v('destino') || null }, 'Excepción registrada.'); return X().render(); }
    if (f.hasAttribute('data-n-config')) { act('N_CONFIG', { inicio: v('inicio'), primerControl: v('primerControl'), hasta: v('hasta'), cada: +v('cada'), recordatorioCada: +v('recordatorioCada'), escalarTras: +v('escalarTras') }, 'Horario de control guardado.'); return X().render(); }
  });
  // Reloj de controles mientras la app está abierta (en producción lo hace el servidor)
  setInterval(function () { try { if (!X() || !X().persona) return; var r = N.tick(db()); if (r.length) { X().guardar(); X().render(); } } catch (x) { /* nada */ } }, 30000);

  window.ASTRA_VN = { ruta: ruta, tarjetasInicio: tarjetasInicio, seccionConfig: seccionConfig };
})();
