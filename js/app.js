const API_URL = "https://script.google.com/macros/s/AKfycbyZzZQhIyQAdZv2G4YqUqvb_wThnq_S_PPq81YET8W-vBVs7O9No7KOb1_stS2XbMvO/exec";

let modelos = [];
let tipos = [];
let filtroActual = "TODOS";
let busquedaActual = "";


/* =========================
   API JSONP
========================= */

function llamarAPI(resource) {

    return new Promise((resolve, reject) => {

        const callbackName =
            "zariaCallback_" +
            Date.now() +
            "_" +
            Math.floor(Math.random() * 1000);

        const script =
            document.createElement("script");

        window[callbackName] = function(result) {

            delete window[callbackName];

            script.remove();

            if (!result.success) {

                reject(
                    new Error(
                        result.error ||
                        "Error en la API"
                    )
                );

                return;
            }

            resolve(result.data);

        };


        script.onerror = function() {

            delete window[callbackName];

            script.remove();

            reject(
                new Error(
                    "No se pudo conectar con la API"
                )
            );

        };


        script.src =
            `${API_URL}?resource=${resource}&callback=${callbackName}`;

        document.body.appendChild(script);

    });

}


/* =========================
   INICIO
========================= */

async function iniciarAplicacion() {

    const container =
        document.getElementById(
            "modelos-container"
        );

    try {

        container.innerHTML = `
            <p>Cargando modelos...</p>
        `;


        const [
            modelosData,
            configuracion
        ] = await Promise.all([

            llamarAPI("modelos"),

            llamarAPI("configuracion")

        ]);


        modelos = modelosData;


        tipos = configuracion

            .filter(item =>
                String(item.categoria)
                    .toUpperCase() === "TIPO"
            )

            .filter(item =>
                item.activo === true ||
                String(item.activo)
                    .toUpperCase() === "TRUE"
            )

            .sort((a, b) =>
                Number(a.orden || 999) -
                Number(b.orden || 999)
            );


        crearControles();

        mostrarModelos();


    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <p class="error">
                No se pudieron cargar los modelos.
            </p>
        `;

    }

}


/* =========================
   CONTROLES
========================= */

function crearControles() {

    const main =
        document.querySelector(".main");


    let controles =
        document.getElementById(
            "modelos-controles"
        );


    if (!controles) {

        controles =
            document.createElement("div");

        controles.id =
            "modelos-controles";


        const titulo =
            main.querySelector("h2");


        titulo.insertAdjacentElement(
            "afterend",
            controles
        );

    }


    controles.innerHTML = `

        <div class="modelos-toolbar">

            <div class="modelos-busqueda">

                <input
                    type="text"
                    id="buscar-modelo"
                    placeholder="Buscar modelo..."
                >

            </div>


            <div class="modelos-filtro">

                <select id="filtro-tipo">

                    <option value="TODOS">
                        TODOS
                    </option>

                    ${tipos.map(tipo => `

                        <option
                            value="${escaparHTML(tipo.valor)}"
                        >
                            ${escaparHTML(tipo.valor)}
                        </option>

                    `).join("")}

                </select>

            </div>


            <button
                type="button"
                class="btn-nuevo-modelo"
                id="btn-nuevo-modelo"
            >
                + NUEVO MODELO
            </button>

        </div>

    `;


    const buscador =
        document.getElementById(
            "buscar-modelo"
        );


    const filtro =
        document.getElementById(
            "filtro-tipo"
        );


    buscador.addEventListener(
        "input",
        function() {

            busquedaActual =
                this.value
                    .trim()
                    .toLowerCase();

            mostrarModelos();

        }
    );


    filtro.addEventListener(
        "change",
        function() {

            filtroActual =
                this.value;

            mostrarModelos();

        }
    );


    document
        .getElementById(
            "btn-nuevo-modelo"
        )
        .addEventListener(
            "click",
            function() {

                alert(
                    "NUEVO MODELO lo vamos a conectar después de terminar EDITAR."
                );

            }
        );

}


/* =========================
   MOSTRAR MODELOS
========================= */

function mostrarModelos() {

    const container =
        document.getElementById(
            "modelos-container"
        );


    const modelosFiltrados =
        modelos.filter(modelo => {


            const coincideTipo =
                filtroActual === "TODOS" ||

                String(modelo.tipo)
                    .toUpperCase() ===
                String(filtroActual)
                    .toUpperCase();


            const texto =
                (
                    String(modelo.nombre || "") +
                    " " +
                    String(modelo.codigo || "") +
                    " " +
                    String(modelo.material_base || "")
                )
                .toLowerCase();


            const coincideBusqueda =
                !busquedaActual ||

                texto.includes(
                    busquedaActual
                );


            return (
                coincideTipo &&
                coincideBusqueda
            );

        });


    container.innerHTML = "";


    if (modelosFiltrados.length === 0) {

        container.innerHTML = `

            <div class="sin-resultados">
                No encontramos modelos.
            </div>

        `;

        return;

    }


    modelosFiltrados.forEach(
        modelo => {


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "modelo-card";


            const imagen =
                convertirImagenDrive(
                    modelo.imagen
                );


            const imagenHTML =
                imagen

                ? `

                    <div class="modelo-imagen">

                        <img
                            src="${imagen}"
                            alt="${escaparHTML(modelo.nombre)}"
                            loading="lazy"
                        >

                    </div>

                `

                : `

                    <div class="modelo-imagen sin-imagen">

                        <span>
                            Sin imagen
                        </span>

                    </div>

                `;


            card.innerHTML = `

                ${imagenHTML}


                <div class="modelo-contenido">


                    <div class="modelo-superior">

                        <span class="modelo-codigo">

                            ${escaparHTML(
                                modelo.codigo
                            )}

                        </span>


                        <span class="modelo-tipo">

                            ${escaparHTML(
                                modelo.tipo
                            )}

                        </span>

                    </div>


                    <h3 class="modelo-nombre">

                        ${escaparHTML(
                            modelo.nombre
                        )}

                    </h3>


                    <p class="modelo-material">

                        ${escaparHTML(
                            modelo.material_base
                        )}

                    </p>


                    <div class="modelo-precio">

                        ${formatearPrecio(
                            modelo.precio_venta
                        )}

                    </div>


                    <div class="modelo-botones">


                        <button
                            type="button"
                            class="btn-ver"
                            data-id="${modelo.modelo_id}"
                        >
                            VER
                        </button>


                        <button
                            type="button"
                            class="btn-editar"
                            data-id="${modelo.modelo_id}"
                        >
                            EDITAR
                        </button>


                    </div>


                </div>

            `;


            container.appendChild(card);

        }
    );


    /*
     * BOTONES VER
     */

    document
        .querySelectorAll(".btn-ver")
        .forEach(btn => {

            btn.addEventListener(
                "click",
                function() {

                    verModelo(
                        this.dataset.id
                    );

                }
            );

        });


    /*
     * BOTONES EDITAR
     */

    document
        .querySelectorAll(".btn-editar")
        .forEach(btn => {

            btn.addEventListener(
                "click",
                function() {

                    editarModelo(
                        this.dataset.id
                    );

                }
            );

        });

}


/* =========================
   VER MODELO
========================= */

function verModelo(id) {

    const modelo =
        modelos.find(
            item =>
                String(item.modelo_id) ===
                String(id)
        );


    if (!modelo) {
        return;
    }

window.modeloActualId =
    modelo.modelo_id;
   
    const imagenPrincipal =
        convertirImagenDrive(
            modelo.imagen
        );


    const imagenSecundaria =
        convertirImagenDrive(
            modelo.imagen_2
        );


    const modal =
        document.createElement("div");


    modal.className =
        "modelo-modal";


    modal.innerHTML = `

        <div class="modelo-modal-overlay"></div>


        <div class="modelo-modal-contenido">


            <button
                type="button"
                class="modelo-modal-cerrar"
                aria-label="Cerrar"
            >
                ×
            </button>


            <div class="modelo-detalle">


                <div class="modelo-detalle-imagenes">


                    ${
                        imagenPrincipal
                        ? `

                            <div class="modelo-detalle-imagen-principal">

                                <img
                                    src="${imagenPrincipal}"
                                    alt="${escaparHTML(modelo.nombre)}"
                                >

                            </div>

                        `
                        : ""
                    }


                    ${
                        imagenSecundaria
                        ? `

                            <div class="modelo-detalle-imagen-secundaria">

                                <img
                                    src="${imagenSecundaria}"
                                    alt="${escaparHTML(modelo.nombre)}"
                                >

                            </div>

                        `
                        : ""
                    }


                </div>


                <div class="modelo-detalle-info">


                    <div class="modelo-detalle-codigo">

                        ${escaparHTML(
                            modelo.codigo
                        )}

                    </div>


                    <div class="modelo-detalle-tipo">

                        ${escaparHTML(
                            modelo.tipo
                        )}

                    </div>


                    <h2>

                        ${escaparHTML(
                            modelo.nombre
                        )}

                    </h2>


                    <div class="modelo-detalle-material">

                        ${escaparHTML(
                            modelo.material_base
                        )}

                    </div>


                    <div class="modelo-detalle-precio">

                        ${formatearPrecio(
                            modelo.precio_venta
                        )}

                    </div>


                    ${
                        modelo.descripcion
                        ? `

                            <div class="modelo-detalle-seccion">

                                <h3>
                                    DESCRIPCIÓN
                                </h3>

                                <p>

                                    ${escaparHTML(
                                        modelo.descripcion
                                    )}

                                </p>

                            </div>

                        `
                        : ""
                    }


                    ${
                        modelo.medidas
                        ? `

                            <div class="modelo-detalle-seccion">

                                <h3>
                                    MEDIDAS
                                </h3>

                                <p class="modelo-medidas">

                                    ${escaparHTML(
                                        modelo.medidas
                                    ).replace(
                                        /\n/g,
                                        "<br>"
                                    )}

                                </p>

                            </div>

                        `
                        : ""
                    }


                    <!-- =========================
                         MATERIALES Y CONSUMO
                    ========================= -->

                    <div class="modelo-materiales">

                        <h3>
                            MATERIALES Y CONSUMO
                        </h3>


                        <div
                            id="modelo-materiales-container"
                        >

                            Cargando materiales...

                        </div>


                    </div>


                    <div class="modelo-detalle-seccion">

                        <h3>
                            PERSONALIZACIÓN
                        </h3>

                        <p>

                            Las prendas se realizan
                            a pedido y pueden
                            personalizarse según las
                            opciones disponibles.

                        </p>

                    </div>


                </div>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    /* =========================
       CARGAR MATERIALES
    ========================= */

    cargarMaterialesModelo(
        modelo.modelo_id
    );


    const botonCerrar =
        modal.querySelector(
            ".modelo-modal-cerrar"
        );


    botonCerrar.addEventListener(
        "click",
        cerrarModal
    );


    const overlay =
        modal.querySelector(
            ".modelo-modal-overlay"
        );


    overlay.addEventListener(
        "click",
        cerrarModal
    );


    function cerrarModal() {

        modal.remove();

    }

}

/* =========================
   AGREGAR MATERIAL
========================= */

function abrirAgregarMaterial() {

    const modeloId =
        window.modeloActualId;

    if (!modeloId) {

        alert(
            "No se pudo identificar el modelo."
        );

        return;

    }


    const modal =
        document.createElement("div");


    modal.className =
        "material-modal";


    const opciones =
        materiales
            .map(material => {

                return `
                    <option
                        value="${material.material_id}"
                        data-unidad="${escaparHTML(
                            material.unidad_compra
                        )}"
                    >
                        ${escaparHTML(
                            material.nombre
                        )}
                    </option>
                `;

            })
            .join("");


    modal.innerHTML = `

        <div class="material-modal-overlay"></div>


        <div class="material-modal-contenido">

            <button
                type="button"
                class="material-modal-cerrar"
            >
                ×
            </button>


            <h2>
                AGREGAR MATERIAL
            </h2>


            <div class="material-form">


                <label>
                    MATERIAL
                </label>


                <select
                    id="nuevo-material"
                >

                    <option value="">
                        Seleccionar material
                    </option>

                    ${opciones}

                </select>


                <label>
                    CANTIDAD
                </label>


                <input
                    type="number"
                    id="nuevo-material-cantidad"
                    min="0"
                    step="0.01"
                    placeholder="Ej: 0.45"
                >


                <label>
                    UNIDAD
                </label>


                <input
                    type="text"
                    id="nuevo-material-unidad"
                    readonly
                >


                <div class="material-form-botones">

                    <button
                        type="button"
                        class="material-btn-cancelar"
                    >
                        CANCELAR
                    </button>


                    <button
                        type="button"
                        class="material-btn-guardar"
                    >
                        GUARDAR
                    </button>

                </div>


            </div>

        </div>

    `;


    document.body.appendChild(modal);


    const selectMaterial =
        modal.querySelector(
            "#nuevo-material"
        );


    const inputUnidad =
        modal.querySelector(
            "#nuevo-material-unidad"
        );


    selectMaterial.addEventListener(
        "change",
        function () {

            const opcion =
                this.options[
                    this.selectedIndex
                ];


            inputUnidad.value =
                opcion.dataset.unidad || "";

        }
    );


    const cerrar =
        () => modal.remove();


    modal.querySelector(
        ".material-modal-cerrar"
    ).addEventListener(
        "click",
        cerrar
    );


    modal.querySelector(
        ".material-modal-overlay"
    ).addEventListener(
        "click",
        cerrar
    );


    modal.querySelector(
        ".material-btn-cancelar"
    ).addEventListener(
        "click",
        cerrar
    );


    modal.querySelector(
        ".material-btn-guardar"
    ).addEventListener(
        "click",
        () => guardarMaterialModelo(
            modal,
            modeloId
        )
    );

}

async function guardarMaterialModelo(
    modal,
    modeloId
) {

    const materialSelect =
        modal.querySelector(
            "#nuevo-material"
        );


    const cantidadInput =
        modal.querySelector(
            "#nuevo-material-cantidad"
        );


    const unidadInput =
        modal.querySelector(
            "#nuevo-material-unidad"
        );


    const materialId =
        Number(
            materialSelect.value
        );


    const cantidad =
        Number(
            cantidadInput.value
        );


    const unidad =
        unidadInput.value;


    if (!materialId) {

        alert(
            "Seleccioná un material."
        );

        return;

    }


    if (
        !cantidad ||
        cantidad <= 0
    ) {

        alert(
            "Ingresá una cantidad válida."
        );

        return;

    }


    if (!unidad) {

        alert(
            "No se pudo determinar la unidad."
        );

        return;

    }


    const boton =
        modal.querySelector(
            ".material-btn-guardar"
        );


    boton.disabled = true;

    boton.textContent =
        "GUARDANDO...";


    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify({

                            accion:
                                "agregar_modelo_material",

                            modelo_id:
                                modeloId,

                            material_id:
                                materialId,

                            cantidad:
                                cantidad,

                            unidad:
                                unidad

                        })

                }
            );


        const resultado =
            await response.json();


        if (!resultado.success) {

            throw new Error(
                resultado.error ||
                "No se pudo guardar"
            );

        }


        modal.remove();


        cargarMaterialesModelo(
            modeloId
        );


    } catch (error) {

        console.error(
            "Error guardando material:",
            error
        );


        alert(
            "No se pudo guardar el material.\n\n" +
            error.message
        );


        boton.disabled = false;

        boton.textContent =
            "GUARDAR";

    }

}

