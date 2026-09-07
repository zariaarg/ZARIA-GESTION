/* =============================================================
   CRAFT FLOW — BACKEND (Apps Script)
   Reorganizado y comentado. La lógica de cada función es la
   misma que en el original: solo se compactó el formato (antes
   una instrucción por muchas líneas) y se agrupó por bloques.
   ============================================================= */


/* =========================================================
   1. CONFIGURACIÓN
   ========================================================= */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Nombres reales de las hojas en Google Sheets.
// OJO: EMPRESAS, MODELOS, MATERIALES, MODELO_MATERIALES, PEDIDOS y
// CLIENTES están en uso activo. El resto (PRODUCTOS, CONFIGURACION,
// CONFIG_SISTEMA, FINANZAS, STOCK, PROVEEDORES, COMPRAS_MATERIALES)
// están preparadas para módulos futuros — no tocar/eliminar.
const SHEETS = {
  PEDIDOS: 'PEDIDOS',
  PEDIDO_ITEMS: 'PEDIDO_ITEMS',
  CLIENTES: 'CLIENTES',
  MODELOS: 'MODELOS',
  PRODUCTOS: 'PRODUCTOS',
  CONFIGURACION: 'CONFIGURACION',
  CONFIG_SISTEMA: 'CONFIG_SISTEMA',
  EMPRESAS: 'EMPRESAS',
  FINANZAS: 'FINANZAS',
  STOCK: 'STOCK',
  PROVEEDORES: 'PROVEEDORES',
  MATERIALES: 'MATERIALES',
  MODELO_MATERIALES: 'MODELO_MATERIALES',
  PEDIDOS_MATERIALES: 'PEDIDOS_MATERIALES',
  COMPRAS_MATERIALES: 'COMPRAS_MATERIALES'
};


/* =========================================================
   2. ENDPOINTS (doGet / doPost)
   ========================================================= */

