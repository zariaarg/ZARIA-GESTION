const API_URL = "https://script.google.com/macros/s/AKfycbyZzZQhIyQAdZv2G4YqUqvb_wThnq_S_PPq81YET8W-vBVs7O9No7KOb1_stS2XbMvO/exec";

/* =========================
   EMPRESA ACTUAL
========================= */

let empresas = [];

let empresaActual = null;

let modelos = [];
let tipos = [];
let materiales = [];

let filtroActual = "TODOS";
let busquedaActual = "";
let vistaActual = "dashboard";

/* =========================
   API JSONP
========================= */

function llamarAPI(
    resource,
    empresaId = null
) {

    return new Promise(
        (resolve, reject) => {

            const callbackName =
                "zariaCallback_" +
                Date.now() +
                "_" +
                Math.floor(
                    Math.random() * 1000
                );


            const script =
                document.createElement(
                    "script"
                );


            window[callbackName] =
                function(result) {

                    delete window[
                        callbackName
                    ];

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


                    resolve(
                        result.data
                    );

                };


            script.onerror =
                function() {

                    delete window[
                        callbackName
                    ];

                    script.remove();


                    reject(
                        new Error(
                            "No se pudo conectar con la API"
                        )
                    );

                };


            let url =
                `${API_URL}?resource=${encodeURIComponent(resource)}&callback=${callbackName}`;


            if (empresaId) {

                url +=
                    `&empresa_id=${encodeURIComponent(empresaId)}`;

            }


            script.src =
                url;


            document.body.appendChild(
                script
            );

        }
    );

}


/* =========================
   INICIO
========================= */

/* =========================
   INICIO VISTA MODELOS
========================= */

async function iniciarAplicacion() {

    const container =
        document.getElementById(
            "modelos-container"
        );

    if (!container) {
        console.warn(
            "No existe #modelos-container"
        );
        return;
    }

    vistaActual = "modelos";

    try {

        container.innerHTML = `
            <p>Cargando modelos...</p>
        `;

        /*
         * Si por alguna razón todavía
         * no hay empresa, la cargamos.
         */

        if (!empresaActual) {

            await cargarEmpresas();

        }

        if (!empresaActual) {

            throw new Error(
                "No hay una empresa seleccionada."
            );

        }

        /*
         * Cargamos solamente los datos
         * necesarios para la pantalla MODELOS.
         */

        const [
            modelosData,
            configuracion
        ] = await Promise.all([

            llamarAPI(
                "modelos",
                empresaActual.empresa_id
            ),

            llamarAPI(
                "configuracion"
            )

        ]);

        modelos =
            modelosData || [];

        tipos =
            (configuracion || [])

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

        /*
         * Materiales solamente los necesitamos
         * dentro del módulo MODELOS.
         */

        await cargarMateriales();

        /*
         * IMPORTANTE:
         *
         * Los controles se crean dentro de
         * #modelos-view, NO dentro de .main.
         */

        crearControles();

        mostrarModelos();

    } catch (error) {

        console.error(
            "Error cargando MODELOS:",
            error
        );

        container.innerHTML = `
            <p class="error">
                No se pudieron cargar los modelos.
            </p>
        `;

    }

}

/* =========================
   CONTROLES DE MODELOS
========================= */

function crearControles() {

    /*
     * IMPORTANTE:
     *
     * Antes buscábamos .main.
     * Eso hacía que los controles de
     * MODELOS terminaran apareciendo
     * también en el Dashboard.
     *
     * Ahora buscamos EXCLUSIVAMENTE
     * dentro de #modelos-view.
     */

    const modelosView =
        document.getElementById(
            "modelos-view"
        );

    if (!modelosView) {

        console.warn(
            "No existe #modelos-view"
        );

        return;

    }


    let controles =
        document.getElementById(
            "modelos-controles"
        );


    if (!controles) {

        controles =
            document.createElement(
                "div"
            );

        controles.id =
            "modelos-controles";


        /*
         * Buscamos el título de MODELOS
         * únicamente dentro de su vista.
         */

        const titulo =
            modelosView.querySelector(
                "h2"
            );


        const container =
            document.getElementById(
                "modelos-container"
            );


        if (titulo) {

            titulo.insertAdjacentElement(
                "afterend",
                controles
            );

        } else if (container) {

            container.insertAdjacentElement(
                "beforebegin",
                controles
            );

        } else {

            modelosView.appendChild(
                controles
            );

        }

    }


    controles.innerHTML = `

        <div class="modelos-toolbar">

            <div class="modelos-busqueda">

                <input
                    type="text"
                    id="buscar-modelo"
                    placeholder="Buscar modelo..."
                    autocomplete="off"
                >

            </div>


            <div class="modelos-filtro">

                <select id="filtro-tipo">

                    <option value="TODOS">
                        TODOS
                    </option>

                    ${tipos.map(tipo => `

                        <option
                            value="${escaparHTML(
                                tipo.valor
                            )}"
                        >
                            ${escaparHTML(
                                tipo.valor
                            )}
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
        controles.querySelector(
            "#buscar-modelo"
        );


    const filtro =
        controles.querySelector(
            "#filtro-tipo"
        );


    const botonNuevo =
        controles.querySelector(
            "#btn-nuevo-modelo"
        );


    /*
     * Restauramos los valores actuales
     * si volvemos a entrar a MODELOS.
     */

    if (buscador) {

        buscador.value =
            busquedaActual;

    }


    if (filtro) {

        filtro.value =
            filtroActual;

    }


    if (buscador) {

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

    }


    if (filtro) {

        filtro.addEventListener(
            "change",
            function() {

                filtroActual =
                    this.value;

                mostrarModelos();

            }
        );

    }


    if (botonNuevo) {

        botonNuevo.addEventListener(
            "click",
            function() {

                abrirNuevoModelo();

            }
        );

    }

}


/* =========================
   CARGAR EMPRESAS
========================= */

async function cargarEmpresas() {

    try {

        const empresasData =
            await llamarAPI("empresas");


        empresas =
            empresasData || [];


        await establecerEmpresaInicial();


        mostrarEmpresas();


    } catch (error) {

        console.error(
            "Error cargando empresas:",
            error
        );


        empresas = [];

        empresaActual = null;

    }

}


/* =========================
   EMPRESA INICIAL
========================= */

async function establecerEmpresaInicial() {

    try {

        const configuracion =
            await llamarAPI(
                "config_sistema"
            );


        const parametro =
            configuracion.find(
                item =>
                    String(item.parametro)
                        .toLowerCase() ===
                    "empresa_default_id"
            );


        const empresaDefaultId =
            parametro
                ? Number(parametro.valor)
                : 1;


        empresaActual =
            empresas.find(
                empresa =>
                    Number(
                        empresa.empresa_id
                    ) ===
                    empresaDefaultId
            );


        /*
         * Si por alguna razón la empresa
         * configurada no existe, usamos
         * la primera empresa activa.
         */

        if (!empresaActual) {

            empresaActual =
                empresas.find(
                    empresa =>
                        empresa.activo === true ||
                        String(
                            empresa.activo
                        ).toUpperCase() ===
                        "TRUE"
                ) ||
                empresas[0] ||
                null;

        }


    } catch (error) {

        console.error(
            "Error determinando empresa:",
            error
        );


        /*
         * Fallback:
         * empresa 1.
         */

        empresaActual =
            empresas.find(
                empresa =>
                    Number(
                        empresa.empresa_id
                    ) === 1
            ) ||
            empresas[0] ||
            null;

    }

}


