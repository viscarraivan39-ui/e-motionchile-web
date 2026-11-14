// ASTRA · trabajo sin conexión y recuperación sin duplicar registros (D-042 §6).
// Cada acción hecha sin señal se guarda en el teléfono con un identificador único (idLocal) y la hora en que ocurrió.
// Al volver la señal se envía en orden; si el mismo idLocal llega dos veces (reintento, doble toque, dos envíos), se
// aplica una sola vez. Lo que depende del estado actual en el servidor (aprobar, autorizar, verificar a otro) exige conexión.
(function (g) {
  'use strict';
  var req = function (n, glob) { return (typeof module !== 'undefined') ? require('./' + n) : g[glob]; };
  var A = req('motor.js', 'ASTRA'), C = req('cuadrilla.js', 'ASTRA_C'), T = req('terreno.js', 'ASTRA_T');
  // Acciones propias de la persona que no dependen de otros: se pueden hacer sin señal y quedan «pendientes de enviar»
  var SIN_CONEXION = ['C_DETENER', 'C_INFORMADO', 'C_DECLARAR', 'C_FIRMAR', 'C_PAUSAR_PARTICIPACION', 'C_FINALIZAR_PARTICIPACION', 'T_REPORTAR'];
  var n = 0;
  function nuevoId() { n++; return 'L-' + Date.now().toString(36) + '-' + n + '-' + Math.random().toString(36).slice(2, 7); }

  function preparar(db) { db.colaLocal = db.colaLocal || []; db.idsAplicados = db.idsAplicados || {}; db.sincronizaciones = db.sincronizaciones || []; return db; }
  function permitido(tipo) { return SIN_CONEXION.indexOf(tipo) >= 0; }
  // Guarda la acción en el teléfono. No cambia el estado: «puedes empezar» no aparece hasta que el servidor la reciba.
  function encolar(db, ev) {
    preparar(db);
    if (!permitido(ev.tipo)) return { ok: false, motivo: 'Esta acción necesita conexión: queda disponible cuando vuelva la señal' };
    var e = Object.assign({}, ev, { idLocal: ev.idLocal || nuevoId(), ocurridoEn: ev.ocurridoEn || A.ahora(db) });
    db.colaLocal.push(e);
    return { ok: true, idLocal: e.idLocal, pendientes: db.colaLocal.length };
  }
  function aplicarUno(db, ev) { return /^T_/.test(ev.tipo) ? T.aplicar(db, ev) : C.aplicar(db, ev); }
  // Envía la cola en el orden en que ocurrió. Un idLocal ya aplicado no se vuelve a aplicar.
  function sincronizar(db, lista) {
    preparar(db);
    var cola = lista || db.colaLocal.splice(0), res = { aplicados: 0, duplicados: 0, rechazados: [] };
    cola.slice().sort(function (a, b) { return a.ocurridoEn < b.ocurridoEn ? -1 : a.ocurridoEn > b.ocurridoEn ? 1 : 0; }).forEach(function (ev) {
      if (ev.idLocal && db.idsAplicados[ev.idLocal]) { res.duplicados++; return; }
      var r = aplicarUno(db, ev);
      if (r.ok) { db.idsAplicados[ev.idLocal] = r.evento ? r.evento.n : true; res.aplicados++; }
      else res.rechazados.push({ idLocal: ev.idLocal, tipo: ev.tipo, motivo: r.motivo });
    });
    db.sincronizaciones.push({ en: A.ahora(db), aplicados: res.aplicados, duplicados: res.duplicados, rechazados: res.rechazados.length });
    return res;
  }
  var S = { preparar: preparar, encolar: encolar, sincronizar: sincronizar, permitido: permitido, SIN_CONEXION: SIN_CONEXION };
  if (typeof module !== 'undefined') module.exports = S; else g.ASTRA_S = S;
})(this);