function doGet(e) {
  try {
    const resource = e.parameter.resource;
    const callback = e.parameter.callback;
    const empresaId = e.parameter.empresa_id;

    if (!resource) {
      return jsonResponse({ success: false, error: 'Falta el parámetro resource' });
    }

    const sheetName = getSheetName(resource);
    if (!sheetName) {
      return jsonResponse({ success: false, error: 'Recurso no válido: ' + resource });
    }

    const data = getAllRows(sheetName, empresaId);
    const resultado = { success: true, resource: resource, data: data };

    // Soporte JSONP: si viene "callback", envolvemos la respuesta.
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(resultado) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return jsonResponse(resultado);

  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    let body = {};

    // El payload puede venir como parámetro de formulario o como
    // cuerpo crudo del POST, según cómo lo mande el frontend.
    if (e.parameter && e.parameter.payload) {
      body = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    // ---- Acciones especiales (no son CRUD genérico) ----
    if (body.accion === 'agregar_modelo_material') {
      return agregarModeloMaterial(body);
    }

    if (body.accion === 'calcular_costo_modelo') {
      return calcularCostoModelo(body);
    }

    if (body.accion === 'crear_pedido_publico') {
      return crearPedidoPublico(body);
    }

    // ---- CRUD genérico ----
    const action = body.action || 'insert';
    const resource = body.resource;
    const data = body.data;
    const id = body.id;

    if (!resource) {
      return jsonResponse({ success: false, error: 'Falta resource' });
    }

    const sheetName = getSheetName(resource);
    if (!sheetName) {
      return jsonResponse({ success: false, error: 'Recurso no válido: ' + resource });
    }

    if (action === 'insert') {
      if (!data) {
        return jsonResponse({ success: false, error: 'Falta data' });
      }
      const result = insertRow(sheetName, data);
      return jsonResponse({ success: true, action: 'insert', data: result });
    }

    if (action === 'update') {
      if (!id) {
        return jsonResponse({ success: false, error: 'Falta id' });
      }
      if (!data) {
        return jsonResponse({ success: false, error: 'Falta data' });
      }

      // En modelos no se permite pisar estos campos desde una edición.
      if (resource.toLowerCase() === 'modelos') {
        delete data.modelo_id;
        delete data.codigo;
        delete data.empresa_id;
        delete data.created_at;
        delete data.updated_at;
      }

      const result = updateRow(sheetName, id, data);
      return jsonResponse({ success: true, action: 'update', data: result });
    }

    if (action === 'delete') {
      if (!id) {
        return jsonResponse({ success: false, error: 'Falta id' });
      }
      const result = deleteRow(sheetName, id);
      return jsonResponse({ success: true, action: 'delete', data: result });
    }

    return jsonResponse({ success: false, error: 'Acción no válida: ' + action });

  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}


/* =========================================================
   3. UTILIDADES DE CONEXIÓN CON EL SPREADSHEET
   ========================================================= */

function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('No existe la hoja: ' + sheetName);
  }

  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// Recorre esta lista de posibles nombres de columna ID y devuelve
// el índice de la primera que exista en la hoja.
function getIdColumn(headers) {
  const possibleIds = [
    'id_pedido',
    'pedido_item_id',
    'cliente_id',
    'modelo_id',
    'producto_id',
    'movimiento_id',
    'stock_id',
    'proveedor_id',
    'material_id',
    'modelo_material_id',
    'pedido_detalle_id'
  ];

  for (const id of possibleIds) {
    const index = headers.indexOf(id);
    if (index !== -1) {
      return index;
    }
  }

  return -1;
}

function objectFromRow(headers, row) {
  const object = {};
  headers.forEach((header, index) => {
    object[header] = row[index];
  });
  return object;
}

function getRowAsObject(sheet, rowNumber) {
  const headers = getHeaders(sheet);
  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  return objectFromRow(headers, row);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Traduce el "resource" que manda el frontend (en minúsculas) al
// nombre real de la hoja en SHEETS.
function getSheetName(resource) {
  const map = {
    pedidos: SHEETS.PEDIDOS,
    pedido_items: SHEETS.PEDIDO_ITEMS,
    clientes: SHEETS.CLIENTES,
    modelos: SHEETS.MODELOS,
    productos: SHEETS.PRODUCTOS,
    configuracion: SHEETS.CONFIGURACION,
    config_sistema: SHEETS.CONFIG_SISTEMA,
    empresas: SHEETS.EMPRESAS,
    finanzas: SHEETS.FINANZAS,
    stock: SHEETS.STOCK,
    proveedores: SHEETS.PROVEEDORES,
    materiales: SHEETS.MATERIALES,
    modelo_materiales: SHEETS.MODELO_MATERIALES,
    pedidos_materiales: SHEETS.PEDIDOS_MATERIALES,
    compras_materiales: SHEETS.COMPRAS_MATERIALES
  };

  return map[String(resource).toLowerCase()];
}


/* =========================================================
   4. CRUD GENÉRICO
   (usado por empresas, pedidos, clientes, modelos, materiales, etc.)
   ========================================================= */

function getAllRows(sheetName, empresaId) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= 1) {
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const empresaColumn = headers.indexOf('empresa_id');

  return values
    .filter(row => row.some(cell => cell !== ''))
    .filter(row => {
      // Si la hoja tiene columna empresa_id y se recibió una
      // empresa, filtramos por esa empresa.
      if (
        empresaColumn !== -1 &&
        empresaId !== undefined &&
        empresaId !== null &&
        empresaId !== ''
      ) {
        return Number(row[empresaColumn]) === Number(empresaId);
      }
      return true;
    })
    .map(row => objectFromRow(headers, row));
}

function insertRow(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheet);

  // Validaciones específicas de MODELOS.
  if (sheetName === SHEETS.MODELOS) {
    if (!data.empresa_id) {
      throw new Error('Falta empresa_id');
    }
    if (!data.codigo) {
      throw new Error('Falta código del modelo');
    }
    if (!data.nombre) {
      throw new Error('Falta nombre del modelo');
    }
    if (existeCodigoModelo(data.codigo, data.empresa_id)) {
      throw new Error('Ya existe un modelo con el código ' + data.codigo + ' en esta empresa.');
    }
  }

  const row = headers.map(header => {
    if (header === 'created_at' || header === 'updated_at') {
      return new Date();
    }

    if (header === 'modelo_id') {
      return data.modelo_id ? data.modelo_id : generarNuevoId(sheet, 'modelo_id');
    }

    if (header === 'cliente_id') {
      return data.cliente_id ? data.cliente_id : generarNuevoId(sheet, 'cliente_id');
    }

    if (header === 'id_pedido') {
      return data.id_pedido ? data.id_pedido : generarNuevoId(sheet, 'id_pedido');
    }

    if (header === 'pedido_item_id') {
      return data.pedido_item_id ? data.pedido_item_id : generarNuevoId(sheet, 'pedido_item_id');
    }

    if (
      header === 'producto_id' ||
      header === 'movimiento_id' ||
      header === 'stock_id' ||
      header === 'proveedor_id' ||
      header === 'material_id'
    ) {
      return data[header] ? data[header] : generarNuevoId(sheet, header);
    }

    // Resto de columnas: se toma tal cual viene, o '' si no se mandó.
    return data[header] !== undefined ? data[header] : '';
  });

  sheet.appendRow(row);
  return objectFromRow(headers, row);
}