/* =========================
   MOSTRAR EMPRESAS
========================= */

function mostrarEmpresas() {

    const select =
        document.getElementById(
            "empresa-select"
        );


    const logo =
        document.getElementById(
            "empresa-logo"
        );


    if (!select) {
        return;
    }


    select.innerHTML = "";


    empresas
        .filter(
            empresa =>
                empresa.activo === true ||
                String(
                    empresa.activo
                ).toUpperCase() === "TRUE"
        )
        .forEach(
            empresa => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    empresa.empresa_id;


                option.textContent =
                    empresa.nombre_comercial ||
                    empresa.nombre;


                if (
                    empresaActual &&
                    Number(
                        empresa.empresa_id
                    ) ===
                    Number(
                        empresaActual.empresa_id
                    )
                ) {

                    option.selected = true;

                }


                select.appendChild(
                    option
                );

            }
        );


    if (
        empresaActual &&
        logo
    ) {

        logo.src =
            convertirImagenDrive(
                empresaActual.logo
            );


        logo.alt =
            empresaActual.nombre_comercial ||
            empresaActual.nombre ||
            "";

    }


    select.onchange =
        cambiarEmpresa;

}


/* =========================
   CAMBIAR EMPRESA
========================= */

async function cambiarEmpresa(event) {

    const empresaId =
        Number(
            event.target.value
        );


    const nuevaEmpresa =
        empresas.find(
            empresa =>
                Number(
                    empresa.empresa_id
                ) ===
                empresaId
        );


    if (!nuevaEmpresa) {
        return;
    }


    /*
     * Cambiamos la empresa actual.
     */

    empresaActual =
        nuevaEmpresa;


    /*
     * Actualizamos logo.
     */

    const logo =
        document.getElementById(
            "empresa-logo"
        );


    if (logo) {

        logo.src =
            convertirImagenDrive(
                empresaActual.logo
            );


        logo.alt =
            empresaActual.nombre_comercial ||
            empresaActual.nombre ||
            "";

    }


    /*
     * Reiniciamos filtros de MODELOS.
     */

    filtroActual =
        "TODOS";

    busquedaActual =
        "";


    /*
     * Limpiamos los controles si existen.
     */

    const buscador =
        document.getElementById(
            "buscar-modelo"
        );


    const filtro =
        document.getElementById(
            "filtro-tipo"
        );


    if (buscador) {

        buscador.value =
            "";

    }


    if (filtro) {

        filtro.value =
            "TODOS";

    }


    try {

        /*
         * Actualizamos materiales para
         * la nueva empresa.
         */

        await cargarMateriales();


        /*
         * Si estamos en MODELOS,
         * recargamos la pantalla.
         */

        if (
            vistaActual ===
            "modelos"
        ) {

            await iniciarAplicacion();

        }


        /*
         * Si estamos en Dashboard,
         * actualizamos sus estadísticas.
         */

        if (
            vistaActual ===
            "dashboard"
        ) {

            await iniciarDashboard();

        }

    } catch (error) {

        console.error(
            "Error cambiando de empresa:",
            error
        );


        alert(
            "No se pudieron cargar los datos de la empresa seleccionada."
        );

    }
}

/* =========================
   MOSTRAR MODELOS
========================= */

function mostrarModelos() {

    const container =
        document.getElementById(
            "modelos-container"
        );


    if (!container) {
        return;
    }


    const modelosFiltrados =
        modelos.filter(modelo => {


            /*
             * Seguridad adicional:
             * aunque el servidor ya filtre,
             * también verificamos empresa_id
             * en el navegador.
             */

            const coincideEmpresa =
                !empresaActual ||
                Number(modelo.empresa_id) ===
                Number(empresaActual.empresa_id);


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
                coincideEmpresa &&
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
                String(id) &&
                (
                    !empresaActual ||
                    Number(item.empresa_id) ===
                    Number(
                        empresaActual.empresa_id
                    )
                )
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


    /*
     * CARGAR MATERIALES
     */

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
        () =>
            guardarMaterialModelo(
                modal,
                modeloId
            )
    );

}


/* =========================
   GUARDAR MATERIAL MODELO
========================= */

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

                            empresa_id:
                                empresaActual
                                    ? empresaActual.empresa_id
                                    : 1,

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

async function cargarMaterialesModelo(
    modeloId
) {

    const container =
        document.getElementById(
            "modelo-materiales-container"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="materiales-cargando">
            Cargando materiales...
        </div>
    `;


    try {

        const data =
            await llamarAPI(
                "modelo_materiales",
                empresaActual
                    ? empresaActual.empresa_id
                    : null
            );


        const materialesModelo =
            (data || []).filter(
                item =>
                    Number(item.modelo_id) ===
                    Number(modeloId) &&

                    (
                        !empresaActual ||

                        Number(item.empresa_id) ===
                        Number(
                            empresaActual.empresa_id
                        )
                    )
            );


        const materialesCompletos =
            materialesModelo.map(
                item => {

                    const material =
                        materiales.find(
                            material =>
                                Number(
                                    material.material_id
                                ) ===
                                Number(
                                    item.material_id
                                )
                        );


                    return {

                        ...item,

                        nombre:
                            material
                                ? material.nombre
                                : `Material #${item.material_id}`

                    };

                }
            );


        mostrarMaterialesModelo(
            materialesCompletos
        );


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


/* =========================
   MOSTRAR MATERIALES MODELO
========================= */

