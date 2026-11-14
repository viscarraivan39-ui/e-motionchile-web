// ASTRA · verificación en terreno, observación preventiva del área, hallazgos y fotografías (D-032).
// Lo que declara el trabajador nunca se vuelve «verificado» solo: lo verifica en persona un responsable autorizado.
// Prevención antes que disciplina: los hallazgos se corrigen; lo disciplinario solo se deriva a revisión humana.
(function (g) {
  'use strict';
  var A = (typeof module !== 'undefined') ? require('./motor.js') : g.ASTRA;
  var C = (typeof module !== 'undefined') ? require('./cuadrilla.js') : g.ASTRA_C;
  var porId = A.porId;
  var DIFERENCIA = 'Se observa una diferencia entre el requisito declarado y la condición encontrada en terreno';
  var CAUSAS_POSIBLES = ['declaración incorrecta', 'pérdida o daño posterior del elemento', 'uso incorrecto', 'cambio de tarea'];
  var REVISAR = ['Los hechos', 'La explicación del trabajador', 'La entrega efectiva del EPP', 'Su capacitación', 'Las condiciones de supervisión'];
  var ESTADO_VERIF = { DECLARADO: 'Declarado por el trabajador', PENDIENTE_VERIFICACION: 'Pendiente de verificación', VERIFICADO: 'Verificado en terreno', INCUMPLIMIENTO: 'Incumplimiento detectado', CORREGIDO_VERIFICADO: 'Corregido y verificado nuevamente', VERIFICADO_SISTEMA: 'Verificado en la ficha', NO_APLICA: 'No aplica (documentado)' };
  // Observación preventiva del área (D-032 §3): condiciones visibles, con el significado de cada respuesta
  var PREGUNTAS = [
    { id: 'obstaculos', texto: '¿Hay obstáculos en las vías de circulación?', si: 'Hay algo que bloquea o estorba el paso', no: 'Las vías que veo están despejadas', npv: 'No lo veo desde donde estoy, o no estoy seguro' },
    { id: 'derrames', texto: '¿Se observan derrames?', si: 'Veo aceite, combustible u otro líquido derramado', no: 'No veo derrames', npv: 'No lo veo desde donde estoy, o no estoy seguro' },
    { id: 'sin_proteccion', texto: '¿Se observan personas realizando tareas sin las protecciones exigidas?', si: 'Vi a alguien trabajando sin una protección que pide su tarea', no: 'Las personas que vi usan sus protecciones', npv: 'No conozco qué protección pide esa tarea, o no lo vi bien' },
    { id: 'revisar', texto: '¿Existe alguna condición que deba revisar el encargado?', si: 'Hay algo que el encargado debería mirar (descríbelo abajo)', no: 'No veo nada que revisar', npv: 'No estoy seguro' }
  ];
  var ORIENTACION = 'Mira el área desde un lugar seguro y responde lo que puedas ver. No te acerques a una situación peligrosa, no evalúes cosas técnicas para las que no estás capacitado y nunca tomes fotos mientras alguien opera una herramienta. Esta observación no reemplaza las inspecciones del supervisor ni de Prevención, y no te hace responsable de lo que veas: solo ayuda a que alguien lo revise.';
  var T = { azar: Math.random };

  // ---------- Ayudantes ----------
  function hoy(db) { return A.ahora(db).slice(0, 10); }
  function preparar(db) {
    db.hallazgos = db.hallazgos || []; db.obsArea = db.obsArea || []; db.fotos = db.fotos || []; db.rotacion = db.rotacion || {};
    return db;
  }
  // Quién puede verificar en terreno: especializada → solo Prevención; lo demás → encargado del área, quien tenga
  // «verificar en terreno» en su alcance, o Prevención (D-032 §2)
  function puedeVerificar(db, actor, ast, verifica) {
    if (verifica === 'especializada') return actor.rol === 'prevencion';
    return actor.rol === 'prevencion' || C.esResponsable(db, ast, 'encargado_area', actor.id) || C.puede(db, actor.id, 'verificar_terreno', ast ? ast.area : null, ast ? ast.empresa : actor.empresa);
  }
  function puedeVerificarArea(db, actor, areaId) {
    return actor.rol === 'prevencion' || C.responsablesDe(db, areaId, 'encargado_area').indexOf(actor.id) >= 0 || C.puede(db, actor.id, 'verificar_terreno', areaId, actor.empresa);
  }
  function guardarFotos(db, lista, meta, actor) {
    var ids = [];
    (lista || []).forEach(function (f) {
      if (!f || ['general', 'condicion', 'correccion'].indexOf(f.tipo) < 0) throw new Error('Foto con tipo no válido');
      // D-033 §1: solo fotos tomadas en el momento con la cámara de la app; nunca archivos ni galería
      if (f.origen !== 'camara') throw new Error('Solo se aceptan fotos tomadas en el momento con la cámara de la app (no archivos ni galería)');
      if (typeof f.dataUrl !== 'string' || f.dataUrl.indexOf('data:image/') !== 0 || f.dataUrl.length > 400000) throw new Error('La foto debe ser una imagen de menos de 300 KB');
      var foto = Object.assign({ id: 'FO-' + String(db.fotos.length + 1).padStart(4, '0'), autor: actor.id, en: A.ahora(db), recibidaEn: A.ahora(db), origen: f.origen, tipo: f.tipo, dataUrl: f.dataUrl, hash: A.sha256(f.dataUrl) }, meta);
      db.fotos.push(foto); ids.push(foto.id);
    });
    return ids;
  }
  function turnoDe(db, iso) {
    var hh = +new Date(iso).toLocaleString('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', hour12: false }).slice(0, 2);
    var t = (db.config.turnos || []).filter(function (x) { return x.desde < x.hasta ? hh >= x.desde && hh < x.hasta : hh >= x.desde || hh < x.hasta; })[0];
    return t ? t.id : null;
  }
  function nuevoHallazgo(db, o) {
    var ast = o.ast ? porId(db.asts, o.ast) : null, per = o.persona ? porId(db.personas, o.persona) : null;
    var hz = Object.assign({ id: 'HZ-' + String(db.hallazgos.length + 1).padStart(3, '0'), en: A.ahora(db), turno: turnoDe(db, A.ahora(db)),
      empresa: per ? per.empresa : ast ? ast.empresa : null, tarea: ast && ast.ficha ? C.ficha(db, ast.ficha).nombre : null,
      // Antes de iniciar (verificación previa) o con el trabajo ya autorizado (ejecución)
      fase: ast && ast.estado === 'APROBADA' ? 'ejecucion' : 'verificacion_previa',
      estado: 'ABIERTO', causa: null, fotos: [], correccion: null, verificacion: null, revisionHumana: null, explicacion: null, rectificaciones: [], posiblesCausas: CAUSAS_POSIBLES.slice() }, o);
    if (!hz.requisitos) hz.requisitos = o.req ? [{ id: o.req, nombre: o.reqNombre, cita: o.cita || null, tipo: o.reqTipo || null }] : [];
    // Si ya hubo uno igual corregido, el nuevo queda vinculado al anterior (D-034 §2)
    if (hz.persona && hz.requisitos.length) {
      var prev = db.hallazgos.filter(function (x) { return x.persona === hz.persona && x.estado === 'CORREGIDO_VERIFICADO' && x.requisitos.some(function (r) { return hz.requisitos.some(function (q) { return q.id === r.id; }); }); }).slice(-1)[0];
      if (prev) hz.vinculadoA = prev.id;
    }
    db.hallazgos.push(hz);
    return hz;
  }
  function abiertoIgual(db, astId, persona, reqId) {
    return db.hallazgos.filter(function (x) { return x.ast === astId && x.persona === persona && ['ABIERTO', 'CORREGIDO_PENDIENTE_VERIFICACION'].indexOf(x.estado) >= 0 && x.requisitos.some(function (r) { return r.id === reqId; }); })[0] || null;
  }
  function avisarArea(db, areaId, empresa, tipo, texto, ast) {
    C.avisar(db, C.responsablesDe(db, areaId, 'encargado_area', empresa).concat(C.responsablesDe(db, areaId, 'prevencion', empresa)), tipo, texto, ast || null);
  }
  function rechazar(db, ev, motivo) {
    A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', ast: ev.ast || null, actor: ev.actor, datos: { intento: ev.tipo, motivo: motivo, faltantes: [] } });
    return { ok: false, motivo: motivo };
  }
  function ok(db, ev, ast, datos, extra) {
    var e = A.registrar(db, { tipo: ev.tipo, ast: ast ? ast.id : null, area: ev.area || (ast ? ast.area : null), actor: ev.actor, estadoPrevio: ast ? ast.estado : null, estadoNuevo: ast ? ast.estado : null, datos: datos || {} });
    return Object.assign({ ok: true, evento: e }, extra || {});
  }
  function detenerAst(db, ast, actor, motivo) {
    if (['CERRADA', 'ANULADA', 'DETENIDA'].indexOf(ast.estado) >= 0) return;
    C.aplicar(db, { tipo: 'C_DETENER', actor: actor.id, ast: ast.id, datos: { motivo: motivo } });
  }

  // ---------- Eventos ----------
  function aplicar(db, ev) {
    C.preparar(db); preparar(db);
    var d = ev.datos = ev.datos || {}, actor = porId(db.personas, ev.actor), ast = ev.ast ? porId(db.asts, ev.ast) : null;
    if (!actor || actor.rol === 'administrador') return rechazar(db, ev, 'Persona no habilitada');
    // D-047: una AST cerrada o anulada es inalterable: tampoco se verifica en terreno (las observaciones van aparte)
    if (ast && ['T_VERIFICAR', 'T_VERIFICAR_ENCARGADO'].indexOf(ev.tipo) >= 0) { C.cerrarVencidas(db); if (['CERRADA', 'ANULADA'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'La AST está ' + (ast.estado === 'CERRADA' ? 'cerrada' : 'anulada') + ' y ya no se cambia. Si hay algo que agregar, deja una observación aparte.'); }
    try {
      switch (ev.tipo) {
        case 'T_VERIFICAR': {
          // Verificación presencial de un requisito de una persona (D-032 §2). No es la aprobación documental.
          var i = ast && C.integrante(ast, d.persona);
          if (!i) return rechazar(db, ev, 'La persona no está en esta AST');
          var r = C.requisitosPersona(db, ast).filter(function (x) { return x.id === d.req; })[0];
          if (!r || r.nivel === 'sistema') return rechazar(db, ev, 'Ese requisito no se verifica en terreno');
          var v = (i.verif || {})[r.id];
          if (!v || ['DECLARADO', 'PENDIENTE_VERIFICACION', 'VERIFICADO'].indexOf(v.estado) < 0) return rechazar(db, ev, v && v.estado === 'INCUMPLIMIENTO' ? 'Hay un hallazgo abierto: se resuelve con la corrección y su verificación' : 'El trabajador aún no ha declarado este requisito');
          if (!d.presencial) return rechazar(db, ev, 'La verificación en terreno es presencial: una firma remota no es una inspección');
          if (!puedeVerificar(db, actor, ast, r.verifica)) return rechazar(db, ev, r.verifica === 'especializada' ? 'Esta verificación requiere intervención especializada (Prevención)' : 'Tu configuración no te permite verificar en terreno en esta área');
          var chk = d.checks || {};
          if (d.resultado === 'CUMPLE') {
            var necesarios = r.tipo === 'epp' ? ['dispone', 'condiciones', 'sabeUsar'] : ['condiciones'];
            var falta = necesarios.filter(function (k) { return chk[k] !== true; });
            if (falta.length) return rechazar(db, ev, 'Para dar por verificado hay que comprobar: ' + falta.map(function (k) { return { dispone: 'que dispone del elemento', condiciones: 'que está en buenas condiciones', sabeUsar: 'que sabe utilizarlo' }[k]; }).join(', '));
            v.estado = 'VERIFICADO'; v.por = actor.id; v.en = A.ahora(db); v.modo = 'presencial'; v.checks = chk;
            v.historial.push({ estado: 'VERIFICADO', en: A.ahora(db), por: actor.id, modo: 'presencial' });
            return ok(db, ev, ast, { persona: A.nombre(db, d.persona), req: r.nombre, resultado: 'VERIFICADO', modo: 'presencial', checks: chk });
          }
          if (d.resultado !== 'DIFERENCIA') return rechazar(db, ev, 'Resultado no válido');
          return registrarDiferencia(db, ev, actor, ast, i, r, d);
        }
        case 'T_HALLAZGO': {
          // Hallazgo directo sobre una persona (p. ej. se le ve sin la pantalla facial que declaró)
          var i2 = ast && C.integrante(ast, d.persona);
          var r2 = ast && C.requisitosPersona(db, ast).filter(function (x) { return x.id === d.req; })[0];
          if (!i2 || !r2) return rechazar(db, ev, 'Indica la persona y el requisito de esta AST');
          if (!puedeVerificar(db, actor, ast, null)) return rechazar(db, ev, 'Registra el hallazgo un responsable del área. Si eres trabajador, usa «Reportar condición insegura».');
          return registrarDiferencia(db, ev, actor, ast, i2, r2, d);
        }
        case 'T_VERIFICAR_ENCARGADO': {
          // D-033 §2–§3: primera verificación, presencial, con el chequeo breve de la tarea
          if (!ast || ['REGISTRADA'].indexOf(ast.estado) < 0) return rechazar(db, ev, 'La AST no está pendiente de verificación del encargado');
          var apE = ast.aprobaciones.filter(function (a) { return a.calidad === 'encargado_area' && a.area === ast.area && a.modo === 'presencial'; })[0];
          if (!apE) return rechazar(db, ev, 'Esta AST no tiene verificación del encargado');
          if (ast.aprobaciones.some(function (a) { return a.orden < apE.orden && a.estado !== 'APROBADA'; })) return rechazar(db, ev, 'Primero revisa el responsable del subcontrato');
          if (C.responsablesDe(db, ast.area, 'encargado_area', ast.empresa).indexOf(actor.id) < 0) return rechazar(db, ev, 'La primera verificación la hace el encargado del área');
          if (!d.presencial) return rechazar(db, ev, 'La verificación del encargado es presencial: acude al lugar del trabajo');
          var items = apE.chequeo, res = d.resultados || {};
          var sinR = items.filter(function (it) { return ['CUMPLE', 'NO_CUMPLE'].indexOf(res[it.id]) < 0; });
          if (sinR.length) return rechazar(db, ev, 'Falta registrar: ' + sinR[0].texto);
          var abiertosPrev = db.hallazgos.filter(function (x) { return x.ast === ast.id && x.origen === 'verificacion_encargado' && x.estado === 'ABIERTO'; });
          if (abiertosPrev.length) return rechazar(db, ev, 'Antes de volver a verificar, registra la corrección del hallazgo ' + abiertosPrev[0].id);
          var fotosE = guardarFotos(db, d.fotos, { area: ast.area, ast: ast.id, verificacion: 'encargado' }, actor);
          var registro = { por: actor.id, en: A.ahora(db), modo: 'presencial', items: items.map(function (it) { return { id: it.id, texto: it.texto, resultado: res[it.id] }; }), observaciones: d.observaciones || null, fotos: fotosE };
          apE.verificaciones = (apE.verificaciones || []).concat([registro]);
          var fallas = items.filter(function (it) { return res[it.id] === 'NO_CUMPLE'; });
          var firmados = ast.integrantes.filter(function (i) { return i.estado === 'FIRMADO'; });
          if (fallas.length) {
            // Bloqueo hasta corregir y volver a verificar (D-033 §3). Un evento por persona señalada; lo demás, un evento de la AST.
            var creados = [], porPersona = d.personas || {};
            fallas.filter(function (it) { return it.epp && (porPersona[it.id] || []).length; }).forEach(function (it) {
              porPersona[it.id].forEach(function (pid) {
                var i = C.integrante(ast, pid); if (!i) return;
                var r = C.requisitosPersona(db, ast).filter(function (x) { return x.id === it.req; })[0];
                var res2 = registrarDiferencia(db, { tipo: 'T_VERIFICAR', actor: actor.id, ast: ast.id }, actor, ast, i, r, { texto: 'Chequeo del encargado' + (d.observaciones ? ': ' + d.observaciones : '') });
                if (res2.hallazgo) { res2.hallazgo.origen = 'verificacion_encargado'; creados.push(res2.hallazgo); }
              });
            });
            var resto = fallas.filter(function (it) { return !(it.epp && (porPersona[it.id] || []).length); });
            if (resto.length) {
              var reqsF = C.requisitosPersona(db, ast);
              var hz = nuevoHallazgo(db, { tipo: 'INCUMPLIMIENTO_CONDICION', origen: 'verificacion_encargado', area: ast.area, ast: ast.id, persona: null, por: actor.id, alcance: 'tarea',
                requisitos: resto.map(function (it) { var r = reqsF.filter(function (x) { return x.id === it.req; })[0]; return { id: it.req || it.id, nombre: it.texto, cita: it.cita, tipo: r ? r.tipo : 'condicion' }; }),
                texto: 'Verificación del encargado: no cumple ' + resto.map(function (it) { return '«' + it.texto + '»'; }).join(', ') + (d.observaciones ? ' — ' + d.observaciones : ''), fotos: fotosE });
              creados.push(hz);
            }
            apE.estado = 'INCUMPLIMIENTO'; registro.hallazgos = creados.map(function (x) { return x.id; });
            avisarArea(db, ast.area, ast.empresa, 'HALLAZGO', 'Verificación del encargado de «' + ast.nombre + '»: incumplimiento obligatorio (' + fallas.map(function (it) { return it.texto; }).join(', ') + '). La AST sigue bloqueada hasta corregir y verificar de nuevo.', ast);
            return ok(db, ev, ast, { resultado: 'INCUMPLIMIENTO', items: registro.items, hallazgos: registro.hallazgos, fotos: fotosE }, { hallazgos: creados });
          }
          // Todo cumple: queda verificado en persona lo crítico de quienes ya firmaron; se cierran las correcciones pendientes
          items.forEach(function (it) {
            if (!it.req) return;
            firmados.forEach(function (i) {
              var v = (i.verif || {})[it.req];
              if (v && ['DECLARADO', 'PENDIENTE_VERIFICACION'].indexOf(v.estado) >= 0) { v.estado = 'VERIFICADO'; v.por = actor.id; v.en = A.ahora(db); v.modo = 'presencial'; v.historial.push({ estado: 'VERIFICADO', en: A.ahora(db), por: actor.id, modo: 'presencial', chequeo: true }); }
            });
          });
          db.hallazgos.filter(function (x) { return x.ast === ast.id && x.origen === 'verificacion_encargado' && x.estado === 'CORREGIDO_PENDIENTE_VERIFICACION'; }).forEach(function (x) {
            x.estado = 'CORREGIDO_VERIFICADO'; x.verificacion = { por: actor.id, en: A.ahora(db), modo: 'presencial', chequeo: true };
            if (x.persona) {
              var ix = C.integrante(ast, x.persona), vx = ix && (ix.verif || {})[x.requisitos[0].id];
              if (vx) { vx.estado = 'CORREGIDO_VERIFICADO'; vx.historial.push({ estado: 'CORREGIDO_VERIFICADO', en: A.ahora(db), por: actor.id, hallazgo: x.id }); }
              if (ix && !db.hallazgos.some(function (y) { return y.ast === ast.id && y.persona === x.persona && ['CORREGIDO_VERIFICADO', 'INVALIDADO'].indexOf(y.estado) < 0; })) ix.bloqueoHallazgo = null;
            }
          });
          apE.estado = 'APROBADA'; apE.firma = { por: actor.id, empresa: actor.empresa, en: A.ahora(db), modo: 'presencial', hash: A.sha256(ast.id + 'encargado' + actor.id + A.ahora(db)) };
          C.avanzar(db, ast);
          return ok(db, ev, ast, { resultado: 'VERIFICADA', items: registro.items, observaciones: registro.observaciones, fotos: fotosE, estado: C.estadoTexto(db, ast) });
        }
        case 'T_CAUSA': {
          // D-034 §4: la causa se registra cuando se revisó; nunca se infiere
          var hcz = porId(db.hallazgos, d.hallazgo);
          if (!hcz) return rechazar(db, ev, 'Hallazgo desconocido');
          if (!puedeVerificarArea(db, actor, hcz.area)) return rechazar(db, ev, 'La causa la registra un responsable del área');
          if (!d.causa) return rechazar(db, ev, 'Indica la causa revisada');
          hcz.causa = { texto: d.causa, por: actor.id, en: A.ahora(db) };
          return ok(db, Object.assign({}, ev, { area: hcz.area }), null, { hallazgo: hcz.id, causa: d.causa });
        }
        case 'T_RECTIFICAR': case 'T_INVALIDAR': {
          // D-034 §5: con motivo y trazabilidad; lo invalidado deja de contar
          var hr = porId(db.hallazgos, d.hallazgo);
          if (!hr) return rechazar(db, ev, 'Hallazgo desconocido');
          if (actor.rol !== 'prevencion') return rechazar(db, ev, 'Rectifica o invalida Prevención');
          if (!d.motivo) return rechazar(db, ev, 'Indica el motivo');
          if (ev.tipo === 'T_INVALIDAR') { hr.rectificaciones.push({ tipo: 'INVALIDADO', motivo: d.motivo, por: actor.id, en: A.ahora(db), estadoAnterior: hr.estado }); hr.estado = 'INVALIDADO'; }
          else {
            if (['texto', 'persona'].indexOf(d.campo) < 0) return rechazar(db, ev, 'Solo se rectifica el texto o la persona');
            hr.rectificaciones.push({ tipo: 'RECTIFICADO', campo: d.campo, antes: hr[d.campo], despues: d.valor, motivo: d.motivo, por: actor.id, en: A.ahora(db) });
            hr[d.campo] = d.valor;
          }
          return ok(db, Object.assign({}, ev, { area: hr.area }), null, { hallazgo: hr.id, tipo: ev.tipo, motivo: d.motivo });
        }
        case 'T_AMPLIAR_DETENCION': {
          // D-032 §5: si la condición afecta al conjunto del área, el responsable amplía la detención
          var areaId = d.area || (ast && ast.area);
          if (!puedeVerificarArea(db, actor, areaId)) return rechazar(db, ev, 'Amplía la detención el encargado del área o Prevención');
          if (!d.motivo) return rechazar(db, ev, 'Indica el motivo');
          var afectadas = db.asts.filter(function (x) { return x.modo === 'cuadrilla' && x.area === areaId && ['CERRADA', 'ANULADA', 'DETENIDA'].indexOf(x.estado) < 0; });
          afectadas.forEach(function (x) { detenerAst(db, x, actor, 'Detención del área: ' + d.motivo); });
          if (d.hallazgo) { var hz0 = porId(db.hallazgos, d.hallazgo); if (hz0) hz0.alcance = 'area'; }
          return ok(db, Object.assign({}, ev, { area: areaId }), null, { area: porId(db.areas, areaId).nombre, motivo: d.motivo, asts: afectadas.map(function (x) { return x.id; }) }, { afectadas: afectadas });
        }
        case 'T_CORREGIR': {
          var hz = porId(db.hallazgos, d.hallazgo);
          if (!hz || ['ABIERTO', 'CORRECCION_RECHAZADA'].indexOf(hz.estado) < 0) return rechazar(db, ev, 'No hay un hallazgo abierto con ese número');
          var ast2 = hz.ast ? porId(db.asts, hz.ast) : null;
          if (!puedeVerificarArea(db, actor, hz.area) && !C.puede(db, actor.id, 'gestionar_pendientes', hz.area, ast2 ? ast2.empresa : actor.empresa)) return rechazar(db, ev, 'La corrección la registra un responsable del área');
          if (!d.causa || !d.accion) return rechazar(db, ev, 'Registra la causa y la medida o protección gestionada');
          if (!hz.causa) hz.causa = { texto: d.causa, por: actor.id, en: A.ahora(db) };
          hz.correccion = { por: actor.id, en: A.ahora(db), causa: d.causa, accion: d.accion, responsable: d.responsable || actor.id, fotos: guardarFotos(db, d.fotos, { area: hz.area, ast: hz.ast, hallazgo: hz.id }, actor) };
          hz.estado = 'CORREGIDO_PENDIENTE_VERIFICACION';
          return ok(db, Object.assign({}, ev, { area: hz.area }), ast2, { hallazgo: hz.id, causa: d.causa, accion: d.accion, fotos: hz.correccion.fotos });
        }
        case 'T_VERIFICAR_CORRECCION': {
          var hc = porId(db.hallazgos, d.hallazgo);
          if (!hc || hc.estado !== 'CORREGIDO_PENDIENTE_VERIFICACION') return rechazar(db, ev, 'Primero se registra la causa y la medida; una foto o una casilla no desbloquean nada');
          var ast3 = hc.ast ? porId(db.asts, hc.ast) : null;
          var r3 = ast3 && hc.req ? C.requisitosPersona(db, ast3).filter(function (x) { return x.id === hc.req; })[0] : null;
          if (!d.presencial) return rechazar(db, ev, 'La corrección se verifica en terreno, en persona');
          if (ast3 ? !puedeVerificar(db, actor, ast3, r3 ? r3.verifica : null) : !puedeVerificarArea(db, actor, hc.area)) return rechazar(db, ev, 'Verifica la corrección el responsable autorizado');
          hc.estado = 'CORREGIDO_VERIFICADO'; hc.verificacion = { por: actor.id, en: A.ahora(db), modo: 'presencial' };
          if (hc.persona && ast3) {
            var i3 = C.integrante(ast3, hc.persona), v3 = (i3.verif || {})[hc.req];
            if (v3) { v3.estado = 'CORREGIDO_VERIFICADO'; v3.por = actor.id; v3.en = A.ahora(db); v3.modo = 'presencial'; v3.historial.push({ estado: 'CORREGIDO_VERIFICADO', en: A.ahora(db), por: actor.id, hallazgo: hc.id }); }
            var otros = db.hallazgos.filter(function (x) { return x.ast === ast3.id && x.persona === hc.persona && ['CORREGIDO_VERIFICADO', 'CERRADO'].indexOf(x.estado) < 0; });
            if (!otros.length) i3.bloqueoHallazgo = null;
          }
          avisarArea(db, hc.area, ast3 ? ast3.empresa : actor.empresa, 'HALLAZGO_CORREGIDO', 'Hallazgo ' + hc.id + ' corregido y verificado en terreno por ' + actor.nombre + '. ' + (ast3 && ast3.estado === 'DETENIDA' ? 'La AST sigue detenida hasta que el responsable la reanude.' : ''), ast3);
          return ok(db, Object.assign({}, ev, { area: hc.area }), ast3, { hallazgo: hc.id, modo: 'presencial' });
        }
        case 'T_DERIVAR': {
          // D-032 §7: solo derivación a revisión humana. La app no sanciona.
          var hd = porId(db.hallazgos, d.hallazgo);
          if (!hd) return rechazar(db, ev, 'Hallazgo desconocido');
          if (actor.rol !== 'prevencion' && !puedeVerificarArea(db, actor, hd.area)) return rechazar(db, ev, 'Deriva a revisión humana Prevención o el responsable del área');
          if (!d.motivo) return rechazar(db, ev, 'Indica por qué se deriva (p. ej. posible declaración falsa)');
          hd.revisionHumana = { estado: 'PENDIENTE', por: actor.id, en: A.ahora(db), motivo: d.motivo, revisar: REVISAR.slice(), nota: 'Sin sanción automática. Decide una persona después de revisar los antecedentes.' };
          C.avisar(db, C.responsablesDe(db, hd.area, 'prevencion'), 'REVISION_HUMANA', 'Hallazgo ' + hd.id + ' derivado a revisión humana: ' + d.motivo, hd.ast ? porId(db.asts, hd.ast) : null);
          return ok(db, Object.assign({}, ev, { area: hd.area }), null, { hallazgo: hd.id, motivo: d.motivo });
        }
        case 'T_EXPLICACION': {
          var he = porId(db.hallazgos, d.hallazgo);
          if (!he || he.persona !== actor.id) return rechazar(db, ev, 'Solo la persona del hallazgo agrega su explicación');
          if (!d.texto) return rechazar(db, ev, 'Escribe tu explicación');
          he.explicacion = { texto: d.texto, en: A.ahora(db) };
          return ok(db, Object.assign({}, ev, { area: he.area }), null, { hallazgo: he.id });
        }
        case 'T_ASIGNAR_OBSERVACIONES': {
          // D-032 §3: una por área activa al día, al azar entre los presentes que aún no participan en la rotación
          var fecha = hoy(db), creadas = [];
          db.areas.forEach(function (ar) {
            if (db.obsArea.some(function (o) { return o.area === ar.id && o.fecha === fecha; })) return;
            var activas = db.asts.filter(function (x) { return x.modo === 'cuadrilla' && x.area === ar.id && ['CERRADA', 'ANULADA', 'REVISION_DOCUMENTAL'].indexOf(x.estado) < 0; });
            if (!activas.length) return;
            var presentes = [];
            activas.forEach(function (x) { x.integrantes.forEach(function (i) { var p = porId(db.personas, i.persona); if (p && A.NIVEL[p.rol] === 'base' && presentes.indexOf(p.id) < 0) presentes.push(p.id); }); });
            if (!presentes.length) return;
            var ya = db.rotacion[ar.id] = db.rotacion[ar.id] || [];
            var cand = presentes.filter(function (p) { return ya.indexOf(p) < 0; });
            if (!cand.length) { db.rotacion[ar.id] = ya = []; cand = presentes.slice(); }
            var elegido = cand[Math.floor(T.azar() * cand.length) % cand.length];
            ya.push(elegido);
            var ob = { id: 'OP-' + String(db.obsArea.length + 1).padStart(3, '0'), area: ar.id, fecha: fecha, persona: elegido, asignadaEn: A.ahora(db), estado: 'ASIGNADA', respuestas: null, comentario: null, fotos: [], hallazgo: null };
            db.obsArea.push(ob); creadas.push(ob);
            C.avisar(db, [elegido], 'OBSERVACION_AREA', 'Te tocó la observación preventiva del área ' + ar.nombre + ' de hoy. Son 4 preguntas sobre lo que puedes ver, sin acercarte a nada peligroso.', null, { obsArea: ob.id });
          });
          return ok(db, ev, null, { fecha: fecha, asignadas: creadas.map(function (o) { return o.area + ':' + o.persona; }) }, { creadas: creadas });
        }
        case 'T_RESPONDER_OBSERVACION': {
          var ob2 = porId(db.obsArea, d.obs);
          if (!ob2 || ob2.estado !== 'ASIGNADA') return rechazar(db, ev, 'No hay una observación pendiente con ese número');
          if (ob2.persona !== actor.id) return rechazar(db, ev, 'Esta observación está asignada a otra persona. Igual puedes reportar una condición insegura.');
          var resp = d.respuestas || {};
          var sinR = PREGUNTAS.filter(function (q) { return ['SI', 'NO', 'NPV'].indexOf(resp[q.id]) < 0; });
          if (sinR.length) return rechazar(db, ev, 'Responde: ' + sinR[0].texto + ' (puedes elegir «No puedo verificar»)');
          ob2.respuestas = resp; ob2.comentario = d.comentario || null; ob2.respondidaEn = A.ahora(db); ob2.estado = 'RESPONDIDA';
          ob2.fotos = guardarFotos(db, d.fotos, { area: ob2.area, ast: null, obsArea: ob2.id }, actor);
          var si = PREGUNTAS.filter(function (q) { return resp[q.id] === 'SI'; });
          if (si.length) {
            var hz2 = nuevoHallazgo(db, { tipo: 'CONDICION_INSEGURA', origen: 'observacion', area: ob2.area, ast: null, persona: null, req: null, por: actor.id, texto: si.map(function (q) { return q.texto.replace('¿', '').replace('?', '') + ': sí'; }).join(' · ') + (d.comentario ? ' — ' + d.comentario : ''), fotos: ob2.fotos, alcance: 'area' });
            ob2.hallazgo = hz2.id;
            avisarArea(db, ob2.area, actor.empresa, 'HALLAZGO', 'Observación preventiva de ' + porId(db.areas, ob2.area).nombre + ': ' + hz2.texto + '. Revisar en terreno.', null);
          }
          C.avisar(db, C.responsablesDe(db, ob2.area, 'prevencion'), 'OBSERVACION_RESPONDIDA', 'Observación preventiva de ' + porId(db.areas, ob2.area).nombre + ' respondida' + (si.length ? ' con ' + si.length + ' condición(es) a revisar' : ' sin condiciones a revisar'), null);
          return ok(db, Object.assign({}, ev, { area: ob2.area }), null, { obs: ob2.id, respuestas: resp, hallazgo: ob2.hallazgo, fotos: ob2.fotos }, { hallazgo: ob2.hallazgo });
        }
        case 'T_REPORTAR': {
          // Cualquier persona puede reportar una condición insegura, aunque no le haya tocado la observación
          var arR = porId(db.areas, d.area);
          if (!arR) return rechazar(db, ev, 'Área desconocida');
          if (!d.texto) return rechazar(db, ev, 'Describe lo que ves');
          var hz3 = nuevoHallazgo(db, { tipo: 'CONDICION_INSEGURA', origen: 'reporte', area: arR.id, ast: d.ast || null, persona: null, req: null, por: actor.id, texto: d.texto, alcance: d.ast ? 'tarea' : 'area' });
          hz3.fotos = guardarFotos(db, d.fotos, { area: arR.id, ast: d.ast || null, hallazgo: hz3.id }, actor);
          avisarArea(db, arR.id, actor.empresa, 'HALLAZGO', 'Condición insegura reportada en ' + arR.nombre + ': ' + d.texto, d.ast ? porId(db.asts, d.ast) : null);
          return ok(db, Object.assign({}, ev, { area: arR.id }), null, { hallazgo: hz3.id, fotos: hz3.fotos }, { hallazgo: hz3 });
        }
      }
    } catch (e) { return rechazar(db, ev, e.message); }
    return rechazar(db, ev, 'Evento desconocido: ' + ev.tipo);
  }

  // Diferencia entre lo declarado y lo encontrado: hallazgo vinculado a la participación, sin borrar la declaración (D-032 §5)
  function registrarDiferencia(db, ev, actor, ast, i, r, d) {
    var v = (i.verif || (i.verif = {}))[r.id] || (i.verif[r.id] = { estado: 'DECLARADO', critico: !!r.critico, historial: [] });
    var declarado = (i.respuestas || {})[r.id] || null;
    // Revisar de nuevo un hallazgo abierto no suma un evento (D-034 §2)
    var igual = abiertoIgual(db, ast.id, i.persona, r.id);
    if (igual) return ok(db, ev, ast, { hallazgo: igual.id, repetido: true }, { hallazgo: igual, repetido: true });
    var hz = nuevoHallazgo(db, { tipo: 'DIFERENCIA_DECLARACION', origen: ev.tipo === 'T_VERIFICAR' ? 'verificacion' : 'hallazgo', area: ast.area, ast: ast.id, persona: i.persona, req: r.id, reqNombre: r.nombre, cita: r.cita, reqTipo: r.tipo, por: actor.id,
      texto: DIFERENCIA + ': «' + r.nombre + '»' + (d.texto ? ' — ' + d.texto : ''), declaracion: declarado, alcance: d.alcanceArea ? 'area' : 'participacion' });
    hz.fotos = guardarFotos(db, d.fotos, { area: ast.area, ast: ast.id, hallazgo: hz.id }, actor);
    v.estado = 'INCUMPLIMIENTO'; v.historial.push({ estado: 'INCUMPLIMIENTO', en: A.ahora(db), por: actor.id, hallazgo: hz.id });
    i.bloqueoHallazgo = hz.id;
    var per = porId(db.personas, i.persona);
    avisarArea(db, ast.area, ast.empresa, 'HALLAZGO', DIFERENCIA + ' en «' + ast.nombre + '» (' + porId(db.areas, ast.area).nombre + '): ' + per.nombre + ', ' + r.nombre + '. Su participación quedó bloqueada.' + (r.critico ? ' Detener de forma segura la tarea afectada.' : ''), ast);
    if (d.alcanceArea) aplicar(db, { tipo: 'T_AMPLIAR_DETENCION', actor: actor.id, ast: ast.id, datos: { area: ast.area, motivo: r.nombre + ' — ' + (d.texto || 'hallazgo ' + hz.id), hallazgo: hz.id } });
    return ok(db, ev, ast, { hallazgo: hz.id, persona: per.nombre, req: r.nombre, declaracionOriginal: declarado ? declarado.valor : null, alcance: hz.alcance, fotos: hz.fotos }, { hallazgo: hz });
  }

  function estadoVerif(i, reqId) { var v = (i.verif || {})[reqId]; return v ? v.estado : null; }
  function pendientesVerificacion(db, ast) {
    var out = [];
    ast.integrantes.forEach(function (i) {
      Object.keys(i.verif || {}).forEach(function (k) { var v = i.verif[k]; if (v.estado === 'PENDIENTE_VERIFICACION') out.push({ persona: i.persona, req: k, verifica: v.verifica }); });
    });
    return out;
  }
  function observacionDe(db, personaId) { preparar(db); return db.obsArea.filter(function (o) { return o.persona === personaId && o.estado === 'ASIGNADA'; }); }

  // ---------- Informes de incumplimientos (D-034) ----------
  var NUM = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
  function num(n, fem) { return n <= 10 ? (n === 1 ? (fem ? 'una' : 'uno') : NUM[n]) : String(n); }
  function puedeVerHistorial(db, actor, areaId, empresa) { return C.puede(db, actor.id, 'ver_historial', areaId, empresa); }
  function registros(db, actorId, f) {
    f = f || {}; var actor = porId(db.personas, actorId), out = [];
    // Incumplimientos observados (hallazgos con persona) y faltantes declarados antes de comenzar: se distinguen (§1)
    db.hallazgos.forEach(function (x) {
      if (!x.persona) return;
      out.push({ clase: 'OBSERVADO', id: x.id, persona: x.persona, empresa: x.empresa, turno: x.turno, en: x.en, area: x.area, ast: x.ast, tarea: x.tarea, requisitos: x.requisitos, por: x.por, fotos: x.fotos, fase: x.fase,
        causa: x.causa, correccion: x.correccion, verificacion: x.verificacion, estado: x.estado, vinculadoA: x.vinculadoA || null, valido: x.estado !== 'INVALIDADO', hallazgo: x });
    });
    db.asts.filter(function (a) { return a.modo === 'cuadrilla'; }).forEach(function (a) {
      a.faltantes.filter(function (fa) { return fa.persona; }).forEach(function (fa) {
        var p = porId(db.personas, fa.persona);
        out.push({ clase: 'DECLARADO', id: a.id + '/' + fa.id, persona: fa.persona, empresa: p.empresa, turno: turnoDe(db, fa.abiertoEn), en: fa.abiertoEn, area: a.area, ast: a.id, tarea: a.ficha ? C.ficha(db, a.ficha).nombre : null,
          requisitos: [{ id: fa.req, nombre: fa.nombre, cita: fa.cita, tipo: fa.tipo }], por: fa.persona, fotos: [], fase: 'antes_de_comenzar', causa: null, correccion: fa.gestion, verificacion: fa.confirmacion,
          estado: fa.estado === 'CONFIRMADO' ? 'CORREGIDO_VERIFICADO' : fa.estado === 'GESTIONADO' ? 'CORREGIDO_PENDIENTE_VERIFICACION' : 'ABIERTO', valido: true });
      });
    });
    return out.filter(function (r) {
      if (!puedeVerHistorial(db, actor, r.area, r.empresa) && r.persona !== actorId) return false; // §5: solo roles autorizados (o la propia persona)
      if (f.persona && r.persona !== f.persona) return false;
      if (f.turno && r.turno !== f.turno) return false;
      if (f.area && r.area !== f.area) return false;
      if (f.empresa && r.empresa !== f.empresa) return false;
      if (f.tipo && !r.requisitos.some(function (q) { return q.tipo === f.tipo; })) return false;
      if (f.clase && r.clase !== f.clase) return false;
      if (f.desde && r.en.slice(0, 10) < f.desde) return false;
      if (f.hasta && r.en.slice(0, 10) > f.hasta) return false;
      return true;
    });
  }
  function resumenPersona(db, personaId, lista, turnoId) {
    var validos = lista.filter(function (r) { return r.valido && r.clase === 'OBSERVADO'; }), porReq = {};
    validos.forEach(function (r) { r.requisitos.forEach(function (q) { porReq[q.nombre] = (porReq[q.nombre] || 0) + 1; }); });
    var turno = (db.config.turnos || []).filter(function (t) { return t.id === turnoId; })[0];
    var corr = validos.filter(function (r) { return r.estado === 'CORREGIDO_VERIFICADO'; }).length, pend = validos.length - corr;
    var cap = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    var reqTxt = Object.keys(porReq).map(function (k) { return num(porReq[k]) + ' por «' + k + '»'; });
    var reqs = validos.reduce(function (n, r) { return n + r.requisitos.length; }, 0);
    return A.nombre(db, personaId) + (turno ? ' — ' + turno.nombre : '') + ': ' + (validos.length ? cap(num(validos.length)) + ' evento' + (validos.length === 1 ? '' : 's') + ' de incumplimiento observado' + (validos.length === 1 ? '' : 's') + (reqs !== validos.length ? ' (' + reqs + ' requisitos afectados)' : '') + ': ' + reqTxt.join(', ').replace(/, ([^,]*)$/, ' y $1') + '. ' + cap(num(corr)) + ' corregido' + (corr === 1 ? '' : 's') + ' y ' + num(pend) + ' pendiente' + (pend === 1 ? '' : 's') + '.' : 'sin incumplimientos observados.');
  }

  T.aplicar = aplicar; T.preparar = preparar; T.registros = registros; T.resumenPersona = resumenPersona; T.turnoDe = turnoDe; T.puedeVerHistorial = puedeVerHistorial; T.PREGUNTAS = PREGUNTAS; T.ORIENTACION = ORIENTACION; T.ESTADO_VERIF = ESTADO_VERIF; T.DIFERENCIA = DIFERENCIA; T.REVISAR = REVISAR;
  T.estadoVerif = estadoVerif; T.pendientesVerificacion = pendientesVerificacion; T.observacionDe = observacionDe; T.puedeVerificar = puedeVerificar; T.puedeVerificarArea = puedeVerificarArea;
  if (typeof module !== 'undefined') module.exports = T; else g.ASTRA_T = T;
})(this);