function updateRow(sheetName, id, data) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColumn = getIdColumn(headers);

  if (idColumn === -1) {
    throw new Error('La hoja no tiene una columna ID reconocible');
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColumn]) === String(id)) {
      headers.forEach((header, column) => {
        if (data[header] !== undefined) {
          sheet.getRange(i + 1, column + 1).setValue(data[header]);
        }
      });

      const updatedColumn = headers.indexOf('updated_at');
      if (updatedColumn !== -1) {
        sheet.getRange(i + 1, updatedColumn + 1).setValue(new Date());
      }

      return getRowAsObject(sheet, i + 1);
    }
  }

  throw new Error('No se encontró el registro con ID: ' + id);
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    throw new Error('No hay registros para eliminar.');
  }

  const headers = values[0];

  // MODELO_MATERIALES siempre se elimina por modelo_material_id;
  // el resto de las hojas usa getIdColumn() para detectar la columna.
  let idColumn;
  if (sheetName === SHEETS.MODELO_MATERIALES) {
    idColumn = headers.indexOf('modelo_material_id');
  } else {
    idColumn = getIdColumn(headers);
  }

  if (idColumn === -1) {
    throw new Error('La hoja no tiene una columna ID válida.');
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColumn]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { deleted: true, id: id };
    }
  }

  // FIX: antes este mensaje decía siempre "modelo_material_id" sin
  // importar la hoja. Ahora usa el nombre real de la columna ID.
  throw new Error('No se encontró el registro con ' + headers[idColumn] + ': ' + id);
}

// Busca el número más alto ya usado en una columna ID y devuelve +1.
function generarNuevoId(sheet, columnaId) {
  const headers = getHeaders(sheet);
  const columna = headers.indexOf(columnaId);

  if (columna === -1) {
    throw new Error('No existe la columna ' + columnaId);
  }

  const ultimaFila = sheet.getLastRow();
  if (ultimaFila < 2) {
    return 1;
  }

  const valores = sheet.getRange(2, columna + 1, ultimaFila - 1, 1).getValues();

  let mayor = 0;
  valores.forEach(fila => {
    const numero = Number(fila[0]);
    if (!isNaN(numero) && numero > mayor) {
      mayor = numero;
    }
  });

  return mayor + 1;
}