function mostrarMaterialesModelo(materialesModelo) {

    const container =
        document.getElementById(
            "modelo-materiales-container"
        );


    if (!container) {
        return;
    }


    if (
        !materialesModelo ||
        materialesModelo.length === 0
    ) {

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


    materialesModelo.forEach(material => {

        html += `
            <div class="material-modelo-item">

                <div class="material-modelo-info">

                    <strong>
                        ${
                            material.material_nombre ||
                            material.nombre ||
                            ""
                        }
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


    container.innerHTML =
        html;

}


/* =========================
   LISTA DE MATERIALES
========================= */

async function cargarMateriales() {

    try {

        const data =
            await llamarAPI(
                "materiales"
            );


        materiales =
            (data || []).filter(
                material =>

                    material.activo === true ||

                    String(
                        material.activo
                    ).toUpperCase() ===
                    "TRUE" ||

                    String(
                        material.activo
                    ).toUpperCase() ===
                    "VERDADERO"
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
   NUEVO MODELO
========================= */

function abrirNuevoModelo() {

    if (!empresaActual) {

        alert(
            "No hay una empresa seleccionada."
        );

        return;

    }


    const modal =
        document.createElement("div");


    modal.className =
        "modelo-nuevo-modal";


    modal.innerHTML = `

        <div class="modelo-nuevo-overlay"></div>


        <div class="modelo-nuevo-contenido">


            <button
                type="button"
                class="modelo-nuevo-cerrar"
            >
                ×
            </button>


            <div class="modelo-nuevo-header">

                <span>
                    NUEVO MODELO
                </span>

                <h2>
                    Crear modelo
                </h2>

                <p>
                    Empresa:
                    <strong>
                        ${escaparHTML(
                            empresaActual.nombre_comercial ||
                            empresaActual.nombre ||
                            ""
                        )}
                    </strong>
                </p>

            </div>


            <form id="form-nuevo-modelo">


                <div class="form-grid">


                    <!-- CÓDIGO -->

                    <div class="campo">

                        <label>
                            CÓDIGO
                        </label>

                        <input
                            type="text"
                            name="codigo"
                            placeholder="Ej: Z-010"
                            required
                        >

                        <small>
                            Ingresá el código del modelo.
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

                            ${crearOpcionesTipo("")}

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
                            placeholder="Ej: Cuero vacuno"
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
                            placeholder="0"
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
                            placeholder="0"
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
                        ></textarea>

                    </div>


                    <!-- MEDIDAS -->

                    <div class="campo campo-completo">

                        <label>
                            MEDIDAS
                        </label>

                        <textarea
                            name="medidas"
                            rows="5"
                        ></textarea>

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
                                checked
                            >

                            <span class="slider"></span>

                        </label>

                    </div>


                </div>


                <div
                    class="modelo-nuevo-mensaje"
                    id="nuevo-mensaje"
                ></div>


                <div class="modelo-nuevo-botones">


                    <button
                        type="button"
                        class="btn-cancelar-nuevo"
                    >
                        CANCELAR
                    </button>


                    <button
                        type="submit"
                        class="btn-guardar-nuevo"
                    >
                        CREAR MODELO
                    </button>


                </div>


            </form>


        </div>

    `;

    agregarEstilosNuevoModelo();

    document.body.appendChild(modal);

    const formulario =
        modal.querySelector(
            "#form-nuevo-modelo"
        );

    const cerrarModal =
        () => modal.remove();


    modal
        .querySelector(
            ".modelo-nuevo-cerrar"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    modal
        .querySelector(
            ".modelo-nuevo-overlay"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    modal
        .querySelector(
            ".btn-cancelar-nuevo"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    formulario.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            await guardarNuevoModelo(
                formulario,
                modal
            );

        }
    );

}

/* =========================
   GUARDAR NUEVO MODELO
========================= */

async function guardarNuevoModelo(
    formulario,
    modal
) {

    const boton =
        formulario.querySelector(
            ".btn-guardar-nuevo"
        );


    const mensaje =
        formulario.querySelector(
            "#nuevo-mensaje"
        );


    const formData =
        new FormData(formulario);


    const codigo =
        String(
            formData.get("codigo") || ""
        ).trim();


    const nombre =
        String(
            formData.get("nombre") || ""
        ).trim();


    const tipo =
        String(
            formData.get("tipo") || ""
        ).trim();


    if (!codigo) {

        alert(
            "Ingresá el código del modelo."
        );

        return;

    }


    if (!nombre) {

        alert(
            "Ingresá el nombre del modelo."
        );

        return;

    }


    if (!tipo) {

        alert(
            "Seleccioná un tipo."
        );

        return;

    }


    if (!empresaActual) {

        alert(
            "No hay una empresa seleccionada."
        );

        return;

    }


    const data = {

        empresa_id:
            Number(
                empresaActual.empresa_id
            ),

        codigo:
            codigo,

        nombre:
            nombre,

        tipo:
            tipo,

        material_base:
            String(
                formData.get(
                    "material_base"
                ) || ""
            ).trim(),

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
            String(
                formData.get(
                    "imagen"
                ) || ""
            ).trim(),

        imagen_2:
            String(
                formData.get(
                    "imagen_2"
                ) || ""
            ).trim(),

        descripcion:
            String(
                formData.get(
                    "descripcion"
                ) || ""
            ).trim(),

        medidas:
            String(
                formData.get(
                    "medidas"
                ) || ""
            ).trim(),

        activo:
            formData.get("activo") === "on"

    };


    boton.disabled = true;

    boton.textContent =
        "CREANDO...";

    mensaje.textContent =
        "Guardando modelo...";

    mensaje.className =
        "modelo-nuevo-mensaje";


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

                            action:
                                "insert",

                            resource:
                                "modelos",

                            data:
                                data

                        })

                }
            );


        const resultado =
            await response.json();


        if (!resultado.success) {

            throw new Error(
                resultado.error ||
                "No se pudo crear el modelo."
            );

        }


        mensaje.textContent =
            "Modelo creado correctamente.";

        mensaje.className =
            "modelo-nuevo-mensaje exito";


        setTimeout(
            async function() {

                modal.remove();


                try {

                    modelos =
                        await llamarAPI(
                            "modelos",
                            empresaActual.empresa_id
                        );

                    mostrarModelos();

                } catch (error) {

                    console.error(
                        error
                    );

                }

            },
            700
        );


    } catch (error) {

        console.error(
            "Error creando modelo:",
            error
        );


        mensaje.textContent =
            "No se pudo crear el modelo.";

        mensaje.className =
            "modelo-nuevo-mensaje error";


        boton.disabled =
            false;

        boton.textContent =
            "CREAR MODELO";


        alert(
            "No se pudo crear el modelo.\n\n" +
            error.message
        );

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
                String(id) &&

                (
                    !empresaActual ||
                    Number(item.empresa_id) ===
                    Number(
                        empresaActual.empresa_id
                    )
                )
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

        empresa_id:
            empresaActual
                ? empresaActual.empresa_id
                : modelo.empresa_id,

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


    try {

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

                empresa_id:
                    empresaActual
                        ? empresaActual.empresa_id
                        : modelo.empresa_id,

                data: data

            });


        form.appendChild(
            payload
        );


        document.body.appendChild(
            form
        );


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
   ESTILOS NUEVO MODELO
========================= */

function agregarEstilosNuevoModelo() {

    if (
        document.getElementById(
            "zaria-nuevo-modelo-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "zaria-nuevo-modelo-styles";

    style.textContent = `

        /* =====================================
           MODAL NUEVO MODELO
        ===================================== */

        .modelo-nuevo-modal {
            position: fixed !important;
            inset: 0 !important;
            z-index: 99999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 25px !important;
            box-sizing: border-box !important;
        }

         .modelo-nuevo-overlay {
            position: absolute !important;
            inset: 0 !important;
           background:
                rgba(0,0,0,0.65) !important;
            backdrop-filter:
                blur(3px);
        }

        /* =====================================
           CONTENEDOR
        ===================================== */

        .modelo-nuevo-contenido {
            position: relative !important;
            z-index: 2 !important;
            width: min(
                850px,
                100%
            ) !important;
            max-height: 92vh !important;
            overflow-y: auto !important;
            background: #ffffff !important;
            border-radius: 16px !important;
            padding: 35px !important;
            box-sizing: border-box !important;
            box-shadow:
                0 20px 60px
                rgba(0,0,0,0.25) !important;
        }

        /* =====================================
           BOTÓN CERRAR
        ===================================== */

        .modelo-nuevo-cerrar {
            position: absolute !important;
            top: 15px !important;
            right: 18px !important;
            border: none !important;
            background: none !important;
            font-size: 30px !important;
           line-height: 1 !important;
            cursor: pointer !important;
            color: #333 !important;
            padding: 5px !important;
        }

        /* =====================================
           CABECERA
        ===================================== */
        .modelo-nuevo-header {
            margin-bottom: 28px !important;
            padding-right: 35px !important;
        }

        .modelo-nuevo-header span {
           font-size: 11px !important;
            letter-spacing: 2px !important;
            color: #777 !important;
        }

        .modelo-nuevo-header h2 {
            margin:
                6px 0 4px !important;
            font-size: 28px !important;
        }

        .modelo-nuevo-header p {
            margin: 0 !important;
            color: #777 !important;
           font-size: 13px !important;
        }

        /* =====================================
           FORMULARIO
        ===================================== */
        #form-nuevo-modelo {
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /*
         * ESTA ES LA PARTE IMPORTANTE.
         *
         * El formulario tendrá siempre
         * dos columnas en escritorio.
         */
        #form-nuevo-modelo .form-grid {
            display: grid !important;
            grid-template-columns:
                minmax(0, 1fr)
                minmax(0, 1fr) !important;
            column-gap: 22px !important;
            row-gap: 20px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /* =====================================
           CAMPOS
        ===================================== */
        #form-nuevo-modelo .campo {
            display: flex !important;
            flex-direction: column !important;
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        #form-nuevo-modelo .campo label {
            display: block !important;
            margin-bottom: 7px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            letter-spacing: .7px !important;
            color: #333 !important;
        }

        #form-nuevo-modelo .campo small {
            display: block !important;
            margin-top: 6px !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
            color: #888 !important;
        }


        /* =====================================
           INPUTS Y SELECT
        ===================================== */

        #form-nuevo-modelo .campo input:not(
            [type="checkbox"]
        ),

        #form-nuevo-modelo .campo select {

            width: 100% !important;

            height: 44px !important;

            min-height: 44px !important;

            padding:
                0 12px !important;

            border:
                1px solid #d8d8d8 !important;

            border-radius: 8px !important;

            background: #fff !important;

            color: #222 !important;

            font-family: inherit !important;

            font-size: 13px !important;

            box-sizing: border-box !important;

            outline: none !important;

        }


        #form-nuevo-modelo .campo input:not(
            [type="checkbox"]
        ):focus,

        #form-nuevo-modelo .campo select:focus,

        #form-nuevo-modelo .campo textarea:focus {

            border-color: #8a8f62 !important;

            box-shadow:
                0 0 0 2px
                rgba(138,143,98,.12) !important;

        }


        /* =====================================
           TEXTAREAS
        ===================================== */

        #form-nuevo-modelo .campo textarea {

            width: 100% !important;

            min-height: 120px !important;

            padding:
                12px !important;

            border:
                1px solid #d8d8d8 !important;

            border-radius: 8px !important;

            background: #fff !important;

            color: #222 !important;

            font-family: inherit !important;

            font-size: 13px !important;

            line-height: 1.5 !important;

            resize: vertical !important;

            box-sizing: border-box !important;

            outline: none !important;

        }


        /* =====================================
           CAMPOS QUE OCUPAN TODO EL ANCHO
        ===================================== */

        #form-nuevo-modelo .campo-completo {

            grid-column:
                1 / -1 !important;

        }


        /* =====================================
           ACTIVO
        ===================================== */

        #form-nuevo-modelo .campo-activo {

            display: flex !important;

            flex-direction: row !important;

            align-items: center !important;

            gap: 12px !important;

        }


        #form-nuevo-modelo .campo-activo > label:first-child {

            margin: 0 !important;

        }


        /* =====================================
           SWITCH
        ===================================== */

        #form-nuevo-modelo .switch {

            position: relative !important;

            display: inline-block !important;

            width: 46px !important;

            height: 24px !important;

            margin: 0 !important;

        }


        #form-nuevo-modelo .switch input {

            opacity: 0 !important;

            width: 0 !important;

            height: 0 !important;

            position: absolute !important;

        }


        #form-nuevo-modelo .slider {

            position: absolute !important;

            cursor: pointer !important;

            inset: 0 !important;

            background: #ccc !important;

            border-radius: 24px !important;

            transition: .2s !important;

        }


        #form-nuevo-modelo .slider:before {

            content: "" !important;

            position: absolute !important;

            width: 18px !important;

            height: 18px !important;

            left: 3px !important;

            top: 3px !important;

            background: white !important;

            border-radius: 50% !important;

            transition: .2s !important;

        }


        #form-nuevo-modelo .switch input:checked
        + .slider {

            background: #8a8f62 !important;

        }


        #form-nuevo-modelo .switch input:checked
        + .slider:before {

            transform:
                translateX(22px) !important;

        }


        /* =====================================
           MENSAJE
        ===================================== */

        .modelo-nuevo-mensaje {

            min-height: 20px !important;

            margin-top: 20px !important;

            font-size: 13px !important;

        }


        .modelo-nuevo-mensaje.exito {

            color: #2d6a3f !important;

        }


        .modelo-nuevo-mensaje.error {

            color: #a33 !important;

        }


        /* =====================================
           BOTONES
        ===================================== */

        .modelo-nuevo-botones {

            display: flex !important;

            justify-content: flex-end !important;

            gap: 10px !important;

            margin-top: 25px !important;

            padding-top: 20px !important;

            border-top:
                1px solid #eee !important;

        }


        .modelo-nuevo-botones button {

            height: 42px !important;

            padding:
                0 20px !important;

            border-radius: 8px !important;

            font-size: 12px !important;

            font-weight: bold !important;

            letter-spacing: .5px !important;

            cursor: pointer !important;

            box-sizing: border-box !important;

        }


        .btn-cancelar-nuevo {

            background: white !important;

            color: #1d1a1a !important;

            border:
                1px solid #1d1a1a !important;

        }


        .btn-guardar-nuevo {

            background: #1d1a1a !important;

            color: white !important;

            border:
                1px solid #1d1a1a !important;

        }


        .btn-guardar-nuevo:disabled {

            opacity: .6 !important;

            cursor: wait !important;

        }


        /* =====================================
           CELULAR
        ===================================== */

        @media (
            max-width: 700px
        ) {

            .modelo-nuevo-modal {

                padding: 10px !important;

            }


            .modelo-nuevo-contenido {

                width: 100% !important;

                padding:
                    25px 20px !important;

                max-height: 95vh !important;

            }


            #form-nuevo-modelo .form-grid {

                grid-template-columns:
                    1fr !important;

                column-gap: 0 !important;

                row-gap: 18px !important;

            }


            #form-nuevo-modelo .campo-completo {

                grid-column:
                    auto !important;

            }


            .modelo-nuevo-botones {

                flex-direction: column !important;

            }


            .modelo-nuevo-botones button {

                width: 100% !important;

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


    url =
        String(url).trim();


    if (
        url.includes(
            "drive.google.com/thumbnail"
        )
    ) {

        return url;

    }


    let fileId = "";


    const matchArchivo =
        url.match(
            /\/file\/d\/([^/]+)/
        );


    if (matchArchivo) {

        fileId =
            matchArchivo[1];

    }


    if (!fileId) {

        const matchId =
            url.match(
                /[?&]id=([^&]+)/
            );


        if (matchId) {

            fileId =
                matchId[1];

        }

    }


    if (!fileId) {

        return url;

    }


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

/* =========================================================
   DASHBOARD
   ========================================================= */

async function iniciarDashboard() {

    try {

        const [
            pedidos,
            clientes,
            modelosDashboard
        ] = await Promise.all([

            llamarAPI("pedidos"),

            llamarAPI("clientes"),

            llamarAPI("modelos")

        ]);


        const pedidosEmpresa =
            filtrarPorEmpresa(
                pedidos
            );


        const clientesEmpresa =
            filtrarPorEmpresa(
                clientes
            );


        const modelosEmpresa =
            filtrarPorEmpresa(
                modelosDashboard
            );


        mostrarResumenDashboard(
            pedidosEmpresa,
            clientesEmpresa,
            modelosEmpresa
        );


        mostrarEstadosDashboard(
            pedidosEmpresa
        );


    } catch (error) {

        console.error(
            "Error cargando dashboard:",
            error
        );

    }

}


/* =========================================================
   FILTRAR DATOS POR EMPRESA
   ========================================================= */

function filtrarPorEmpresa(data) {

    if (!empresaActual) {

        return data || [];

    }


    const empresaId =
        Number(
            empresaActual.empresa_id
        );


    return (data || []).filter(
        item => {

            if (
                item.empresa_id ===
                undefined
            ) {

                return true;

            }


            if (
                item.empresa_id ===
                null ||
                item.empresa_id === ""
            ) {

                return true;

            }


            return Number(
                item.empresa_id
            ) === empresaId;

        }
    );

}


/* =========================================================
   RESUMEN DASHBOARD
   ========================================================= */

function mostrarResumenDashboard(
    pedidos,
    clientes,
    modelos
) {

    const totalPedidos =
        pedidos.length;


    const totalClientes =
        clientes.length;


    const modelosActivos =
        modelos.filter(
            modelo =>
                modelo.activo === true ||
                String(modelo.activo)
                    .toUpperCase() === "TRUE"
        ).length;


    const ahora =
        new Date();


    const mesActual =
        ahora.getMonth();


    const anioActual =
        ahora.getFullYear();


    const pedidosMes =
        pedidos.filter(
            pedido => {

                const fecha =
                    convertirFecha(
                        pedido.fecha
                    );


                if (!fecha) {

                    return false;

                }


                return (
                    fecha.getMonth() ===
                    mesActual
                    &&
                    fecha.getFullYear() ===
                    anioActual
                );

            }
        );


    const ventasMes =
        pedidosMes.reduce(
            (
                total,
                pedido
            ) => {

                return total +
                    Number(
                        pedido.precio
                    || 0
                    );

            },
            0
        );


    const senasMes =
        pedidosMes.reduce(
            (
                total,
                pedido
            ) => {

                return total +
                    Number(
                        pedido.sena
                    || 0
                    );

            },
            0
        );


    const totalPedidosElemento =
        document.getElementById(
            "dashboard-total-pedidos"
        );


    const totalClientesElemento =
        document.getElementById(
            "dashboard-total-clientes"
        );


    const totalModelosElemento =
        document.getElementById(
            "dashboard-total-modelos"
        );


    const ventasMesElemento =
        document.getElementById(
            "dashboard-ventas-mes"
        );


    const senasMesElemento =
        document.getElementById(
            "dashboard-senas-mes"
        );


    const pedidosMesElemento =
        document.getElementById(
            "dashboard-pedidos-mes"
        );


    if (totalPedidosElemento) {

        totalPedidosElemento.textContent =
            totalPedidos;

    }


    if (totalClientesElemento) {

        totalClientesElemento.textContent =
            totalClientes;

    }


    if (totalModelosElemento) {

        totalModelosElemento.textContent =
            modelosActivos;

    }


    if (ventasMesElemento) {

        ventasMesElemento.textContent =
            formatearPrecio(
                ventasMes
            );

    }


    if (senasMesElemento) {

        senasMesElemento.textContent =
            formatearPrecio(
                senasMes
            );

    }


    if (pedidosMesElemento) {

        pedidosMesElemento.textContent =
            pedidosMes.length;

    }

}


/* =========================================================
   ESTADOS DE PEDIDOS
   ========================================================= */

function mostrarEstadosDashboard(
    pedidos
) {

    const container =
        document.getElementById(
            "dashboard-estados"
        );


    if (!container) {

        return;

    }


    if (!pedidos.length) {

        container.innerHTML = `
            <div class="dashboard-cargando">
                Todavía no hay pedidos registrados.
            </div>
        `;

        return;

    }


    const estados = {};


    pedidos.forEach(
        pedido => {

            const estado =
                String(
                    pedido.estado ||
                    "SIN ESTADO"
                )
                .trim()
                .toUpperCase();


            estados[estado] =
                (
                    estados[estado] ||
                    0
                ) + 1;

        }
    );


    const estadosOrdenados =
        Object.entries(
            estados
        )
        .sort(
            (
                a,
                b
            ) =>
                b[1] - a[1]
        );


    const maximo =
        Math.max(
            ...estadosOrdenados
                .map(
                    item =>
                        item[1]
                )
        );


    container.innerHTML =
        estadosOrdenados
            .map(
                (
                    [estado, cantidad]
                ) => {

                    const porcentaje =
                        maximo > 0
                        ? (
                            cantidad /
                            maximo
                        ) * 100
                        : 0;


                    return `
                        <div class="dashboard-estado">

                            <span class="dashboard-estado-nombre">
                                ${escaparHTML(
                                    formatearEstado(
                                        estado
                                    )
                                )}
                            </span>

                            <div class="dashboard-estado-barra">

                                <div
                                    class="dashboard-estado-progreso"
                                    style="width: ${porcentaje}%"
                                ></div>

                            </div>

                            <span class="dashboard-estado-cantidad">
                                ${cantidad}
                            </span>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   FORMATEAR ESTADO
   ========================================================= */

function formatearEstado(
    estado
) {

    return String(
        estado || ""
    )
        .toLowerCase()
        .replace(
            /\b\w/g,
            letra =>
                letra.toUpperCase()
        );

}


/* =========================================================
   CONVERTIR FECHA
   ========================================================= */

function convertirFecha(
    valor
) {

    if (!valor) {

        return null;

    }


    if (
        valor instanceof Date
    ) {

        return valor;

    }


    const fecha =
        new Date(
            valor
        );


    if (
        isNaN(
            fecha.getTime()
        )
    ) {

        return null;

    }


    return fecha;

}

/* =========================================================
   MOSTRAR DASHBOARD
   ========================================================= */

async function mostrarDashboard() {

    const dashboard =
        document.getElementById("dashboard-view");

    const modelosView =
        document.getElementById("modelos-view");

    vistaActual = "dashboard";

    if (dashboard) {
        dashboard.style.display = "";
        dashboard.setAttribute("aria-hidden", "false");
    }

    if (modelosView) {
        modelosView.style.display = "none";
        modelosView.setAttribute("aria-hidden", "true");
    }

    if (typeof iniciarDashboard === "function") {
        await iniciarDashboard();
    }
}


/* =========================================================
   MOSTRAR MODELOS
   ========================================================= */

async function mostrarVistaModelos() {

    const dashboard =
        document.getElementById("dashboard-view");

    const modelosView =
        document.getElementById("modelos-view");

    vistaActual = "modelos";

    if (dashboard) {
        dashboard.style.display = "none";
        dashboard.setAttribute("aria-hidden", "true");
    }

    if (modelosView) {
        modelosView.style.display = "";
        modelosView.setAttribute("aria-hidden", "false");
    }

    if (typeof iniciarAplicacion === "function") {
        await iniciarAplicacion();
    }
}

/* =========================================================
   BOTONES DASHBOARD
   ========================================================= */

function configurarDashboard() {
    const btnModelos = document.getElementById("btn-dashboard-modelos");
    const btnAccesoModelos = document.getElementById("btn-acceso-modelos");
    const btnClientes = document.getElementById("btn-dashboard-clientes");
    const btnAccesoClientes = document.getElementById("btn-acceso-clientes");
    const btnVolverModelos = document.getElementById("btn-volver-dashboard");
    const btnVolverClientes = document.getElementById("btn-volver-dashboard-clientes");

    if (btnModelos) {
        btnModelos.onclick = function(event) {
            event.preventDefault();
            mostrarVistaModelos();
        };
    }

    if (btnAccesoModelos) {
        btnAccesoModelos.onclick = function(event) {
            event.preventDefault();
            mostrarVistaModelos();
        };
    }

    if (btnClientes) {
        btnClientes.onclick = function(event) {
            event.preventDefault();
            mostrarVistaClientes();
        };
    }

    if (btnAccesoClientes) {
        btnAccesoClientes.onclick = function(event) {
            event.preventDefault();
            mostrarVistaClientes();
        };
    }

    if (btnVolverModelos) {
        btnVolverModelos.onclick = function(event) {
            event.preventDefault();
            mostrarDashboard();
        };
    }

    if (btnVolverClientes) {
        btnVolverClientes.onclick = function(event) {
            event.preventDefault();
            mostrarDashboard();
        };
    }
}

/* =========================================================
   VISTA CLIENTES
   ========================================================= */

function mostrarVistaClientes() {
    const dashboard = document.getElementById("dashboard-view");
    const modelos = document.getElementById("modelos-view");
    const clientes = document.getElementById("clientes-view");

    if (dashboard) {
        dashboard.style.display = "none";
    }

    if (modelos) {
        modelos.style.display = "none";
    }

    if (clientes) {
        clientes.style.display = "block";
    }

    iniciarClientes();
}

/* =========================================================
   INICIAR CLIENTES
   ========================================================= */

async function iniciarClientes() {
    const container = document.getElementById("clientes-container");
    agregarEstilosClientes();
    if (!container) {
        return;
    }

    if (!empresaActual) {
        container.innerHTML = "<p>No hay una empresa seleccionada.</p>";
        return;
    }

    container.innerHTML = `
        <div class="clientes-toolbar">
            <div class="clientes-buscador">
                <span>⌕</span>
                <input
                    type="search"
                    id="buscar-clientes"
                    placeholder="Buscar por nombre, apellido, teléfono o Instagram..."
                    autocomplete="off"
                >
            </div>

            <button
                type="button"
                class="btn-nuevo-cliente"
                id="btn-nuevo-cliente"
            >
                + NUEVO CLIENTE
            </button>
        </div>

        <div id="clientes-lista">
            <p>Cargando clientes...</p>
        </div>
    `;

    try {
        const clientes = await llamarAPI(
            "clientes",
            empresaActual.empresa_id
        );

        const clientesEmpresa = filtrarPorEmpresa(clientes);

        const lista = document.getElementById("clientes-lista");
        const buscador = document.getElementById("buscar-clientes");

        if (!lista) {
            return;
        }

        function mostrarListaClientes(clientesMostrados) {
            if (!clientesMostrados.length) {
                lista.innerHTML = `
                    <div class="clientes-vacio">
                        <h3>No se encontraron clientes</h3>
                        <p>Probá con otro nombre, apellido, teléfono o Instagram.</p>
                    </div>
                `;
                return;
            }

            lista.innerHTML = `
                <div class="clientes-lista">
                    ${clientesMostrados.map(cliente => `
                        <article class="cliente-fila">
                            <div class="cliente-principal">
                                <span class="cliente-label">CLIENTE</span>
                                <h3>
                                    ${escaparHTML(
                                        `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim()
                                    )}
                                </h3>
                            </div>

                            <div class="cliente-dato">
                                <span>TELÉFONO</span>
                                <p>
                                    ${escaparHTML(cliente.telefono || "-")}
                                </p>
                            </div>

                            <div class="cliente-dato cliente-instagram">
                                <span>INSTAGRAM</span>
                                <p>
                                    ${escaparHTML(cliente.instagram || "-")}
                                </p>
                            </div>

                            <div class="cliente-dato cliente-localidad">
                                <span>LOCALIDAD</span>
                                <p>
                                    ${escaparHTML(cliente.localidad || "-")}
                                </p>
                            </div>

                            <button
                                type="button"
                                class="btn-ver-cliente"
                                data-cliente-id="${escaparHTML(cliente.cliente_id)}"
                            >
                                VER
                            </button>
                        </article>
                    `).join("")}
                </div>
            `;

            lista.querySelectorAll(".btn-ver-cliente").forEach(boton => {
                boton.addEventListener("click", function() {
                    const clienteId = this.dataset.clienteId;
                    mostrarFichaCliente(clienteId, clientesEmpresa);
                });
            });
        }

        mostrarListaClientes(clientesEmpresa);

        if (buscador) {
            buscador.addEventListener("input", function() {
                const texto = this.value
                    .trim()
                    .toLowerCase();

                if (!texto) {
                    mostrarListaClientes(clientesEmpresa);
                    return;
                }

                const filtrados = clientesEmpresa.filter(cliente => {
                    const nombre = String(cliente.nombre || "").toLowerCase();
                    const apellido = String(cliente.apellido || "").toLowerCase();
                    const telefono = String(cliente.telefono || "").toLowerCase();
                    const instagram = String(cliente.instagram || "").toLowerCase();

                    return (
                        nombre.includes(texto) ||
                        apellido.includes(texto) ||
                        `${nombre} ${apellido}`.includes(texto) ||
                        telefono.includes(texto) ||
                        instagram.includes(texto)
                    );
                });

                mostrarListaClientes(filtrados);
            });
        }

  const botonNuevo = document.getElementById("btn-nuevo-cliente");

   if (botonNuevo) {
       botonNuevo.addEventListener("click", function() {
           abrirNuevoCliente();
       });
   }

    } catch (error) {
        console.error("Error cargando clientes:", error);

        container.innerHTML = `
            <div class="clientes-error">
                <p>No se pudieron cargar los clientes.</p>
            </div>
        `;
    }
}

/* =========================================================
   NUEVO CLIENTE
   ========================================================= */

function abrirNuevoCliente() {
    if (!empresaActual) {
        alert("No hay una empresa seleccionada.");
        return;
    }

    const modal = document.createElement("div");
    modal.className = "cliente-nuevo-modal";

    modal.innerHTML = `
        <div class="cliente-nuevo-overlay"></div>

        <div class="cliente-nuevo-contenido">

            <button
                type="button"
                class="cliente-nuevo-cerrar"
            >
                ×
            </button>

            <div class="cliente-nuevo-header">
                <span>NUEVO CLIENTE</span>
                <h2>Crear cliente</h2>
                <p>
                    Empresa:
                    <strong>
                        ${escaparHTML(
                            empresaActual.nombre_comercial ||
                            empresaActual.nombre ||
                            ""
                        )}
                    </strong>
                </p>
            </div>

            <form id="form-nuevo-cliente">

                <div class="cliente-form-grid">

                    <div class="cliente-campo">
                        <label>NOMBRE</label>
                        <input
                            type="text"
                            name="nombre"
                            required
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>APELLIDO</label>
                        <input
                            type="text"
                            name="apellido"
                            required
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>TELÉFONO</label>
                        <input
                            type="tel"
                            name="telefono"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>INSTAGRAM</label>
                        <input
                            type="text"
                            name="instagram"
                            placeholder="@usuario"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>EMAIL</label>
                        <input
                            type="email"
                            name="email"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>DIRECCIÓN</label>
                        <input
                            type="text"
                            name="direccion"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>LOCALIDAD</label>
                        <input
                            type="text"
                            name="localidad"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>PROVINCIA</label>
                        <input
                            type="text"
                            name="provincia"
                        >
                    </div>

                    <div class="cliente-separador">
                        <span>MEDIDAS</span>
                    </div>

                    <div class="cliente-campo">
                        <label>CUELLO</label>
                        <input
                            type="number"
                            name="medidas_cuello"
                            min="0"
                            step="0.1"
                            placeholder="cm"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>BUSTO</label>
                        <input
                            type="number"
                            name="medidas_busto"
                            min="0"
                            step="0.1"
                            placeholder="cm"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>CINTURA</label>
                        <input
                            type="number"
                            name="medidas_cintura"
                            min="0"
                            step="0.1"
                            placeholder="cm"
                        >
                    </div>

                    <div class="cliente-campo">
                        <label>ALTO</label>
                        <input
                            type="number"
                            name="medidas_alto"
                            min="0"
                            step="0.1"
                            placeholder="cm"
                        >
                    </div>

                    <div class="cliente-campo cliente-campo-completo">
                        <label>OBSERVACIONES</label>
                        <textarea
                            name="observaciones"
                            rows="4"
                            placeholder="Notas importantes sobre el cliente..."
                        ></textarea>
                    </div>

                </div>

                <div
                    class="cliente-nuevo-mensaje"
                    id="nuevo-cliente-mensaje"
                ></div>

                <div class="cliente-nuevo-botones">

                    <button
                        type="button"
                        class="btn-cancelar-cliente"
                    >
                        CANCELAR
                    </button>

                    <button
                        type="submit"
                        class="btn-guardar-cliente"
                    >
                        CREAR CLIENTE
                    </button>

                </div>

            </form>

        </div>
    `;

    document.body.appendChild(modal);

    agregarEstilosNuevoCliente();
    const formulario = modal.querySelector("#form-nuevo-cliente");

    const cerrarModal = () => modal.remove();

    modal
        .querySelector(".cliente-nuevo-cerrar")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".cliente-nuevo-overlay")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".btn-cancelar-cliente")
        .addEventListener("click", cerrarModal);

    formulario.addEventListener("submit", async function(event) {
        event.preventDefault();

        await guardarNuevoCliente(
            formulario,
            modal
        );
    });
}