/* =========================
   MATERIALES DEL MODELO
========================= */

async function cargarMaterialesModelo(modeloId) {

    const container =
        document.getElementById("modelo-materiales-container");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="materiales-cargando">
            Cargando materiales...
        </div>
    `;

    try {

        const response = await fetch(
            `${API_URL}?resource=modelo_materiales&callback=zariaCallback`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const texto = await response.text();

        const inicio = texto.indexOf("(");
        const fin = texto.lastIndexOf(")");

        if (inicio === -1 || fin === -1) {
            throw new Error(
                "Respuesta inválida de modelo_materiales"
            );
        }

        const json = JSON.parse(
            texto.substring(
                inicio + 1,
                fin
            )
        );

        if (!json.success) {
            throw new Error(
                json.error || "Error en la API"
            );
        }

        const materiales =
            json.data.filter(
                item =>
                    Number(item.modelo_id) ===
                    Number(modeloId)
            );

        mostrarMaterialesModelo(materiales);

    } catch (error) {

        console.error(
            "Error cargando materiales:",
            error
        );

        container.innerHTML = `
            <div class="materiales-error">
                No se pudieron cargar los materiales.
            </div>
        `;

    }

}

function mostrarMaterialesModelo(materiales) {

    const container =
        document.getElementById(
            "modelo-materiales-container"
        );

    if (!container) {
        return;
    }

    if (!materiales || materiales.length === 0) {

        container.innerHTML = `
            <div class="materiales-vacio">
                Este modelo todavía no tiene
                materiales cargados.
            </div>

            <button
                type="button"
                class="btn-agregar-material"
                onclick="abrirAgregarMaterial()"
            >
                + AGREGAR MATERIAL
            </button>
        `;

        return;
    }

    let html = "";

    materiales.forEach(material => {

        html += `
            <div class="material-modelo-item">

                <div class="material-modelo-info">

                    <strong>
                        ${material.material_nombre || material.nombre || ""}
                    </strong>

                    <span>
                        ${material.cantidad || 0}
                        ${material.unidad || ""}
                    </span>

                </div>

            </div>
        `;

    });

    html += `
        <button
            type="button"
            class="btn-agregar-material"
            onclick="abrirAgregarMaterial()"
        >
            + AGREGAR MATERIAL
        </button>
    `;

    container.innerHTML = html;
}

/* =========================
   LISTA DE MATERIALES
========================= */

let materiales = [];


async function cargarMateriales() {

    try {

        const response =
            await fetch(
                `${API_URL}?resource=materiales&callback=zariaCallback`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const texto =
            await response.text();


        const inicio =
            texto.indexOf("(");


        const fin =
            texto.lastIndexOf(")");


        if (
            inicio === -1 ||
            fin === -1
        ) {

            throw new Error(
                "Respuesta inválida de materiales"
            );

        }


        const json =
            JSON.parse(
                texto.substring(
                    inicio + 1,
                    fin
                )
            );


        if (!json.success) {

            throw new Error(
                json.error ||
                "Error en la API"
            );

        }


        materiales =
            json.data.filter(
                material =>
                    material.activo === true ||
                    material.activo === "TRUE" ||
                    material.activo === "VERDADERO"
            );


    } catch (error) {

        console.error(
            "Error cargando materiales:",
            error
        );

        materiales = [];

    }

}

/* =========================
   EDITAR MODELO
========================= */

function editarModelo(id) {

    const modelo =
        modelos.find(
            item =>
                String(item.modelo_id) ===
                String(id)
        );


    if (!modelo) {

        alert(
            "No se encontró el modelo."
        );

        return;

    }


    const modal =
        document.createElement("div");


    modal.className =
        "modelo-editar-modal";


    modal.innerHTML = `

        <div class="modelo-editar-overlay"></div>


        <div class="modelo-editar-contenido">


            <button
                type="button"
                class="modelo-editar-cerrar"
            >
                ×
            </button>


            <div class="modelo-editar-header">

                <span>
                    EDITAR MODELO
                </span>

                <h2>
                    ${escaparHTML(
                        modelo.nombre
                    )}
                </h2>

            </div>


            <form id="form-editar-modelo">


                <div class="form-grid">


                    <!-- CODIGO -->

                    <div class="campo">

                        <label>
                            CÓDIGO
                        </label>

                        <input
                            type="text"
                            value="${escaparHTML(
                                modelo.codigo
                            )}"
                            disabled
                        >

                        <small>
                            El código es permanente.
                        </small>

                    </div>


                    <!-- NOMBRE -->

                    <div class="campo">

                        <label>
                            NOMBRE
                        </label>

                        <input
                            type="text"
                            name="nombre"
                            value="${escaparHTML(
                                modelo.nombre
                            )}"
                            required
                        >

                    </div>


                    <!-- TIPO -->

                    <div class="campo">

                        <label>
                            TIPO
                        </label>

                        <select
                            name="tipo"
                            required
                        >

                            ${crearOpcionesTipo(
                                modelo.tipo
                            )}

                        </select>

                    </div>


                    <!-- MATERIAL -->

                    <div class="campo">

                        <label>
                            MATERIAL
                        </label>

                        <input
                            type="text"
                            name="material_base"
                            value="${escaparHTML(
                                modelo.material_base
                            )}"
                        >

                    </div>


                    <!-- COSTO -->

                    <div class="campo">

                        <label>
                            COSTO
                        </label>

                        <input
                            type="number"
                            name="costo"
                            min="0"
                            step="1"
                            value="${escaparHTML(
                                modelo.costo
                            )}"
                        >

                    </div>


                    <!-- PRECIO -->

                    <div class="campo">

                        <label>
                            PRECIO DE VENTA
                        </label>

                        <input
                            type="number"
                            name="precio_venta"
                            min="0"
                            step="1"
                            value="${escaparHTML(
                                modelo.precio_venta
                            )}"
                        >

                    </div>


                    <!-- IMAGEN -->

                    <div class="campo">

                        <label>
                            IMAGEN
                        </label>

                        <input
                            type="url"
                            name="imagen"
                            value="${escaparHTML(
                                modelo.imagen
                            )}"
                            placeholder="URL de Google Drive"
                        >

                    </div>


                    <!-- IMAGEN 2 -->

                    <div class="campo">

                        <label>
                            IMAGEN 2
                        </label>

                        <input
                            type="url"
                            name="imagen_2"
                            value="${escaparHTML(
                                modelo.imagen_2
                            )}"
                            placeholder="URL de Google Drive"
                        >

                    </div>


                    <!-- DESCRIPCIÓN -->

                    <div class="campo campo-completo">

                        <label>
                            DESCRIPCIÓN
                        </label>

                        <textarea
                            name="descripcion"
                            rows="5"
                        >${escaparHTML(
                            modelo.descripcion
                        )}</textarea>

                    </div>


                    <!-- MEDIDAS -->

                    <div class="campo campo-completo">

                        <label>
                            MEDIDAS
                        </label>

                        <textarea
                            name="medidas"
                            rows="5"
                        >${escaparHTML(
                            modelo.medidas
                        )}</textarea>

                    </div>


                    <!-- ACTIVO -->

                    <div class="campo campo-activo">

                        <label>
                            ACTIVO
                        </label>

                        <label class="switch">

                            <input
                                type="checkbox"
                                name="activo"
                                ${
                                    modelo.activo === true ||
                                    String(modelo.activo)
                                        .toUpperCase() ===
                                    "TRUE"
                                    ? "checked"
                                    : ""
                                }
                            >

                            <span class="slider"></span>

                        </label>

                    </div>


                </div>


                <div
                    class="modelo-editar-mensaje"
                    id="editar-mensaje"
                ></div>


                <div class="modelo-editar-botones">


                    <button
                        type="button"
                        class="btn-cancelar-editar"
                    >
                        CANCELAR
                    </button>


                    <button
                        type="submit"
                        class="btn-guardar-editar"
                    >
                        GUARDAR CAMBIOS
                    </button>


                </div>


            </form>


        </div>

    `;


    document.body.appendChild(modal);


    agregarEstilosEditor();


    const formulario =
        modal.querySelector(
            "#form-editar-modelo"
        );


    const botonCerrar =
        modal.querySelector(
            ".modelo-editar-cerrar"
        );


    const overlay =
        modal.querySelector(
            ".modelo-editar-overlay"
        );


    const botonCancelar =
        modal.querySelector(
            ".btn-cancelar-editar"
        );


    botonCerrar.addEventListener(
        "click",
        () => modal.remove()
    );


    overlay.addEventListener(
        "click",
        () => modal.remove()
    );


    botonCancelar.addEventListener(
        "click",
        () => modal.remove()
    );


    formulario.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            await guardarModelo(
                modelo,
                formulario,
                modal
            );

        }
    );

}


/* =========================
   OPCIONES TIPO
========================= */

function crearOpcionesTipo(tipoActual) {

    let opciones = `

        <option value="">
            Seleccionar...
        </option>

    `;


    tipos.forEach(tipo => {

        const seleccionado =
            String(tipo.valor)
                .toUpperCase() ===
            String(tipoActual)
                .toUpperCase()
                ? "selected"
                : "";


        opciones += `

            <option
                value="${escaparHTML(
                    tipo.valor
                )}"
                ${seleccionado}
            >

                ${escaparHTML(
                    tipo.valor
                )}

            </option>

        `;

    });


    /*
     * Si por alguna razón el tipo actual
     * no estuviera en CONFIGURACION,
     * lo agregamos para no perderlo.
     */

    const existe =
        tipos.some(
            tipo =>
                String(tipo.valor)
                    .toUpperCase() ===
                String(tipoActual)
                    .toUpperCase()
        );


    if (
        tipoActual &&
        !existe
    ) {

        opciones += `

            <option
                value="${escaparHTML(
                    tipoActual
                )}"
                selected
            >

                ${escaparHTML(
                    tipoActual
                )}

            </option>

        `;

    }


    return opciones;

}


/* =========================
   GUARDAR MODELO
========================= */

async function guardarModelo(
    modelo,
    formulario,
    modal
) {

    const boton =
        formulario.querySelector(
            ".btn-guardar-editar"
        );


    const mensaje =
        formulario.querySelector(
            "#editar-mensaje"
        );


    boton.disabled = true;

    boton.textContent =
        "GUARDANDO...";


    mensaje.textContent = "";


    const formData =
        new FormData(formulario);


    const data = {

        nombre:
            formData.get("nombre")
                .trim(),

        tipo:
            formData.get("tipo"),

        material_base:
            formData.get("material_base")
                .trim(),

        costo:
            formData.get("costo") === ""
                ? ""
                : Number(
                    formData.get("costo")
                ),

        precio_venta:
            formData.get("precio_venta") === ""
                ? ""
                : Number(
                    formData.get(
                        "precio_venta"
                    )
                ),

        imagen:
            formData.get("imagen")
                .trim(),

        imagen_2:
            formData.get("imagen_2")
                .trim(),

        descripcion:
            formData.get("descripcion")
                .trim(),

        medidas:
            formData.get("medidas")
                .trim(),

        activo:
            formData.get("activo") === "on"

    };


    /*
     * IMPORTANTE:
     *
     * NO enviamos:
     *
     * modelo_id
     * codigo
     * created_at
     * updated_at
     *
     * El servidor los protege.
     */


    try {

        /*
         * Google Apps Script puede recibir
         * el POST mediante un formulario.
         *
         * Esto evita el problema CORS que
         * tuvimos anteriormente con fetch().
         */


        const iframe =
            document.createElement(
                "iframe"
            );


        const iframeName =
            "zariaPost_" +
            Date.now();


        iframe.name =
            iframeName;


        iframe.style.display =
            "none";


        document.body.appendChild(
            iframe
        );


        const form =
            document.createElement(
                "form"
            );


        form.method =
            "POST";


        form.action =
            API_URL;


        form.target =
            iframeName;


        form.style.display =
            "none";


        const payload =
            document.createElement(
                "input"
            );


        payload.type =
            "hidden";


        payload.name =
            "payload";


        payload.value =
            JSON.stringify({

                action: "update",

                resource: "modelos",

                id:
                    modelo.modelo_id,

                data: data

            });


        form.appendChild(
            payload
        );


        document.body.appendChild(
            form
        );


        /*
         * Esperamos la carga del iframe.
         */

        iframe.onload =
            function() {

                mensaje.textContent =
                    "Cambios guardados correctamente.";

                mensaje.className =
                    "modelo-editar-mensaje exito";


                setTimeout(
                    async function() {

                        form.remove();

                        iframe.remove();

                        modal.remove();


                        /*
                         * Volvemos a cargar
                         * modelos desde Sheets.
                         */

                        try {

                            modelos =
                                await llamarAPI(
                                    "modelos"
                                );

                            mostrarModelos();

                        } catch (error) {

                            console.error(
                                error
                            );

                        }

                    },
                    800
                );

            };


        form.submit();


    } catch (error) {

        console.error(error);


        mensaje.textContent =
            "No se pudieron guardar los cambios.";


        mensaje.className =
            "modelo-editar-mensaje error";


        boton.disabled =
            false;


        boton.textContent =
            "GUARDAR CAMBIOS";

    }

}


/* =========================
   ESTILOS DEL EDITOR
========================= */

function agregarEstilosEditor() {

    if (
        document.getElementById(
            "zaria-editor-styles"
        )
    ) {
        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "zaria-editor-styles";


    style.textContent = `

        .modelo-editar-modal {

            position: fixed;

            inset: 0;

            z-index: 99999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 25px;

        }


        .modelo-editar-overlay {

            position: absolute;

            inset: 0;

            background:
                rgba(0,0,0,0.65);

            backdrop-filter:
                blur(3px);

        }


        .modelo-editar-contenido {

            position: relative;

            z-index: 2;

            width: min(
                850px,
                100%
            );

            max-height: 92vh;

            overflow-y: auto;

            background: #ffffff;

            border-radius: 16px;

            padding: 35px;

            box-shadow:
                0 20px 60px
                rgba(0,0,0,0.25);

        }


        .modelo-editar-cerrar {

            position: absolute;

            top: 15px;

            right: 18px;

            border: none;

            background: none;

            font-size: 30px;

            line-height: 1;

            cursor: pointer;

            color: #333;

        }


        .modelo-editar-header {

            margin-bottom: 28px;

            padding-right: 35px;

        }


        .modelo-editar-header span {

            font-size: 11px;

            letter-spacing: 2px;

            color: #777;

        }


        .modelo-editar-header h2 {

            margin:
                6px 0 0;

            font-size: 28px;

        }


        .form-grid {

            display: grid;

            grid-template-columns:
                repeat(2, 1fr);

            gap: 20px;

        }


        .campo {

            display: flex;

            flex-direction: column;

            gap: 7px;

        }


        .campo-completo {

            grid-column:
                1 / -1;

        }


        .campo label {

            font-size: 11px;

            font-weight: bold;

            letter-spacing: 1px;

            color: #444;

        }


        .campo input,
        .campo select,
        .campo textarea {

            width: 100%;

            border:
                1px solid #d8d3cf;

            border-radius: 8px;

            padding: 11px 12px;

            font-family: inherit;

            font-size: 14px;

            background: #fff;

            outline: none;

        }


        .campo input:focus,
        .campo select:focus,
        .campo textarea:focus {

            border-color: #555;

        }


        .campo input:disabled {

            background: #f2f0ee;

            color: #777;

            cursor: not-allowed;

        }


        .campo small {

            color: #888;

            font-size: 11px;

        }


        .campo textarea {

            resize: vertical;

            line-height: 1.5;

        }


        .campo-activo {

            flex-direction: row;

            align-items: center;

            gap: 15px;

        }


        .switch {

            position: relative;

            width: 48px;

            height: 26px;

            display: inline-block;

        }


        .switch input {

            opacity: 0;

            width: 0;

            height: 0;

        }


        .slider {

            position: absolute;

            inset: 0;

            background: #ccc;

            border-radius: 30px;

            cursor: pointer;

            transition: 0.2s;

        }


        .slider:before {

            content: "";

            position: absolute;

            width: 20px;

            height: 20px;

            left: 3px;

            top: 3px;

            background: white;

            border-radius: 50%;

            transition: 0.2s;

        }


        .switch input:checked
        + .slider {

            background: #1d1a1a;

        }


        .switch input:checked
        + .slider:before {

            transform:
                translateX(22px);

        }


        .modelo-editar-mensaje {

            min-height: 20px;

            margin-top: 20px;

            font-size: 13px;

        }


        .modelo-editar-mensaje.exito {

            color: #2d6a3f;

        }


        .modelo-editar-mensaje.error {

            color: #a33;

        }


        .modelo-editar-botones {

            display: flex;

            justify-content: flex-end;

            gap: 10px;

            margin-top: 25px;

            padding-top: 20px;

            border-top:
                1px solid #eee;

        }


        .modelo-editar-botones button {

            height: 42px;

            padding:
                0 20px;

            border-radius: 8px;

            font-size: 12px;

            font-weight: bold;

            letter-spacing: .5px;

            cursor: pointer;

        }


        .btn-cancelar-editar {

            background: white;

            color: #1d1a1a;

            border:
                1px solid #1d1a1a;

        }


        .btn-guardar-editar {

            background: #1d1a1a;

            color: white;

            border:
                1px solid #1d1a1a;

        }


        .btn-guardar-editar:disabled {

            opacity: .6;

            cursor: wait;

        }


        @media (
            max-width: 700px
        ) {

            .modelo-editar-modal {

                padding: 10px;

            }


            .modelo-editar-contenido {

                padding: 25px 20px;

                max-height: 95vh;

            }


            .form-grid {

                grid-template-columns:
                    1fr;

            }


            .campo-completo {

                grid-column:
                    auto;

            }


            .modelo-editar-botones {

                flex-direction: column;

            }


            .modelo-editar-botones button {

                width: 100%;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================
   IMAGEN DRIVE
========================= */

function convertirImagenDrive(url) {

    if (!url) {
        return "";
    }

    url = String(url).trim();

    // Si ya es una URL de thumbnail de Drive
    if (url.includes("drive.google.com/thumbnail")) {
        return url;
    }

    // Detectar ID en enlaces:
    // https://drive.google.com/file/d/ID/view
    // https://drive.google.com/open?id=ID
    // https://drive.google.com/uc?id=ID
    let fileId = "";

    const matchArchivo = url.match(/\/file\/d\/([^/]+)/);

    if (matchArchivo) {
        fileId = matchArchivo[1];
    }

    if (!fileId) {
        const matchId = url.match(/[?&]id=([^&]+)/);

        if (matchId) {
            fileId = matchId[1];
        }
    }

    // Si no pudimos obtener el ID,
    // dejamos la URL original
    if (!fileId) {
        return url;
    }

    // URL de imagen optimizada de Google Drive
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}


/* =========================
   PRECIO
========================= */

function formatearPrecio(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return "";

    }


    const numero =
        Number(valor);


    if (isNaN(numero)) {

        return valor;

    }


    return numero.toLocaleString(
        "es-AR",
        {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0
        }
    );

}


/* =========================
   HTML SEGURO
========================= */

function escaparHTML(texto) {

    if (
        texto === null ||
        texto === undefined
    ) {

        return "";

    }


    return String(texto)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================
   ARRANCAR
========================= */

iniciarAplicacion();
cargarMateriales();