/* =========================================================
   5. MODELOS — validaciones específicas
   ========================================================= */

function existeCodigoModelo(codigo, empresaId) {
  const sheet = getSheet(SHEETS.MODELOS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return false;
  }

  const headers = values[0];
  const codigoColumn = headers.indexOf('codigo');
  const empresaColumn = headers.indexOf('empresa_id');

  if (codigoColumn === -1 || empresaColumn === -1) {
    return false;
  }

  for (let i = 1; i < values.length; i++) {
    const mismoCodigo =
      String(values[i][codigoColumn]).trim().toUpperCase() ===
      String(codigo).trim().toUpperCase();

    const mismaEmpresa = Number(values[i][empresaColumn]) === Number(empresaId);

    if (mismoCodigo && mismaEmpresa) {
      return true;
    }
  }

  return false;
}


/* =========================================================
   6. MATERIALES DEL MODELO / CONSUMO
   ========================================================= */

// NOTA: a diferencia de insertRow(), esta función escribe la fila
// con appendRow() en un orden de columnas fijo (hardcodeado) en vez
// de usar getHeaders(). Funciona hoy porque el orden coincide con
// la hoja MODELO_MATERIALES, pero si ese orden cambia algún día,
// esto se rompe en silencio. Lo dejo funcionando igual que el
// original — lo marco para que decidas si en algún momento
// conviene unificarlo con insertRow().
function agregarModeloMaterial(data) {
  const modeloId = Number(data.modelo_id);
  const materialId = Number(data.material_id);
  const empresaId = Number(data.empresa_id);
  const cantidad = Number(data.cantidad);
  const unidad = String(data.unidad || '').trim();

  if (!modeloId) {
    return jsonResponse({ success: false, error: 'Falta modelo_id' });
  }
  if (!materialId) {
    return jsonResponse({ success: false, error: 'Falta material_id' });
  }
  if (!empresaId) {
    return jsonResponse({ success: false, error: 'Falta empresa_id' });
  }
  if (!cantidad || cantidad <= 0) {
    return jsonResponse({ success: false, error: 'La cantidad debe ser mayor a 0' });
  }
  if (!unidad) {
    return jsonResponse({ success: false, error: 'Falta unidad' });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MODELO_MATERIALES);
  if (!sheet) {
    return jsonResponse({ success: false, error: 'No existe la hoja MODELO_MATERIALES' });
  }

  const nuevoId = generarNuevoId(sheet, 'modelo_material_id');

  // Orden exacto de columnas en la hoja:
  // modelo_material_id, modelo_id, material_id, empresa_id, cantidad, unidad
  sheet.appendRow([nuevoId, modeloId, materialId, empresaId, cantidad, unidad]);

  return jsonResponse({
    success: true,
    message: 'Material agregado correctamente',
    data: {
      modelo_material_id: nuevoId,
      modelo_id: modeloId,
      material_id: materialId,
      empresa_id: empresaId,
      cantidad: cantidad,
      unidad: unidad
    }
  });
}


/* =========================================================
   7. COSTOS
   ========================================================= */