/* =========================================================
   ESTILOS NUEVO CLIENTE
   ========================================================= */

function agregarEstilosNuevoCliente() {
    if (document.getElementById("zaria-nuevo-cliente-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "zaria-nuevo-cliente-styles";

    style.textContent = `
        .cliente-nuevo-modal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 25px;
        }

        .cliente-nuevo-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.65);
            backdrop-filter: blur(3px);
        }

        .cliente-nuevo-contenido {
            position: relative;
            z-index: 2;
            width: min(850px, 100%);
            max-height: 92vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 16px;
            padding: 35px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }

        .cliente-nuevo-cerrar {
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

        .cliente-nuevo-header {
            margin-bottom: 28px;
            padding-right: 35px;
        }

        .cliente-nuevo-header span {
            font-size: 11px;
            letter-spacing: 2px;
            color: #777;
        }

        .cliente-nuevo-header h2 {
            margin: 6px 0 4px;
            font-size: 28px;
            color: #222;
        }

        .cliente-nuevo-header p {
            margin: 0;
            color: #777;
            font-size: 13px;
        }

        .cliente-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px 20px;
        }

        .cliente-campo {
            min-width: 0;
        }

        .cliente-campo label {
            display: block;
            margin-bottom: 7px;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1px;
            color: #555;
        }

        .cliente-campo input,
        .cliente-campo textarea {
            box-sizing: border-box;
            width: 100%;
            border: 1px solid #dcdcdc;
            border-radius: 8px;
            background: #fff;
            color: #222;
            font-family: inherit;
            font-size: 14px;
            outline: none;
            transition: border-color .2s ease, box-shadow .2s ease;
        }

        .cliente-campo input {
            height: 44px;
            padding: 0 13px;
        }

        .cliente-campo textarea {
            min-height: 100px;
            padding: 12px 13px;
            resize: vertical;
        }

        .cliente-campo input:focus,
        .cliente-campo textarea:focus {
            border-color: #999;
            box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
        }

        .cliente-campo input::placeholder,
        .cliente-campo textarea::placeholder {
            color: #aaa;
        }

        .cliente-campo-completo {
            grid-column: 1 / -1;
        }

        .cliente-separador {
            grid-column: 1 / -1;
            margin-top: 5px;
            padding-bottom: 3px;
            border-bottom: 1px solid #eee;
        }

        .cliente-separador span {
            display: block;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1.5px;
            color: #777;
        }

        .cliente-nuevo-mensaje {
            min-height: 20px;
            margin-top: 20px;
            font-size: 13px;
        }

        .cliente-nuevo-mensaje.exito {
            color: #2d6a3f;
        }

        .cliente-nuevo-mensaje.error {
            color: #a33;
        }

        .cliente-nuevo-botones {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        .cliente-nuevo-botones button {
            height: 42px;
            padding: 0 20px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: .5px;
            cursor: pointer;
        }

        .btn-cancelar-cliente {
            background: #fff;
            color: #1d1a1a;
            border: 1px solid #1d1a1a;
        }

        .btn-guardar-cliente {
            background: #1d1a1a;
            color: #fff;
            border: 1px solid #1d1a1a;
        }

        .btn-guardar-cliente:disabled {
            opacity: .6;
            cursor: wait;
        }

        @media (max-width: 700px) {
            .cliente-nuevo-modal {
                padding: 10px;
            }

            .cliente-nuevo-contenido {
                padding: 25px 20px;
                max-height: 95vh;
            }

            .cliente-form-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }

            .cliente-campo-completo,
            .cliente-separador {
                grid-column: auto;
            }

            .cliente-nuevo-botones {
                flex-direction: column;
            }

            .cliente-nuevo-botones button {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(style);
}

/* =========================================================
   FICHA DE CLIENTE
   ========================================================= */

function mostrarFichaCliente(id, clientes) {
    const cliente = clientes.find(
        item => String(item.cliente_id) === String(id)
    );

    if (!cliente) {
        alert("No se encontró el cliente.");
        return;
    }

    alert(
        `Cliente: ${cliente.nombre || ""} ${cliente.apellido || ""}\n` +
        `Teléfono: ${cliente.telefono || "-"}\n` +
        `Instagram: ${cliente.instagram || "-"}\n` +
        `Email: ${cliente.email || "-"}\n` +
        `Observaciones: ${cliente.observaciones || "-"}`
    );
}

/* =========================================================
   ESTILOS CLIENTES
   ========================================================= */

function agregarEstilosClientes() {
    if (document.getElementById("zaria-clientes-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "zaria-clientes-styles";

    style.textContent = `
        .clientes-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 25px;
        }

        .clientes-buscador {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            max-width: 520px;
            height: 46px;
            padding: 0 15px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 10px;
        }

        .clientes-buscador span {
            font-size: 22px;
            color: #777;
        }

        .clientes-buscador input {
            width: 100%;
            height: 100%;
            border: none;
            outline: none;
            background: transparent;
            font-size: 14px;
            color: #222;
        }

        .clientes-buscador input::placeholder {
            color: #999;
        }

        .btn-nuevo-cliente {
            flex-shrink: 0;
            height: 46px;
            padding: 0 20px;
            border: none;
            border-radius: 9px;
            background: #1d1a1a;
            color: #fff;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: .5px;
            cursor: pointer;
        }

        .btn-nuevo-cliente:hover {
            opacity: .88;
        }

        .clientes-lista {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .cliente-fila {
            display: grid;
            grid-template-columns: 1.5fr 1fr 1fr 1fr auto;
            align-items: center;
            gap: 20px;
            padding: 18px 20px;
            background: #fff;
            border: 1px solid #e7e7e7;
            border-radius: 10px;
            transition: box-shadow .2s ease, transform .2s ease;
        }

        .cliente-fila:hover {
            box-shadow: 0 6px 20px rgba(0,0,0,.07);
        }

        .cliente-label,
        .cliente-dato span {
            display: block;
            margin-bottom: 5px;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1.2px;
            color: #888;
        }

        .cliente-principal h3 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #222;
        }

        .cliente-dato p {
            margin: 0;
            font-size: 13px;
            color: #555;
            word-break: break-word;
        }

        .btn-ver-cliente {
            height: 36px;
            padding: 0 15px;
            border: 1px solid #1d1a1a;
            border-radius: 7px;
            background: #fff;
            color: #1d1a1a;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: .5px;
            cursor: pointer;
        }

        .btn-ver-cliente:hover {
            background: #1d1a1a;
            color: #fff;
        }

        .clientes-vacio,
        .clientes-error {
            padding: 45px 20px;
            text-align: center;
            background: #fff;
            border: 1px solid #e7e7e7;
            border-radius: 12px;
        }

        .clientes-vacio h3 {
            margin: 0 0 8px;
            font-size: 18px;
        }

        .clientes-vacio p,
        .clientes-error p {
            margin: 0;
            color: #777;
            font-size: 13px;
        }

        @media (max-width: 800px) {
            .clientes-toolbar {
                flex-direction: column;
                align-items: stretch;
            }

            .clientes-buscador {
                max-width: none;
            }

            .btn-nuevo-cliente {
                width: 100%;
            }

            .cliente-fila {
                grid-template-columns: 1fr auto;
                gap: 12px 15px;
                padding: 16px;
            }

            .cliente-principal {
                grid-column: 1;
            }

            .cliente-dato {
                grid-column: 1 / -1;
            }

            .cliente-instagram,
            .cliente-localidad {
                grid-column: auto;
            }

            .btn-ver-cliente {
                grid-column: 2;
                grid-row: 1;
                align-self: center;
            }
        }

        @media (max-width: 500px) {
            .cliente-fila {
                display: grid;
                grid-template-columns: 1fr auto;
            }

            .cliente-dato {
                grid-column: 1 / -1;
            }

            .cliente-instagram,
            .cliente-localidad {
                grid-column: 1 / -1;
            }

            .cliente-principal h3 {
                font-size: 14px;
            }
        }
    `;

    document.head.appendChild(style);
}

/* =========================================================
   PREPARAR VISTAS
   ========================================================= */

function prepararVistasIniciales() {

    const dashboard =
        document.getElementById("dashboard-view");

    const modelosView =
        document.getElementById("modelos-view");


    if (dashboard) {

        dashboard.style.display = "";

        dashboard.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    if (modelosView) {

        modelosView.style.display = "none";

        modelosView.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    vistaActual = "dashboard";
}


/* =========================================================
   INICIO
   ========================================================= */

async function iniciarSistema() {

    try {

        prepararVistasIniciales();

        /*
         * Carga la empresa configurada.
         */
        await cargarEmpresas();

        /*
         * Configura los botones.
         */
        configurarDashboard();

        /*
         * Carga solamente el Dashboard.
         * Los modelos se cargan al pulsar MODELOS.
         */
        if (typeof iniciarDashboard === "function") {

            await iniciarDashboard();

        }

        console.log(
            "CRAFT FLOW iniciado correctamente"
        );

    } catch (error) {

        console.error(
            "Error iniciando CRAFT FLOW:",
            error
        );

    }
}


/* =========================================================
   ARRANCAR
   ========================================================= */

iniciarSistema();