// NOTA: para guardar el costo calculado en MODELOS, esta función
// recorre las filas "a mano" en vez de reusar updateRow(). Funciona
// bien, pero es lógica de "buscar fila + escribir celda" duplicada.
// Lo dejo igual que el original — lo marco como candidato a
// unificar más adelante si querés.
function calcularCostoModelo(data) {
  const modeloId = Number(data.modelo_id);
  const empresaId = Number(data.empresa_id);

  if (!modeloId) {
    return jsonResponse({ success: false, error: 'Falta modelo_id' });
  }
  if (!empresaId) {
    return jsonResponse({ success: false, error: 'Falta empresa_id' });
  }

  const sheetModelo = getSheet(SHEETS.MODELOS);

  // Buscar el modelo
  const modelos = getAllRows(SHEETS.MODELOS, empresaId);
  const modelo = modelos.find(item => Number(item.modelo_id) === modeloId);

  if (!modelo) {
    return jsonResponse({ success: false, error: 'No se encontró el modelo.' });
  }

  // Materiales asociados a este modelo
  const modeloMateriales = getAllRows(SHEETS.MODELO_MATERIALES, empresaId)
    .filter(item => Number(item.modelo_id) === modeloId);

  if (modeloMateriales.length === 0) {
    return jsonResponse({
      success: true,
      costo: 0,
      materiales: [],
      message: 'El modelo no tiene materiales cargados.'
    });
  }

  // Calcular costo total sumando cantidad × costo_unitario de cada material
  const materiales = getAllRows(SHEETS.MATERIALES, empresaId);
  let costoTotal = 0;
  const detalle = [];

  modeloMateriales.forEach(item => {
    const material = materiales.find(m => Number(m.material_id) === Number(item.material_id));
    if (!material) {
      return;
    }

    const cantidad = Number(item.cantidad || 0);
    const costoUnitario = Number(material.costo_unitario || 0);
    const subtotal = cantidad * costoUnitario;
    costoTotal += subtotal;

    detalle.push({
      material_id: material.material_id,
      nombre: material.nombre,
      cantidad: cantidad,
      unidad: item.unidad || '',
      costo_unitario: costoUnitario,
      subtotal: subtotal
    });
  });

  costoTotal = Math.round(costoTotal * 100) / 100;

  // Guardar el costo en la hoja MODELOS
  const valores = sheetModelo.getDataRange().getValues();
  const headers = valores[0];
  const modeloIdColumn = headers.indexOf('modelo_id');
  const empresaIdColumn = headers.indexOf('empresa_id');
  const costoColumn = headers.indexOf('costo');

  if (modeloIdColumn === -1) {
    return jsonResponse({ success: false, error: 'La hoja MODELOS no tiene columna modelo_id.' });
  }
  if (costoColumn === -1) {
    return jsonResponse({ success: false, error: 'La hoja MODELOS no tiene columna costo.' });
  }

  for (let i = 1; i < valores.length; i++) {
    const mismoModelo = Number(valores[i][modeloIdColumn]) === modeloId;
    const mismaEmpresa = empresaIdColumn === -1 || Number(valores[i][empresaIdColumn]) === empresaId;

    if (mismoModelo && mismaEmpresa) {
      sheetModelo.getRange(i + 1, costoColumn + 1).setValue(costoTotal);
      break;
    }
  }

  return jsonResponse({
    success: true,
    modelo_id: modeloId,
    empresa_id: empresaId,
    costo: costoTotal,
    materiales: detalle
  });
}


/* =========================================================
   8. ZARIA STORE — PEDIDOS PÚBLICOS
   ========================================================= */

// Punto de entrada: recibe el pedido armado por el cliente en
// Zaria Store, valida todo del lado del servidor (nunca confía
// en precios/costos que mande el navegador) y lo graba.
function crearPedidoPublico(data) {
  const empresaId = Number(data.empresa_id);
  const modeloId = Number(data.modelo_id);
  const cliente = data.cliente || {};
  const metodoPago = String(data.metodo_pago || '').trim();
  const colorHilo = String(data.color_hilo || '').trim();
  const talle = String(data.talle || '').trim();
  const cuello = data.cuello !== undefined ? data.cuello : '';
  const busto = data.busto !== undefined ? data.busto : '';
  const cintura = data.cintura !== undefined ? data.cintura : '';
  const alto = data.alto !== undefined ? data.alto : '';
  const tieneMedidas = !!(cuello || busto || cintura || alto);
  const tipoEntrega = String(data.tipo_entrega || '').trim();
  const observaciones = String(data.observaciones || '').trim();
  const reemplazos = Array.isArray(data.reemplazos) ? data.reemplazos : [];
  const extras = Array.isArray(data.extras) ? data.extras.map(Number) : [];

  if (!empresaId) {
    return jsonResponse({ success: false, error: 'Falta empresa_id' });
  }
  if (!modeloId) {
    return jsonResponse({ success: false, error: 'Falta modelo_id' });
  }
  if (!cliente.nombre) {
    return jsonResponse({ success: false, error: 'Falta el nombre del cliente' });
  }
  if (!cliente.telefono) {
    return jsonResponse({ success: false, error: 'Falta el teléfono del cliente' });
  }
  if (!metodoPago) {
    return jsonResponse({ success: false, error: 'Falta el método de pago' });
  }

  // ---- 1. Modelo: fuente de verdad del precio ----
  const modelos = getAllRows(SHEETS.MODELOS, empresaId);
  const modelo = modelos.find(m => Number(m.modelo_id) === modeloId);

  if (!modelo) {
    return jsonResponse({ success: false, error: 'El modelo no existe o no pertenece a esta empresa.' });
  }

  // Margen que se aplica sobre el costo de cada reemplazo/extra
  // (no sobre el precio base del modelo). Se lee de CONFIGURACION
  // para que se pueda ajustar sin tocar código.
  const margenPersonalizacion = obtenerMargenPersonalizacion();
  const factorMargen = 1 + (margenPersonalizacion / 100);

  // ---- 2. Materiales default del modelo ----
  const materialesModelo = getAllRows(SHEETS.MODELO_MATERIALES, empresaId)
    .filter(item => Number(item.modelo_id) === modeloId);

  // Catálogo completo de materiales activos (para validar reemplazos/extras y sacar costos reales)
  const catalogoMateriales = getAllRows(SHEETS.MATERIALES, empresaId)
    .filter(m => String(m.activo).toUpperCase() !== 'FALSE');

  function buscarMaterial(materialId) {
    return catalogoMateriales.find(m => Number(m.material_id) === Number(materialId));
  }

  // ---- 3. Armar la lista final de materiales a usar ----
  // Empezamos con los defaults del modelo y, si el cliente pidió
  // reemplazar alguno, lo cambiamos SOLO si es una alternativa
  // válida (misma categoría y misma unidad de compra).
  const materialesFinales = [];
  let recargoTotal = 0;
  const nombresParaResumen = [];
  const advertencias = [];

  const idsDefaultDelModelo = materialesModelo.map(item => Number(item.material_id));

  reemplazos.forEach(r => {
    if (!idsDefaultDelModelo.includes(Number(r.material_default_id))) {
      advertencias.push(
        'El material ' + r.material_default_id + ' no es un material default de este modelo — se ignoró ese reemplazo.'
      );
    }
  });

  materialesModelo.forEach(itemDefault => {
    const materialDefault = buscarMaterial(itemDefault.material_id);
    if (!materialDefault) {
      return; // material default inactivo/inexistente: se ignora
    }

    const reemplazo = reemplazos.find(
      r => Number(r.material_default_id) === Number(itemDefault.material_id)
    );

    let materialUsado = materialDefault;
    let recargo = 0;

    if (reemplazo) {
      const materialElegido = buscarMaterial(reemplazo.material_elegido_id);

      const esReemplazoValido =
        materialElegido &&
        materialElegido.categoria === materialDefault.categoria &&
        materialElegido.unidad_compra === materialDefault.unidad_compra;

      if (esReemplazoValido) {
        materialUsado = materialElegido;
        // El recargo es proporcional: (diferencia de costo por unidad
        // de compra) × (cantidad que ESTE modelo realmente consume,
        // sacada de MODELO_MATERIALES). Así el recargo refleja el uso
        // real de cada modelo y se recalcula solo si cambian los
        // costos — no hay que cargar un valor fijo a mano.
        if (Number(materialElegido.material_id) !== Number(materialDefault.material_id)) {
          const diferenciaCosto =
            Number(materialElegido.costo_unitario || 0) -
            Number(materialDefault.costo_unitario || 0);
          recargo = diferenciaCosto * Number(itemDefault.cantidad || 0) * factorMargen;
        }
      } else if (materialElegido) {
        advertencias.push(
          'El material ' + materialElegido.material_id + ' (' + materialElegido.nombre + ') no es una alternativa válida para reemplazar a ' + materialDefault.nombre + ' — distinta categoría o unidad. Se ignoró ese reemplazo.'
        );
      } else {
        advertencias.push(
          'El material elegido ' + reemplazo.material_elegido_id + ' no existe o está inactivo — se ignoró ese reemplazo.'
        );
      }
      // Ningún reemplazo inválido rechaza el pedido completo: se
      // ignora ese reemplazo puntual y se sigue con el resto.
    }


    materialesFinales.push({
      material_id: materialUsado.material_id,
      cantidad: Number(itemDefault.cantidad || 0),
      unidad: itemDefault.unidad || materialUsado.unidad_compra || '',
      costo: Number(materialUsado.costo_unitario || 0)
    });

    nombresParaResumen.push(materialUsado.nombre);
    recargoTotal += recargo;
  });

  // ---- 4. Extras (tachas, remaches, etc. — se suman, no reemplazan) ----
  extras.forEach(materialId => {
    const materialExtra = buscarMaterial(materialId);

    if (!materialExtra || materialExtra.categoria !== 'EXTRA') {
      return; // se ignora cualquier extra que no sea válido
    }

    // La cantidad usada es la del "paquete" configurado para este
    // extra (ej: 15 tachas), no 1 unidad suelta. Si el material no
    // tiene cantidad_extra cargada, se usa 1 como valor por defecto.
    const cantidadExtra = Number(materialExtra.cantidad_extra || 1);

    materialesFinales.push({
      material_id: materialExtra.material_id,
      cantidad: cantidadExtra,
      unidad: materialExtra.unidad_compra || '',
      costo: Number(materialExtra.costo_unitario || 0)
    });

    nombresParaResumen.push(materialExtra.nombre);
    // El extra se cobra a costo + el margen de personalización
    // configurado — mismo criterio que el recargo de reemplazos.
    recargoTotal += Number(materialExtra.costo_unitario || 0) * cantidadExtra * factorMargen;
  });

  // ---- 5. Costo interno y precio final (con recargos) ----
  const costoTotal = materialesFinales.reduce(
    (acumulado, m) => acumulado + (m.cantidad * m.costo),
    0
  );

  const precioFinal = Number(modelo.precio_venta || 0) + recargoTotal;

  // ---- 6. Crear la cabecera del pedido (estado Pendiente, cliente sin vincular todavía) ----
  // NOTA: por ahora Zaria Store solo manda un modelo por pedido — el
  // carrito (varios modelos en un mismo pedido) todavía no está
  // armado del lado del frontend. Igual ya creamos la cabecera +
  // 1 ítem, para que cuando el carrito esté listo, esta función no
  // necesite cambiar de estructura — solo recorrer varios modelos
  // en vez de uno.
  const pedidoData = {
    empresa_id: empresaId,
    fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    cliente_nombre: cliente.nombre,
    telefono: cliente.telefono,
    email: cliente.email || '',
    direccion: cliente.direccion || '',
    canal_venta: 'Zaria Store',
    tipo_entrega: tipoEntrega,
    observaciones: observaciones,
    precio_total: Math.round(precioFinal * 100) / 100,
    costo_total: Math.round(costoTotal * 100) / 100,
    metodo_pago: metodoPago,
    estado: 'Pendiente'
  };

  const pedidoCreado = insertRow(SHEETS.PEDIDOS, pedidoData);

  // ---- 7. Crear el ítem del pedido (el modelo + su personalización) ----
  const itemData = {
    id_pedido: pedidoCreado.id_pedido,
    empresa_id: empresaId,
    modelo_id: modeloId,
    codigo: modelo.codigo || '',
    modelo: modelo.nombre || '',
    material: nombresParaResumen.join(', '),
    color_hilo: colorHilo,
    talle: talle,
    a_medida: tieneMedidas ? 'TRUE' : 'FALSE',
    cuello: cuello,
    busto: busto,
    cintura: cintura,
    alto: alto,
    precio: Math.round(precioFinal * 100) / 100,
    costo: Math.round(costoTotal * 100) / 100
  };

  const itemCreado = insertRow(SHEETS.PEDIDO_ITEMS, itemData);

  // ---- 8. Congelar el detalle de materiales usados (cuelgan del ítem, no del pedido) ----
  registrarMaterialesDelPedido(empresaId, itemCreado.pedido_item_id, materialesFinales);

  return jsonResponse({
    success: true,
    message: 'Pedido recibido correctamente.',
    id_pedido: pedidoCreado.id_pedido,
    precio_base: Number(modelo.precio_venta || 0),
    recargos: Math.round(recargoTotal * 100) / 100,
    precio_final: Math.round(precioFinal * 100) / 100,
    advertencias: advertencias,
    margen_aplicado_pct: margenPersonalizacion
  });
}

// Lee el % de margen a aplicar sobre reemplazos/extras desde
// CONFIG_SISTEMA (parametro = MARGEN_PERSONALIZACION). Si no existe,
// devuelve 0 (no se aplica margen) en vez de romper.
function obtenerMargenPersonalizacion() {
  const config = getAllRows(SHEETS.CONFIG_SISTEMA);
  const fila = config.find(
    c => String(c.parametro || '').trim().toUpperCase() === 'MARGEN_PERSONALIZACION'
  );

  if (!fila) {
    return 0;
  }

  return Number(fila.valor || 0);
}

// Graba en PEDIDOS_MATERIALES una fila por cada material usado en
// el ítem del pedido, con su cantidad/unidad/costo congelados. Arma
// la fila dinámicamente según los headers reales de la hoja (igual
// que insertRow), en vez de un array con orden fijo, para no
// depender de que las columnas estén siempre en el mismo orden.
function registrarMaterialesDelPedido(empresaId, pedidoItemId, materiales) {
  if (!materiales.length) {
    return;
  }

  const sheet = getSheet(SHEETS.PEDIDOS_MATERIALES);
  const headers = getHeaders(sheet);

  materiales.forEach(m => {
    const nuevoId = generarNuevoId(sheet, 'pedido_detalle_id');

    const fila = headers.map(header => {
      if (header === 'pedido_detalle_id') return nuevoId;
      if (header === 'empresa_id') return empresaId;
      if (header === 'pedido_item_id') return pedidoItemId;
      if (header === 'material_id') return m.material_id;
      if (header === 'cantidad') return m.cantidad;
      if (header === 'unidad') return m.unidad;
      if (header === 'costo') return m.costo;
      if (header === 'created_at' || header === 'updated_at') return new Date();
      return '';
    });

    sheet.appendRow(fila);
  });
}


/* =========================================================
   9. FUNCIONES DE PRUEBA / DEBUG
   (se ejecutan manualmente desde el editor de Apps Script,
   no forman parte del flujo doGet/doPost del frontend)
   ========================================================= */

function testModelos() {
  const data = getAllRows(SHEETS.MODELOS);
  console.log(JSON.stringify(data, null, 2));
}

function testMateriales() {
  const data = getAllRows(SHEETS.MATERIALES);
  console.log(JSON.stringify(data, null, 2));
}

function pruebaConexion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('MODELOS');

  sheet.getRange('L1').setValue('CONEXIÓN OK');
  sheet.getRange('L2').setValue('Filas: ' + sheet.getLastRow());
  sheet.getRange('L3').setValue('Columnas: ' + sheet.getLastColumn());
}
