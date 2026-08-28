const API_URL = "https://script.google.com/macros/s/AKfycbyZzZQhIyQAdZv2G4YqUqvb_wThnq_S_PPq81YET8W-vBVs7O9No7KOb1_stS2XbMvO/exec";

/* =========================
   EMPRESA ACTUAL
========================= */
// comentario vs
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


<div class="modelo-precios">

    <div class="modelo-precio-item">

        <span class="modelo-precio-label">
            PRECIO DE VENTA
        </span>

        <div class="modelo-precio">
            ${formatearPrecio(
                modelo.precio_venta
            )}
        </div>

    </div>


    <div class="modelo-precio-item">

        <span class="modelo-precio-label">
            COSTO
        </span>

        <div class="modelo-precio">
            ${formatearPrecio(
                modelo.costo
            )}
        </div>

    </div>

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
        document.createElement(
            "div"
        );


    modal.className =
        "modelo-modal";


    modal.innerHTML = `

        <div
            class="modelo-modal-overlay"
        ></div>


        <div
            class="modelo-modal-contenido"
        >


            <!-- =========================
                 BOTÓN CERRAR
            ========================= -->

            <button
                type="button"
                class="modelo-modal-cerrar"
                aria-label="Cerrar"
            >
                ×
            </button>


            <!-- =================================================
                 PARTE SUPERIOR
                 IMAGEN + INFORMACIÓN PRINCIPAL
            ================================================== -->

            <div
                class="modelo-detalle-superior"
            >


                <!-- =========================
                     IMÁGENES
                ========================= -->

                <div
                    class="modelo-detalle-imagenes"
                >


                    ${
                        imagenPrincipal

                        ? `

                            <div
                                class="modelo-detalle-imagen-principal"
                            >

                                <img
                                    src="${imagenPrincipal}"
                                    alt="${escaparHTML(
                                        modelo.nombre
                                    )}"
                                >

                            </div>

                        `

                        : `

                            <div
                                class="modelo-detalle-imagen-principal sin-imagen"
                            >

                                <span>
                                    Sin imagen
                                </span>

                            </div>

                        `
                    }


                    ${
                        imagenSecundaria

                        ? `

                            <div
                                class="modelo-detalle-imagen-secundaria"
                            >

                                <img
                                    src="${imagenSecundaria}"
                                    alt="${escaparHTML(
                                        modelo.nombre
                                    )}"
                                >

                            </div>

                        `

                        : ""
                    }


                </div>


                <!-- =========================
                     INFORMACIÓN PRINCIPAL
                ========================= -->

                <div
                    class="modelo-detalle-info"
                >


                    <!-- CÓDIGO + TIPO -->

                    <div
                        class="modelo-detalle-codigo-tipo"
                    >

                        <span
                            class="modelo-detalle-codigo"
                        >

                            ${escaparHTML(
                                modelo.codigo
                            )}

                        </span>


                        <span
                            class="modelo-detalle-tipo"
                        >

                            ${escaparHTML(
                                modelo.tipo
                            )}

                        </span>

                    </div>


                    <!-- NOMBRE -->

                    <h2>

                        ${escaparHTML(
                            modelo.nombre
                        )}

                    </h2>


                    <!-- MATERIAL BASE -->

                    <div
                        class="modelo-detalle-material"
                    >

                        ${escaparHTML(
                            modelo.material_base
                        )}

                    </div>


                    <!-- =========================
                         PRECIO + COSTO
                    ========================= -->

                    <div
                        class="modelo-detalle-valores"
                    >


                        <!-- PRECIO DE VENTA -->

                        <div
                            class="modelo-detalle-valor"
                        >

                            <span
                                class="modelo-detalle-label"
                            >
                                PRECIO DE VENTA
                            </span>


                            <strong>
                                ${formatearPrecio(
                                    modelo.precio_venta
                                )}
                            </strong>

                        </div>


                        <!-- COSTO -->

                        <div
                            class="modelo-detalle-valor"
                        >

                            <span
                                class="modelo-detalle-label"
                            >
                                COSTO
                            </span>


                            <strong
                                id="modelo-detalle-costo"
                            >

                                ${formatearPrecio(
                                    modelo.costo || 0
                                )}

                            </strong>

                        </div>


                    </div>


                </div>


            </div>


            <!-- =================================================
                 PARTE INFERIOR
                 OCUPA TODO EL ANCHO
            ================================================== -->

            <div
                class="modelo-detalle-inferior"
            >


                <!-- =========================
                     DESCRIPCIÓN
                ========================= -->

                ${
                    modelo.descripcion

                    ? `

                        <div
                            class="modelo-detalle-seccion"
                        >

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


                <!-- =========================
                     MEDIDAS
                ========================= -->

                ${
                    modelo.medidas

                    ? `

                        <div
                            class="modelo-detalle-seccion"
                        >

                            <h3>
                                MEDIDAS
                            </h3>


                            <p
                                class="modelo-medidas"
                            >

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


                <!-- =================================================
                     MATERIALES Y CONSUMO
                ================================================== -->

                <div
                    class="modelo-materiales"
                >


                    <h3>
                        MATERIALES Y CONSUMO
                    </h3>


                    <div
                        id="modelo-materiales-container"
                    >

                        Cargando materiales...

                    </div>


                    <!-- =========================
                         ACCIONES
                    ========================= -->

                    <div
                        class="modelo-materiales-acciones"
                    >

                        <button
                            type="button"
                            class="btn-calcular-costo"
                            onclick="calcularCostoModelo(
                                ${modelo.modelo_id}
                            )"
                        >

                            CALCULAR COSTO

                        </button>

                    </div>


                </div>


                <!-- =========================
                     PERSONALIZACIÓN
                ========================= -->

                <div
                    class="modelo-detalle-seccion"
                >

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

    `;


    document.body.appendChild(
        modal
    );


    /* =========================
       CARGAR MATERIALES
    ========================= */

    cargarMaterialesModelo(
        modelo.modelo_id
    );


    /* =========================
       BOTÓN CERRAR
    ========================= */

    const botonCerrar =
        modal.querySelector(
            ".modelo-modal-cerrar"
        );


    if (botonCerrar) {

        botonCerrar.addEventListener(
            "click",
            cerrarModal
        );

    }


    /* =========================
       CERRAR CON OVERLAY
    ========================= */

    const overlay =
        modal.querySelector(
            ".modelo-modal-overlay"
        );


    if (overlay) {

        overlay.addEventListener(
            "click",
            cerrarModal
        );

    }


    /* =========================
       CERRAR MODAL
    ========================= */

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


    /*
     * EMPRESA ACTUAL
     */

    if (
        !empresaActual ||
        !empresaActual.empresa_id
    ) {

        alert(
            "No hay una empresa seleccionada."
        );

        return;

    }


    const empresaId =
        Number(
            empresaActual.empresa_id
        );


    /*
     * VALIDACIONES
     */

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


    /*
     * BOTÓN
     */

    const boton =
        modal.querySelector(
            ".material-btn-guardar"
        );


    boton.disabled =
        true;


    boton.textContent =
        "GUARDANDO...";


    try {

        /*
         * GUARDAR RELACIÓN
         *
         * modelo_material_id
         * lo genera Apps Script.
         *
         * Nosotros enviamos:
         * empresa_id
         * modelo_id
         * material_id
         * cantidad
         * unidad
         */

        const response =
            await fetch(
                API_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify({

                            accion:
                                "agregar_modelo_material",


                            empresa_id:
                                empresaId,


                            modelo_id:
                                Number(
                                    modeloId
                                ),


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


        /*
         * VERIFICAR RESPUESTA
         */

        if (
            !resultado.success
        ) {

            throw new Error(
                resultado.error ||
                "No se pudo guardar el material."
            );

        }


        /*
         * CERRAR MODAL
         */

        modal.remove();


        /*
         * RECARGAR MATERIALES
         */

        await cargarMaterialesModelo(
            modeloId
        );

        await calcularCostoModelo(
            modeloId
        );

    } catch (error) {

        console.error(
            "Error guardando material del modelo:",
            error
        );


        alert(
            "No se pudo guardar el material.\n\n" +
            error.message
        );


        boton.disabled =
            false;


        boton.textContent =
            "GUARDAR";

    }

}

/* =========================
   CALCULAR COSTO MODELO
========================= */

async function calcularCostoModelo(
    modeloId
) {

    if (!modeloId) {

        alert(
            "No se pudo identificar el modelo."
        );

        return;

    }


    const boton =
        document.querySelector(
            ".btn-calcular-costo"
        );


    if (boton) {

        boton.disabled = true;

        boton.textContent =
            "CALCULANDO...";

    }


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
                                "calcular_costo_modelo",

                            empresa_id:
                                empresaActual
                                    ? empresaActual.empresa_id
                                    : null,

                            modelo_id:
                                modeloId

                        })

                }
            );


        const resultado =
            await response.json();


        if (!resultado.success) {

            throw new Error(
                resultado.error ||
                "No se pudo calcular el costo."
            );

        }


        /*
         * ACTUALIZAR EL MODELO
         * EN MEMORIA
         */

        const modelo =
            modelos.find(
                item =>
                    Number(
                        item.modelo_id
                    ) ===
                    Number(
                        modeloId
                    )
            );


        if (modelo) {

            modelo.costo =
                resultado.costo;

        }


        /*
         * ACTUALIZAR COSTO
         * EN LA FICHA
         */

        const costoElemento =
            document.getElementById(
                "modelo-detalle-costo"
            );


        if (costoElemento) {

            costoElemento.textContent =
                formatearPrecio(
                    resultado.costo
                );

        }


        /*
         * ACTUALIZAR TARJETAS
         */

        if (
            typeof mostrarModelos ===
            "function"
        ) {

            mostrarModelos();

        }


        /*
         * MENSAJE
         */

        console.log(
            "Costo del modelo calculado:",
            resultado.costo,
            resultado.materiales
        );


    } catch (error) {

        console.error(
            "Error calculando costo:",
            error
        );


        alert(
            "No se pudo calcular el costo.\n\n" +
            error.message
        );


    } finally {

        if (boton) {

            boton.disabled = false;

            boton.textContent =
                "CALCULAR COSTO";

        }

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


/* =========================================================
   GUARDAR NUEVO MODELO
   ========================================================= */

async function guardarNuevoModelo(formulario, modal) {
    const boton = formulario.querySelector(".btn-guardar-nuevo");
    const mensaje = formulario.querySelector("#nuevo-mensaje");
    const formData = new FormData(formulario);

    const codigo = String(formData.get("codigo") || "").trim();
    const nombre = String(formData.get("nombre") || "").trim();
    const tipo = String(formData.get("tipo") || "").trim();

    if (!codigo) {
        alert("Ingresá el código del modelo.");
        return;
    }

    if (!nombre) {
        alert("Ingresá el nombre del modelo.");
        return;
    }

    if (!tipo) {
        alert("Seleccioná un tipo.");
        return;
    }

    if (!empresaActual) {
        alert("No hay una empresa seleccionada.");
        return;
    }

    const data = {
        empresa_id: Number(empresaActual.empresa_id),
        codigo,
        nombre,
        tipo,
        material_base: String(
            formData.get("material_base") || ""
        ).trim(),
        costo: formData.get("costo") === ""
            ? ""
            : Number(formData.get("costo")),
        precio_venta: formData.get("precio_venta") === ""
            ? ""
            : Number(formData.get("precio_venta")),
        imagen: String(
            formData.get("imagen") || ""
        ).trim(),
        imagen_2: String(
            formData.get("imagen_2") || ""
        ).trim(),
        descripcion: String(
            formData.get("descripcion") || ""
        ).trim(),
        medidas: String(
            formData.get("medidas") || ""
        ).trim(),
        activo: formData.get("activo") === "on"
    };

    boton.disabled = true;
    boton.textContent = "CREANDO...";
    mensaje.textContent = "Guardando modelo...";
    mensaje.className = "modelo-nuevo-mensaje";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "insert",
                resource: "modelos",
                data
            })
        });

        const resultado = await response.json();

        if (!resultado.success) {
            throw new Error(
                resultado.error ||
                "No se pudo crear el modelo."
            );
        }

        mensaje.textContent = "Modelo creado correctamente.";
        mensaje.className = "modelo-nuevo-mensaje exito";

        setTimeout(async function() {
            modal.remove();

            try {
                modelos = await llamarAPI(
                    "modelos",
                    empresaActual.empresa_id
                );

                mostrarModelos();
                await iniciarDashboard();
            } catch (error) {
                console.error(
                    "Error actualizando modelo y Dashboard:",
                    error
                );
            }
        }, 700);

    } catch (error) {
        console.error("Error creando modelo:", error);

        mensaje.textContent = "No se pudo crear el modelo.";
        mensaje.className = "modelo-nuevo-mensaje error";

        boton.disabled = false;
        boton.textContent = "CREAR MODELO";

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
   INICIAR DASHBOARD
   ========================================================= */

async function iniciarDashboard() {
    try {
        if (!empresaActual) {
            console.warn("No hay una empresa seleccionada para actualizar el Dashboard.");
            return;
        }

        const empresaId = empresaActual.empresa_id;

        const [
            pedidos,
            clientes,
            modelosDashboard
        ] = await Promise.all([
            llamarAPI("pedidos", empresaId),
            llamarAPI("clientes", empresaId),
            llamarAPI("modelos", empresaId)
        ]);

        const pedidosEmpresa =
            filtrarPorEmpresa(pedidos);

        const clientesEmpresa =
            filtrarPorEmpresa(clientes);

        const modelosEmpresa =
            filtrarPorEmpresa(modelosDashboard);

        console.log("========== ACTUALIZACIÓN DASHBOARD ==========");
        console.log("Empresa:", empresaActual);
        console.log("Pedidos recibidos:", pedidos);
        console.log("Cantidad de pedidos:", pedidosEmpresa.length);
        console.log("Último pedido:", pedidosEmpresa[pedidosEmpresa.length - 1]);
        console.log("Clientes:", clientesEmpresa.length);
        console.log("Modelos:", modelosEmpresa.length);
        console.log("=============================================");

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


    /* =====================================================
       PEDIDOS DEL MES
       ===================================================== */

    const pedidosMes =
        pedidos.filter(
            pedido => {

                if (
                    !pedido.fecha
                ) {

                    return false;

                }


                /*
                 * Convertimos siempre la fecha
                 * a un objeto Date.
                 */

                let fecha;


                if (
                    pedido.fecha instanceof Date
                ) {

                    fecha =
                        pedido.fecha;

                }

                else {

                    fecha =
                        new Date(
                            pedido.fecha
                        );

                }


                /*
                 * Si la fecha no es válida,
                 * no contamos el pedido.
                 */

                if (
                    isNaN(
                        fecha.getTime()
                    )
                ) {

                    console.warn(
                        "Fecha de pedido no válida:",
                        pedido.fecha
                    );

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


    /* =====================================================
       VENTAS DEL MES
       ===================================================== */

    const ventasMes =
        pedidosMes.reduce(
            (
                total,
                pedido
            ) => {

                return total +
                    Number(
                        pedido.precio ||
                        0
                    );

            },
            0
        );


    /* =====================================================
       SEÑAS DEL MES
       ===================================================== */

    const senasMes =
        pedidosMes.reduce(
            (
                total,
                pedido
            ) => {

                return total +
                    Number(
                        pedido.sena ||
                        0
                    );

            },
            0
        );


    /* =====================================================
       ELEMENTOS DEL DASHBOARD
       ===================================================== */

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


    /* =====================================================
       MOSTRAR TOTALES
       ===================================================== */

    if (
        totalPedidosElemento
    ) {

        totalPedidosElemento.textContent =
            totalPedidos;

    }


    if (
        totalClientesElemento
    ) {

        totalClientesElemento.textContent =
            totalClientes;

    }


    if (
        totalModelosElemento
    ) {

        totalModelosElemento.textContent =
            modelosActivos;

    }


    if (
        ventasMesElemento
    ) {

        ventasMesElemento.textContent =
            formatearPrecio(
                ventasMes
            );

    }


    if (
        senasMesElemento
    ) {

        senasMesElemento.textContent =
            formatearPrecio(
                senasMes
            );

    }


    if (
        pedidosMesElemento
    ) {

        pedidosMesElemento.textContent =
            pedidosMes.length;

    }

}


/* =========================================================
   ESTADOS DE PEDIDOS
   ========================================================= */

function mostrarEstadosDashboard(pedidos) {
    const container = document.getElementById("dashboard-estados");

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

    pedidos.forEach(pedido => {
        const estado = String(
            pedido.estado || "SIN ESTADO"
        ).trim().toUpperCase();

        estados[estado] = (estados[estado] || 0) + 1;
    });

    const estadosOrdenados = Object.entries(estados)
        .sort((a, b) => b[1] - a[1]);

    const totalPedidos = pedidos.length;

    container.innerHTML = estadosOrdenados
        .map(([estado, cantidad]) => {
            const porcentaje = totalPedidos > 0
                ? (cantidad / totalPedidos) * 100
                : 0;

            return `
                <div class="dashboard-estado">
                    <span class="dashboard-estado-nombre">
                        ${escaparHTML(
                            formatearEstado(estado)
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
        })
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
  Función general para formatear fechas
   ========================================================= */

function formatearFecha(fecha) {

    if (!fecha) {
        return "-";
    }

    const fechaObj = new Date(fecha);

    if (isNaN(fechaObj.getTime())) {
        return String(fecha);
    }

    const dia = String(
        fechaObj.getDate()
    ).padStart(2, "0");

    const mes = String(
        fechaObj.getMonth() + 1
    ).padStart(2, "0");

    const anio =
        fechaObj.getFullYear();

    return `${dia}/${mes}/${anio}`;
}

/* =========================================================
   MOSTRAR DASHBOARD
   ========================================================= */

async function mostrarDashboard() {
    cerrarModalesAbiertos();

    const dashboard = document.getElementById("dashboard-view");
    const modelosView = document.getElementById("modelos-view");
    const clientesView = document.getElementById("clientes-view");
    const pedidosView = document.getElementById("pedidos-view");
    const materialesView = document.getElementById("materiales-view");

    vistaActual = "dashboard";

    if (dashboard) {
        dashboard.style.display = "";
        dashboard.setAttribute("aria-hidden", "false");
    }

    if (modelosView) {
        modelosView.style.display = "none";
        modelosView.setAttribute("aria-hidden", "true");
    }

    if (clientesView) {
        clientesView.style.display = "none";
        clientesView.setAttribute("aria-hidden", "true");
    }

    if (pedidosView) {
        pedidosView.style.display = "none";
        pedidosView.setAttribute("aria-hidden", "true");
    }

    if (materialesView) {
        materialesView.style.display = "none";
        materialesView.setAttribute("aria-hidden","true"  );

    }
    if (typeof iniciarDashboard === "function") {
        await iniciarDashboard();
    }
}
/* =========================================================
   CERRAR MODALES ABIERTOS
   ========================================================= */

function cerrarModalesAbiertos() {
    const selectores = [
        ".pedido-ficha-modal",
        ".cliente-ficha-modal",
        ".cliente-nuevo-modal",
        ".cliente-editar-modal",
        ".modelo-ficha-modal",
        ".modelo-nuevo-modal",
        ".modelo-editar-modal"
    ];

    selectores.forEach(selector => {
        document.querySelectorAll(selector).forEach(modal => {
            modal.remove();
        });
    });
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

    const btnModelos =
        document.getElementById(
            "btn-dashboard-modelos"
        );

    const btnAccesoModelos =
        document.getElementById(
            "btn-acceso-modelos"
        );

    const btnClientes =
        document.getElementById(
            "btn-dashboard-clientes"
        );

    const btnAccesoClientes =
        document.getElementById(
            "btn-acceso-clientes"
        );

    const btnPedidos =
        document.getElementById(
            "btn-dashboard-pedidos"
        );

    const btnAccesoPedidos =
        document.getElementById(
            "btn-acceso-pedidos"
        );

    const btnAccesoMateriales =
        document.getElementById(
            "btn-acceso-materiales"
        );

    const btnVolverModelos =
        document.getElementById(
            "btn-volver-dashboard"
        );

    const btnVolverClientes =
        document.getElementById(
            "btn-volver-dashboard-clientes"
        );

    const btnVolverPedidos =
        document.getElementById(
            "btn-volver-dashboard-pedidos"
        );

    const btnNuevoPedido =
        document.getElementById(
            "btn-dashboard-nuevo-pedido"
        );
    const btnVolverMateriales =
        document.getElementById(
            "btn-volver-dashboard-materiales");

    /* =====================================================
       MODELOS
       ===================================================== */

    if (btnModelos) {

        btnModelos.onclick =
            function(event) {

                event.preventDefault();

                mostrarVistaModelos();

            };

    }


    if (btnAccesoModelos) {

        btnAccesoModelos.onclick =
            function(event) {

                event.preventDefault();

                mostrarVistaModelos();

            };

    }


    /* =====================================================
       CLIENTES
       ===================================================== */

    if (btnClientes) {

        btnClientes.onclick =
            function(event) {

                event.preventDefault();

                mostrarVistaClientes();

            };

    }


    if (btnAccesoClientes) {

        btnAccesoClientes.onclick =
            function(event) {

                event.preventDefault();

                mostrarVistaClientes();

            };

    }


    /* =====================================================
       PEDIDOS
       ===================================================== */

    if (btnPedidos) {

        btnPedidos.onclick =
            function(event) {

                event.preventDefault();

                mostrarVistaPedidos();

            };

    }


    if (btnAccesoPedidos) {

        btnAccesoPedidos.onclick =
            function(event) {

                event.preventDefault();

                mostrarVistaPedidos();

            };

    }


    /* =====================================================
       MATERIALES
       ===================================================== */

    if (btnAccesoMateriales) {

        btnAccesoMateriales.onclick =
            function(event) {

                event.preventDefault();

                mostrarVistaMateriales();

            };

    }


    /* =====================================================
       VOLVER AL DASHBOARD
       ===================================================== */

    if (btnVolverModelos) {

        btnVolverModelos.onclick =
            function(event) {

                event.preventDefault();

                mostrarDashboard();

            };

    }


    if (btnVolverClientes) {

        btnVolverClientes.onclick =
            function(event) {

                event.preventDefault();

                mostrarDashboard();

            };

    }


    if (btnVolverPedidos) {

        btnVolverPedidos.onclick =
            function(event) {

                event.preventDefault();

                mostrarDashboard();

            };

    }


    /* =====================================================
       NUEVO PEDIDO
       ===================================================== */

    if (btnNuevoPedido) {

        btnNuevoPedido.onclick =
            function(event) {

                event.preventDefault();

                mostrarNuevoPedido();

            };

    }
    if (btnVolverMateriales) {

        btnVolverMateriales.onclick =
            function(event) {

                event.preventDefault();

                mostrarDashboard();

            };

    }
}

/* =========================================================
   NUEVO / EDITAR PEDIDO
   ========================================================= */

async function mostrarNuevoPedido(
    pedidoEdicion = null,
    pedidosEmpresa = []
) {

    if (!empresaActual) {

        alert(
            "No hay una empresa seleccionada."
        );

        return;

    }


    cerrarModalesAbiertos();


    const esEdicion =
        !!pedidoEdicion;


    const modal =
        document.createElement("div");


    modal.className =
        "pedido-nuevo-modal";


    modal.innerHTML = `
        <div class="pedido-nuevo-overlay"></div>

        <div class="pedido-nuevo-contenido">

            <button
                type="button"
                class="pedido-nuevo-cerrar"
            >
                ×
            </button>

            <div class="pedido-nuevo-header">

                <span>
                    ${esEdicion
                        ? "EDITAR PEDIDO"
                        : "NUEVO PEDIDO"
                    }
                </span>

                <h2>
                    ${esEdicion
                        ? "Modificar pedido"
                        : "Registrar pedido"
                    }
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

                ${
                    esEdicion
                        ? `
                            <p>
                                Pedido:
                                <strong>
                                    #${escaparHTML(
                                        pedidoEdicion.id_pedido ||
                                        "-"
                                    )}
                                </strong>
                            </p>
                        `
                        : ""
                }

            </div>

            <form id="form-nuevo-pedido">

                <div class="pedido-seccion">

                    <div class="pedido-seccion-titulo">
                        CLIENTE
                    </div>

                    <div class="pedido-campo">

                        <div class="pedido-cliente-buscador">

                            <input
                                type="text"
                                id="pedido-cliente-busqueda"
                                class="pedido-cliente-busqueda"
                                placeholder="Buscar por nombre, apellido, Instagram o teléfono..."
                                autocomplete="off"
                            >

                            <div
                                id="pedido-cliente-resultados"
                                class="pedido-cliente-resultados"
                            ></div>

                        </div>

                        <select
                            name="cliente_id"
                            id="pedido-cliente"
                            style="display: none;"
                        >
                            <option value="">
                                Seleccionar cliente...
                            </option>
                        </select>

                        <div
                            id="pedido-cliente-seleccionado"
                            class="pedido-cliente-seleccionado"
                        ></div>

                        <button
                            type="button"
                            class="btn-nuevo-cliente-pedido"
                            id="btn-nuevo-cliente-pedido"
                        >
                            + NUEVO CLIENTE
                        </button>

                    </div>

                    <div class="pedido-campo">

                        <label>
                            CANAL DE VENTA
                        </label>

                        <select
                            name="canal_venta"
                        >

                            <option value="">
                                Seleccionar canal...
                            </option>

                        </select>

                    </div>

                </div>


                <div class="pedido-seccion">

                    <div class="pedido-seccion-titulo">
                        PRODUCTO
                    </div>

                    <div class="pedido-grid">

                        <div class="pedido-campo">

                            <label>
                                MODELO
                            </label>

                            <select
                                name="modelo_id"
                                id="pedido-modelo"
                            >

                                <option value="">
                                    Cargando modelos...
                                </option>

                            </select>

                        </div>

                        <div class="pedido-campo">

                            <label>
                                CÓDIGO
                            </label>

                            <input
                                type="text"
                                name="codigo"
                                id="pedido-codigo"
                                readonly
                            >

                        </div>

                    </div>

                </div>


                <div class="pedido-seccion">

                    <div class="pedido-seccion-titulo">
                        PERSONALIZACIÓN
                    </div>

                    <div class="pedido-grid">

                        <div class="pedido-campo">

                            <label>
                                MATERIAL
                            </label>

                            <input
                                type="text"
                                name="material"
                                id="pedido-material"
                                placeholder="Material"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                COLOR CUERO
                            </label>

                            <input
                                type="text"
                                name="color_cuero"
                                id="pedido-color-cuero"
                                placeholder="Color elegido"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                COLOR HILO
                            </label>

                            <input
                                type="text"
                                name="color_hilo"
                                id="pedido-color-hilo"
                                placeholder="Color elegido"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                TALLE
                            </label>

                            <input
                                type="text"
                                name="talle"
                                id="pedido-talle"
                                placeholder="Talle"
                            >

                        </div>

                    </div>


                    <div class="pedido-a-medida">

                        <label>

                            <input
                                type="checkbox"
                                name="a_medida"
                                id="pedido-a-medida"
                            >

                            A medida

                        </label>

                    </div>


                    <div
                        class="pedido-medidas"
                        id="pedido-medidas"
                    >

                        <div class="pedido-campo">

                            <label>
                                CUELLO
                            </label>

                            <input
                                type="number"
                                name="cuello"
                                min="0"
                                step="0.1"
                                placeholder="cm"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                BUSTO
                            </label>

                            <input
                                type="number"
                                name="busto"
                                min="0"
                                step="0.1"
                                placeholder="cm"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                CINTURA
                            </label>

                            <input
                                type="number"
                                name="cintura"
                                min="0"
                                step="0.1"
                                placeholder="cm"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                ALTO
                            </label>

                            <input
                                type="number"
                                name="alto"
                                min="0"
                                step="0.1"
                                placeholder="cm"
                            >

                        </div>

                    </div>

                </div>


                <div class="pedido-seccion">

                    <div class="pedido-seccion-titulo">
                        VENTA
                    </div>

                    <div class="pedido-grid">

                        <div class="pedido-campo">

                            <label>
                                PRECIO
                            </label>

                            <input
                                type="number"
                                name="precio"
                                id="pedido-precio"
                                min="0"
                                step="0.01"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                SEÑA
                            </label>

                            <input
                                type="number"
                                name="sena"
                                id="pedido-sena"
                                min="0"
                                step="0.01"
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                SALDO
                            </label>

                            <input
                                type="number"
                                name="saldo"
                                id="pedido-saldo"
                                readonly
                            >

                        </div>

                        <div class="pedido-campo">

                            <label>
                                MÉTODO DE PAGO
                            </label>

                            <select
                                name="metodo_pago"
                            >

                                <option value="">
                                    Seleccionar...
                                </option>

                            </select>

                        </div>

                    </div>

                </div>


                <div class="pedido-seccion">

                    <div class="pedido-seccion-titulo">
                        ENTREGA Y ESTADO
                    </div>

                    <div class="pedido-grid">

                        <div class="pedido-campo">

                            <label>
                                TIPO DE ENTREGA
                            </label>

                            <select
                                name="tipo_entrega"
                            >

                                <option value="">
                                    Seleccionar...
                                </option>

                            </select>

                        </div>

                        <div class="pedido-campo">

                            <label>
                                ESTADO
                            </label>

                            <select
                                name="estado"
                            >

                                <option value="">
                                    Seleccionar...
                                </option>

                            </select>

                        </div>

                        <div class="pedido-campo">

                            <label>
                                FECHA DE ENTREGA
                            </label>

                            <input
                                type="date"
                                name="fecha_entrega"
                            >

                        </div>

                    </div>

                </div>


                <div class="pedido-seccion">

                    <div class="pedido-seccion-titulo">
                        OBSERVACIONES
                    </div>

                    <div class="pedido-campo">

                        <textarea
                            name="observaciones"
                            rows="4"
                            placeholder="Notas del pedido..."
                        ></textarea>

                    </div>

                </div>


                <div
                    class="pedido-nuevo-mensaje"
                    id="nuevo-pedido-mensaje"
                ></div>


                <div class="pedido-nuevo-botones">

                    <button
                        type="button"
                        class="btn-cancelar-pedido"
                    >
                        CANCELAR
                    </button>

                    <button
                        type="submit"
                        class="btn-guardar-pedido"
                    >
                        ${esEdicion
                            ? "GUARDAR CAMBIOS"
                            : "CREAR PEDIDO"
                        }
                    </button>

                </div>

            </form>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    agregarEstilosNuevoPedido();


    /*
     * IMPORTANTE:
     * Esperamos a que termine de cargar
     * la configuración antes de
     * precargar los valores de edición.
     */

    await cargarConfiguracionPedido(
        modal
    );


    const formulario =
        modal.querySelector(
            "#form-nuevo-pedido"
        );


    const selectCliente =
        modal.querySelector(
            "#pedido-cliente"
        );


    const selectModelo =
        modal.querySelector(
            "#pedido-modelo"
        );


    const botonNuevoCliente =
        modal.querySelector(
            "#btn-nuevo-cliente-pedido"
        );


    const inputCodigo =
        modal.querySelector(
            "#pedido-codigo"
        );


    const inputMaterial =
        modal.querySelector(
            "#pedido-material"
        );


    const inputPrecio =
        modal.querySelector(
            "#pedido-precio"
        );


    const inputBusquedaCliente =
        modal.querySelector(
            "#pedido-cliente-busqueda"
        );


    const resultadosClientes =
        modal.querySelector(
            "#pedido-cliente-resultados"
        );


    const clienteSeleccionado =
        modal.querySelector(
            "#pedido-cliente-seleccionado"
        );


    const cerrarModal =
        () => modal.remove();


    modal
        .querySelector(
            ".pedido-nuevo-cerrar"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    modal
        .querySelector(
            ".pedido-nuevo-overlay"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    modal
        .querySelector(
            ".btn-cancelar-pedido"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    /* =====================================================
       CLIENTES
       ===================================================== */

    let clientesEmpresa = [];


    async function cargarClientesPedido(
        clienteSeleccionadoId = ""
    ) {

        try {

            const clientes =
                await llamarAPI(
                    "clientes",
                    empresaActual.empresa_id
                );


            clientesEmpresa =
                filtrarPorEmpresa(
                    clientes
                );


            clienteSeleccionado.innerHTML =
                "";


            resultadosClientes.innerHTML =
                "";


            if (!clientesEmpresa.length) {

                resultadosClientes.innerHTML = `
                    <div class="pedido-cliente-sin-resultados">
                        No hay clientes registrados.
                    </div>
                `;

                return;

            }


            if (
                clienteSeleccionadoId
            ) {

                seleccionarClientePedido(
                    clienteSeleccionadoId
                );

            }

        } catch (error) {

            console.error(
                "Error cargando clientes para pedido:",
                error
            );


            resultadosClientes.innerHTML = `
                <div class="pedido-cliente-sin-resultados">
                    No se pudieron cargar los clientes.
                </div>
            `;

        }

    }


    /* =====================================================
       MOSTRAR RESULTADOS CLIENTES
       ===================================================== */

    function mostrarResultadosClientes(
        textoBusqueda
    ) {

        const texto =
            String(
                textoBusqueda || ""
            )
            .trim()
            .toLowerCase();


        if (!texto) {

            resultadosClientes.innerHTML =
                "";

            return;

        }


        const resultados =
            clientesEmpresa.filter(
                cliente => {

                    const nombre =
                        String(
                            cliente.nombre || ""
                        )
                        .toLowerCase();

                    const apellido =
                        String(
                            cliente.apellido || ""
                        )
                        .toLowerCase();

                    const nombreCompleto =
                        `${nombre} ${apellido}`;


                    const instagram =
                        String(
                            cliente.instagram || ""
                        )
                        .toLowerCase();


                    const telefono =
                        String(
                            cliente.telefono || ""
                        )
                        .toLowerCase();


                    return (
                        nombre.includes(texto) ||
                        apellido.includes(texto) ||
                        nombreCompleto.includes(texto) ||
                        instagram.includes(texto) ||
                        telefono.includes(texto)
                    );

                }
            );


        if (!resultados.length) {

            resultadosClientes.innerHTML = `
                <div class="pedido-cliente-sin-resultados">
                    No se encontró ningún cliente.
                </div>
            `;

            return;

        }


        resultadosClientes.innerHTML =
            resultados
                .map(
                    cliente => {

                        const nombre =
                            `${cliente.nombre || ""} ${cliente.apellido || ""}`
                            .trim();


                        const instagram =
                            String(
                                cliente.instagram || ""
                            ).trim();


                        const telefono =
                            String(
                                cliente.telefono || ""
                            ).trim();


                        return `
                            <button
                                type="button"
                                class="pedido-cliente-resultado"
                                data-cliente-id="${escaparHTML(
                                    cliente.cliente_id
                                )}"
                            >

                                <span
                                    class="pedido-cliente-resultado-nombre"
                                >
                                    ${escaparHTML(
                                        nombre
                                    )}
                                </span>

                                ${
                                    instagram
                                        ? `
                                            <span
                                                class="pedido-cliente-resultado-instagram"
                                            >
                                                ${escaparHTML(
                                                    instagram
                                                )}
                                            </span>
                                        `
                                        : ""
                                }

                                ${
                                    telefono
                                        ? `
                                            <span
                                                class="pedido-cliente-resultado-telefono"
                                            >
                                                ${escaparHTML(
                                                    telefono
                                                )}
                                            </span>
                                        `
                                        : ""
                                }

                            </button>
                        `;

                    }
                )
                .join("");


        resultadosClientes
            .querySelectorAll(
                ".pedido-cliente-resultado"
            )
            .forEach(
                boton => {

                    boton.addEventListener(
                        "click",
                        function() {

                            seleccionarClientePedido(
                                this.dataset.clienteId
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       SELECCIONAR CLIENTE
       ===================================================== */

    function seleccionarClientePedido(
        clienteId
    ) {

        const cliente =
            clientesEmpresa.find(
                item =>
                    String(
                        item.cliente_id
                    ) ===
                    String(
                        clienteId
                    )
            );


        if (!cliente) {
            return;
        }


        selectCliente.innerHTML = `
            <option
                value="${escaparHTML(
                    cliente.cliente_id
                )}"
                selected
            >
                ${escaparHTML(
                    `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim()
                )}
            </option>
        `;


        selectCliente.value =
            String(
                cliente.cliente_id
            );


        const nombre =
            `${cliente.nombre || ""} ${cliente.apellido || ""}`
            .trim();


        const instagram =
            String(
                cliente.instagram || ""
            ).trim();


        clienteSeleccionado.innerHTML = `
            <div class="pedido-cliente-seleccionado-contenido">

                <span class="pedido-cliente-check">
                    ✓
                </span>

                <div>

                    <strong>
                        ${escaparHTML(
                            nombre
                        )}
                    </strong>

                    ${
                        instagram
                            ? `
                                <small>
                                    ${escaparHTML(
                                        instagram
                                    )}
                                </small>
                            `
                            : ""
                    }

                </div>

                <button
                    type="button"
                    class="pedido-cliente-quitar"
                    title="Cambiar cliente"
                >
                    ×
                </button>

            </div>
        `;


        inputBusquedaCliente.value =
            "";


        resultadosClientes.innerHTML =
            "";


        cargarMedidasCliente(
            cliente.cliente_id
        );


        const botonQuitar =
            clienteSeleccionado.querySelector(
                ".pedido-cliente-quitar"
            );


        if (botonQuitar) {

            botonQuitar.addEventListener(
                "click",
                function() {

                    limpiarClientePedido();

                }
            );

        }

    }


    /* =====================================================
       LIMPIAR CLIENTE
       ===================================================== */

    function limpiarClientePedido() {

        selectCliente.innerHTML = `
            <option value="">
                Seleccionar cliente...
            </option>
        `;


        selectCliente.value =
            "";


        clienteSeleccionado.innerHTML =
            "";


        resultadosClientes.innerHTML =
            "";


        inputBusquedaCliente.value =
            "";


        formulario.elements[
            "cuello"
        ].value = "";


        formulario.elements[
            "busto"
        ].value = "";


        formulario.elements[
            "cintura"
        ].value = "";


        formulario.elements[
            "alto"
        ].value = "";

    }


    /* =====================================================
       CARGAR MEDIDAS CLIENTE
       ===================================================== */

    function cargarMedidasCliente(
        clienteId
    ) {

        const cliente =
            clientesEmpresa.find(
                item =>
                    String(
                        item.cliente_id
                    ) ===
                    String(
                        clienteId
                    )
            );


        if (!cliente) {
            return;
        }


        /*
         * Solamente cargamos las medidas
         * automáticamente si estamos
         * creando un pedido.
         *
         * En edición primero queremos
         * mostrar las medidas guardadas
         * en el pedido.
         */

        if (!esEdicion) {

            formulario.elements[
                "cuello"
            ].value =
                cliente.medidas_cuello || "";


            formulario.elements[
                "busto"
            ].value =
                cliente.medidas_busto || "";


            formulario.elements[
                "cintura"
            ].value =
                cliente.medidas_cintura || "";


            formulario.elements[
                "alto"
            ].value =
                cliente.medidas_alto || "";

        }

    }


    inputBusquedaCliente.addEventListener(
        "input",
        function() {

            mostrarResultadosClientes(
                this.value
            );

        }
    );


    await cargarClientesPedido(
        esEdicion
            ? pedidoEdicion.cliente_id
            : ""
    );


    /* =====================================================
       NUEVO CLIENTE DESDE PEDIDO
       ===================================================== */

    if (botonNuevoCliente) {

        botonNuevoCliente.addEventListener(
            "click",
            function() {

                abrirNuevoCliente(
                    async function(
                        clienteCreado
                    ) {

                        await cargarClientesPedido(
                            clienteCreado.cliente_id
                        );


                        seleccionarClientePedido(
                            clienteCreado.cliente_id
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       SALDO AUTOMÁTICO
       ===================================================== */

    const precio =
        formulario.querySelector(
            "#pedido-precio"
        );


    const sena =
        formulario.querySelector(
            "#pedido-sena"
        );


    const saldo =
        formulario.querySelector(
            "#pedido-saldo"
        );


    function actualizarSaldo() {

        const precioValor =
            Number(
                precio.value || 0
            );


        const senaValor =
            Number(
                sena.value || 0
            );


        saldo.value =
            precioValor -
            senaValor;

    }


    precio.addEventListener(
        "input",
        actualizarSaldo
    );


    sena.addEventListener(
        "input",
        actualizarSaldo
    );


    /* =====================================================
       CARGAR MODELOS
       ===================================================== */

    let modelosEmpresa = [];


    try {

        const modelos =
            await llamarAPI(
                "modelos",
                empresaActual.empresa_id
            );


        modelosEmpresa =
            filtrarPorEmpresa(
                modelos
            );


        if (!modelosEmpresa.length) {

            selectModelo.innerHTML = `
                <option value="">
                    No hay modelos registrados
                </option>
            `;

        } else {

            selectModelo.innerHTML = `
                <option value="">
                    Seleccionar modelo...
                </option>

                ${modelosEmpresa
                    .map(
                        modelo => `
                            <option
                                value="${escaparHTML(
                                    modelo.modelo_id
                                )}"
                            >
                                ${escaparHTML(
                                    modelo.nombre || ""
                                )}
                            </option>
                        `
                    )
                    .join("")}

            `;

        }


        selectModelo.addEventListener(
            "change",
            function() {

                const modeloId =
                    this.value;


                if (!modeloId) {

                    inputCodigo.value =
                        "";


                    inputMaterial.value =
                        "";


                    /*
                     * En edición no queremos
                     * borrar el precio si
                     * accidentalmente se
                     * selecciona vacío.
                     */

                    if (!esEdicion) {

                        inputPrecio.value =
                            "";

                        actualizarSaldo();

                    }

                    return;

                }


                const modelo =
                    modelosEmpresa.find(
                        item =>
                            String(
                                item.modelo_id
                            ) ===
                            String(
                                modeloId
                            )
                    );


                if (!modelo) {
                    return;
                }


                inputCodigo.value =
                    modelo.codigo || "";


                /*
                 * Solo usamos material del modelo
                 * automáticamente si el campo
                 * está vacío.
                 */

                if (
                    !inputMaterial.value.trim()
                ) {

                    inputMaterial.value =
                        modelo.material_base || "";

                }


                /*
                 * Al crear un pedido,
                 * el precio viene del modelo.
                 *
                 * Al editar, conservamos
                 * el precio actual del pedido.
                 */

                if (
                    !esEdicion &&
                    !inputPrecio.value
                ) {

                    inputPrecio.value =
                        modelo.precio_venta || "";

                }


                actualizarSaldo();

            }
        );


    } catch (error) {

        console.error(
            "Error cargando modelos para pedido:",
            error
        );


        selectModelo.innerHTML = `
            <option value="">
                No se pudieron cargar los modelos
            </option>
        `;

    }


    /* =====================================================
       PRE-CARGAR DATOS DEL PEDIDO EN EDICIÓN
       ===================================================== */

    if (esEdicion) {

        /*
         * CLIENTE
         */

        seleccionarClientePedido(
            pedidoEdicion.cliente_id
        );


        /*
         * CANAL DE VENTA
         */

        formulario.elements[
            "canal_venta"
        ].value =
            pedidoEdicion.canal_venta || "";


        /*
         * MODELO
         */

        selectModelo.value =
            String(
                pedidoEdicion.modelo_id || ""
            );


        /*
         * Si el modelo existe,
         * completamos código.
         */

        const modeloEdicion =
            modelosEmpresa.find(
                item =>
                    String(
                        item.modelo_id
                    ) ===
                    String(
                        pedidoEdicion.modelo_id
                    )
            );


        if (modeloEdicion) {

            inputCodigo.value =
                pedidoEdicion.codigo ||
                modeloEdicion.codigo ||
                "";

        } else {

            inputCodigo.value =
                pedidoEdicion.codigo || "";

        }


        /*
         * PERSONALIZACIÓN
         */

        inputMaterial.value =
            pedidoEdicion.material || "";


        formulario.elements[
            "color_cuero"
        ].value =
            pedidoEdicion.color_cuero || "";


        formulario.elements[
            "color_hilo"
        ].value =
            pedidoEdicion.color_hilo || "";


        formulario.elements[
            "talle"
        ].value =
            pedidoEdicion.talle || "";


        /*
         * A MEDIDA
         */

        formulario.querySelector(
            "#pedido-a-medida"
        ).checked =
            pedidoEdicion.a_medida === true ||
            String(
                pedidoEdicion.a_medida
            ).toLowerCase() === "true" ||
            String(
                pedidoEdicion.a_medida
            ) === "1";


        /*
         * MEDIDAS
         */

        formulario.elements[
            "cuello"
        ].value =
            pedidoEdicion.cuello ?? "";


        formulario.elements[
            "busto"
        ].value =
            pedidoEdicion.busto ?? "";


        formulario.elements[
            "cintura"
        ].value =
            pedidoEdicion.cintura ?? "";


        formulario.elements[
            "alto"
        ].value =
            pedidoEdicion.alto ?? "";


        /*
         * VENTA
         */

        formulario.elements[
            "precio"
        ].value =
            pedidoEdicion.precio ?? "";


        formulario.elements[
            "sena"
        ].value =
            pedidoEdicion.sena ?? "";


        formulario.elements[
            "saldo"
        ].value =
            pedidoEdicion.saldo ??
            (
                Number(
                    pedidoEdicion.precio || 0
                ) -
                Number(
                    pedidoEdicion.sena || 0
                )
            );


        /*
         * CONFIGURACIÓN
         */

        formulario.elements[
            "metodo_pago"
        ].value =
            pedidoEdicion.metodo_pago || "";


        formulario.elements[
            "tipo_entrega"
        ].value =
            pedidoEdicion.tipo_entrega || "";


        formulario.elements[
            "estado"
        ].value =
            pedidoEdicion.estado || "";


        /*
         * FECHA DE ENTREGA
         */

        if (
            pedidoEdicion.fecha_entrega
        ) {

            formulario.elements[
                "fecha_entrega"
            ].value =
                String(
                    pedidoEdicion.fecha_entrega
                ).substring(
                    0,
                    10
                );

        }


        /*
         * OBSERVACIONES
         */

        formulario.elements[
            "observaciones"
        ].value =
            pedidoEdicion.observaciones || "";


        actualizarSaldo();

    }


    /* =====================================================
       GUARDAR PEDIDO
       ===================================================== */

    formulario.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const boton =
                formulario.querySelector(
                    ".btn-guardar-pedido"
                );


            const mensaje =
                formulario.querySelector(
                    "#nuevo-pedido-mensaje"
                );


            const formData =
                new FormData(
                    formulario
                );


            const clienteId =
                formData.get(
                    "cliente_id"
                );


            const modeloId =
                formData.get(
                    "modelo_id"
                );


            if (!clienteId) {

                alert(
                    "Seleccioná un cliente."
                );

                return;

            }


            if (!modeloId) {

                alert(
                    "Seleccioná un modelo."
                );

                return;

            }


            const precioValor =
                Number(
                    formData.get(
                        "precio"
                    ) || 0
                );


            const senaValor =
                Number(
                    formData.get(
                        "sena"
                    ) || 0
                );


            if (
                precioValor < 0 ||
                senaValor < 0
            ) {

                alert(
                    "El precio y la seña no pueden ser negativos."
                );

                return;

            }


            if (
                senaValor >
                precioValor
            ) {

                alert(
                    "La seña no puede ser mayor que el precio."
                );

                return;

            }


            const cliente =
                clientesEmpresa.find(
                    item =>
                        String(
                            item.cliente_id
                        ) ===
                        String(
                            clienteId
                        )
                );


            const modelo =
                modelosEmpresa.find(
                    item =>
                        String(
                            item.modelo_id
                        ) ===
                        String(
                            modeloId
                        )
                );


            if (!modelo) {

                alert(
                    "No se encontró el modelo seleccionado."
                );

                return;

            }


            const data = {

                empresa_id:
                    Number(
                        empresaActual.empresa_id
                    ),


                /*
                 * En edición conservamos
                 * la fecha original.
                 *
                 * En nuevo usamos la fecha actual.
                 */

                fecha:
                    esEdicion
                        ? (
                            pedidoEdicion.fecha ||
                            new Date()
                                .toISOString()
                                .split("T")[0]
                        )
                        : new Date()
                            .toISOString()
                            .split("T")[0],


                cliente_id:
                    Number(
                        clienteId
                    ),


                cliente_nombre:
                    cliente
                        ? `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim()
                        : "",


                telefono:
                    cliente
                        ? String(
                            cliente.telefono || ""
                        ).trim()
                        : "",


                instagram:
                    cliente
                        ? String(
                            cliente.instagram || ""
                        ).trim()
                        : "",


                canal_venta:
                    String(
                        formData.get(
                            "canal_venta"
                        ) || ""
                    ).trim(),


                modelo_id:
                    Number(
                        modeloId
                    ),


                codigo:
                    modelo
                        ? String(
                            modelo.codigo || ""
                        ).trim()
                        : "",


                modelo:
                    modelo
                        ? String(
                            modelo.nombre || ""
                        ).trim()
                        : "",


                material:
                    String(
                        formData.get(
                            "material"
                        ) || ""
                    ).trim(),


                color_cuero:
                    String(
                        formData.get(
                            "color_cuero"
                        ) || ""
                    ).trim(),


                color_hilo:
                    String(
                        formData.get(
                            "color_hilo"
                        ) || ""
                    ).trim(),


                talle:
                    String(
                        formData.get(
                            "talle"
                        ) || ""
                    ).trim(),


                a_medida:
                    formulario.querySelector(
                        "#pedido-a-medida"
                    ).checked,


                cuello:
                    formData.get(
                        "cuello"
                    ) === ""
                        ? ""
                        : Number(
                            formData.get(
                                "cuello"
                            )
                        ),


                busto:
                    formData.get(
                        "busto"
                    ) === ""
                        ? ""
                        : Number(
                            formData.get(
                                "busto"
                            )
                        ),


                cintura:
                    formData.get(
                        "cintura"
                    ) === ""
                        ? ""
                        : Number(
                            formData.get(
                                "cintura"
                            )
                        ),


                alto:
                    formData.get(
                        "alto"
                    ) === ""
                        ? ""
                        : Number(
                            formData.get(
                                "alto"
                            )
                        ),


                precio:
                    precioValor,


                sena:
                    senaValor,


                saldo:
                    precioValor -
                    senaValor,


                metodo_pago:
                    String(
                        formData.get(
                            "metodo_pago"
                        ) || ""
                    ).trim(),


                tipo_entrega:
                    String(
                        formData.get(
                            "tipo_entrega"
                        ) || ""
                    ).trim(),


                estado:
                    String(
                        formData.get(
                            "estado"
                        ) || ""
                    ).trim(),


                fecha_entrega:
                    String(
                        formData.get(
                            "fecha_entrega"
                        ) || ""
                    ).trim(),


                observaciones:
                    String(
                        formData.get(
                            "observaciones"
                        ) || ""
                    ).trim()

            };


            boton.disabled =
                true;


            boton.textContent =
                esEdicion
                    ? "GUARDANDO..."
                    : "CREANDO...";


            mensaje.textContent =
                esEdicion
                    ? "Guardando cambios..."
                    : "Guardando pedido...";


            mensaje.className =
                "pedido-nuevo-mensaje";


            try {

                const payload = {

                    action:
                        esEdicion
                            ? "update"
                            : "insert",


                    resource:
                        "pedidos",


                    data:
                        data

                };


                /*
                 * En actualización necesitamos
                 * enviar el ID del pedido.
                 */

                if (esEdicion) {

                    payload.id =
                        pedidoEdicion.id_pedido;

                }


                const response =
                    await fetch(
                        API_URL,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "text/plain;charset=utf-8"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }
                    );


                const resultado =
                    await response.json();


                if (!resultado.success) {

                    throw new Error(
                        resultado.error ||
                        (
                            esEdicion
                                ? "No se pudieron guardar los cambios."
                                : "No se pudo crear el pedido."
                        )
                    );

                }


                mensaje.textContent =
                    esEdicion
                        ? "Pedido actualizado correctamente."
                        : "Pedido creado correctamente.";


                mensaje.className =
                    "pedido-nuevo-mensaje exito";


                setTimeout(
                    async function() {

                        modal.remove();


                        try {

                            await iniciarPedidos();

                        } catch (error) {

                            console.error(
                                "Error actualizando pedidos:",
                                error
                            );

                        }


                        try {

                            await iniciarDashboard();

                        } catch (error) {

                            console.error(
                                "Error actualizando Dashboard:",
                                error
                            );

                        }

                    },
                    700
                );


            } catch (error) {

                console.error(
                    esEdicion
                        ? "Error actualizando pedido:"
                        : "Error creando pedido:",
                    error
                );


                mensaje.textContent =
                    esEdicion
                        ? "No se pudieron guardar los cambios."
                        : "No se pudo crear el pedido.";


                mensaje.className =
                    "pedido-nuevo-mensaje error";


                boton.disabled =
                    false;


                boton.textContent =
                    esEdicion
                        ? "GUARDAR CAMBIOS"
                        : "CREAR PEDIDO";


                alert(
                    (
                        esEdicion
                            ? "No se pudieron guardar los cambios.\n\n"
                            : "No se pudo crear el pedido.\n\n"
                    ) +
                    error.message
                );

            }

        }
    );

}


/* =========================================================
   EDITAR PEDIDO
   ========================================================= */

function editarPedido(
    pedido,
    pedidosEmpresa
) {

    if (!pedido) {

        alert(
            "No se encontró el pedido."
        );

        return;

    }


    mostrarNuevoPedido(
        pedido,
        pedidosEmpresa
    );

}


/* =========================================================
   GUARDAR NUEVO PEDIDO
   ========================================================= */

async function guardarNuevoPedido(
    formulario,
    modal,
    clientesEmpresa,
    modelosEmpresa
) {
    const boton = formulario.querySelector(".btn-guardar-pedido");
    const mensaje = formulario.querySelector("#nuevo-pedido-mensaje");
    const formData = new FormData(formulario);

    const clienteId = String(
        formData.get("cliente_id") || ""
    ).trim();

    const modeloId = String(
        formData.get("modelo_id") || ""
    ).trim();

    if (!clienteId) {
        alert("Seleccioná un cliente.");
        return;
    }

    if (!modeloId) {
        alert("Seleccioná un modelo.");
        return;
    }

    if (!empresaActual) {
        alert("No hay una empresa seleccionada.");
        return;
    }

    const cliente = clientesEmpresa.find(
        item =>
            String(item.cliente_id) ===
            String(clienteId)
    );

    if (!cliente) {
        alert("No se encontró el cliente seleccionado.");
        return;
    }

    const modelo = modelosEmpresa.find(
        item =>
            String(item.modelo_id) ===
            String(modeloId)
    );

    if (!modelo) {
        alert("No se encontró el modelo seleccionado.");
        return;
    }

    const precio = Number(
        formData.get("precio") || 0
    );

    const sena = Number(
        formData.get("sena") || 0
    );

    const saldo = precio - sena;

    if (precio < 0) {
        alert("El precio no puede ser negativo.");
        return;
    }

    if (sena < 0) {
        alert("La seña no puede ser negativa.");
        return;
    }

    if (sena > precio) {
        alert("La seña no puede ser mayor que el precio.");
        return;
    }

    const convertirMedida = nombreCampo => {
        const valor = formData.get(nombreCampo);
        return valor === "" ? "" : Number(valor);
    };

    const data = {
        empresa_id: Number(empresaActual.empresa_id),
        fecha:
            formData.get("fecha") ||
            new Date().toISOString().split("T")[0],
        cliente_id: Number(cliente.cliente_id),
        cliente_nombre:
            `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim(),
        telefono: String(
            cliente.telefono || ""
        ).trim(),
        instagram: String(
            cliente.instagram || ""
        ).trim(),
        canal_venta: String(
            formData.get("canal_venta") || ""
        ).trim(),
        modelo_id: Number(modelo.modelo_id),
        modelo: String(
            modelo.nombre || ""
        ).trim(),
        codigo: String(
            modelo.codigo || ""
        ).trim(),
        material: String(
            formData.get("material") ||
            modelo.material_base ||
            ""
        ).trim(),
        color_cuero: String(
            formData.get("color_cuero") || ""
        ).trim(),
        color_hilo: String(
            formData.get("color_hilo") || ""
        ).trim(),
        talle: String(
            formData.get("talle") || ""
        ).trim(),
        a_medida:
            formulario.elements["a_medida"] &&
            formulario.elements["a_medida"].checked
                ? true
                : false,
        cuello: convertirMedida("cuello"),
        busto: convertirMedida("busto"),
        cintura: convertirMedida("cintura"),
        alto: convertirMedida("alto"),
        precio,
        sena,
        saldo,
        metodo_pago: String(
            formData.get("metodo_pago") || ""
        ).trim(),
        tipo_entrega: String(
            formData.get("tipo_entrega") || ""
        ).trim(),
        estado: String(
            formData.get("estado") || ""
        ).trim(),
        fecha_entrega:
            formData.get("fecha_entrega") || "",
        observaciones: String(
            formData.get("observaciones") || ""
        ).trim()
    };

    boton.disabled = true;
    boton.textContent = "CREANDO...";
    mensaje.textContent = "Guardando pedido...";
    mensaje.className = "pedido-nuevo-mensaje";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "insert",
                resource: "pedidos",
                data
            })
        });

        const resultado = await response.json();

        if (!resultado.success) {
            throw new Error(
                resultado.error ||
                "No se pudo crear el pedido."
            );
        }

        mensaje.textContent =
            "Pedido creado correctamente.";

        mensaje.className =
            "pedido-nuevo-mensaje exito";

        setTimeout(async function() {
            modal.remove();

            try {
                await iniciarPedidos();
                console.log("Pedidos actualizados correctamente.");
            } catch (error) {
                console.error(
                    "Error actualizando pedidos:",
                    error
                );
            }

            try {
                await iniciarDashboard();
                console.log("Dashboard actualizado correctamente.");
            } catch (error) {
                console.error(
                    "ERROR REAL ACTUALIZANDO DASHBOARD:",
                    error
                );
            }
        }, 700);

    } catch (error) {
        console.error(
            "Error creando pedido:",
            error
        );

        mensaje.textContent =
            "No se pudo crear el pedido.";

        mensaje.className =
            "pedido-nuevo-mensaje error";

        boton.disabled = false;
        boton.textContent =
            "CREAR PEDIDO";

        alert(
            "No se pudo crear el pedido.\n\n" +
            error.message
        );
    }
}

/* =========================================================
   CARGAR CONFIGURACIÓN PEDIDO
   ========================================================= */

async function cargarConfiguracionPedido(modal) {

    const formulario =
        modal.querySelector(
            "#form-nuevo-pedido"
        );

    if (!formulario) {
        return;
    }

    const selectMetodoPago =
        formulario.elements["metodo_pago"];

    const selectTipoEntrega =
        formulario.elements["tipo_entrega"];

    const selectEstado =
        formulario.elements["estado"];

    const selectCanalVenta =
        formulario.elements["canal_venta"];

    try {

        const configuracion =
            await llamarAPI(
                "configuracion",
                empresaActual.empresa_id
            );

        const configuracionActiva =
            configuracion.filter(
                item => {

                    return (
                        String(
                            item.activo
                        ).toLowerCase() ===
                        "true" ||

                        item.activo === true ||

                        item.activo === 1
                    );

                }
            );

        const cargarOpciones =
            (
                select,
                categoria,
                textoInicial
            ) => {

                if (!select) {
                    return;
                }

                const opciones =
                    configuracionActiva
                        .filter(
                            item =>
                                String(
                                    item.categoria || ""
                                ).toUpperCase() ===
                                categoria
                        )
                        .sort(
                            (a, b) =>
                                Number(
                                    a.orden || 0
                                ) -
                                Number(
                                    b.orden || 0
                                )
                        );

                select.innerHTML = `
                    <option value="">
                        ${textoInicial}
                    </option>

                    ${
                        opciones.map(
                            item => `
                                <option
                                    value="${escaparHTML(
                                        item.valor || ""
                                    )}"
                                >
                                    ${escaparHTML(
                                        item.valor || ""
                                    )}
                                </option>
                            `
                        ).join("")
                    }
                `;
            };


        /*
         * MÉTODO DE PAGO
         */

        cargarOpciones(
            selectMetodoPago,
            "METODO_PAGO",
            "Seleccionar..."
        );


        /*
         * TIPO DE ENTREGA
         */

        cargarOpciones(
            selectTipoEntrega,
            "TIPO_ENTREGA",
            "Seleccionar..."
        );


        /*
         * ESTADO DEL PEDIDO
         */

        cargarOpciones(
            selectEstado,
            "ESTADO_PEDIDO",
            "Seleccionar..."
        );


        /*
         * CANAL DE VENTA
         */

        cargarOpciones(
            selectCanalVenta,
            "CANAL",
            "Seleccionar canal..."
        );

    } catch (error) {

        console.error(
            "Error cargando configuración del pedido:",
            error
        );

        if (selectMetodoPago) {
            selectMetodoPago.innerHTML =
                `<option value="">No disponible</option>`;
        }

        if (selectTipoEntrega) {
            selectTipoEntrega.innerHTML =
                `<option value="">No disponible</option>`;
        }

        if (selectEstado) {
            selectEstado.innerHTML =
                `<option value="">No disponible</option>`;
        }

        if (selectCanalVenta) {
            selectCanalVenta.innerHTML =
                `<option value="">No disponible</option>`;
        }

    }
}
/* =========================================================
   ESTILOS NUEVO PEDIDO
   ========================================================= */

function agregarEstilosNuevoPedido() {

    /*
     * Eliminamos los estilos anteriores
     * para aplicar siempre la versión actual.
     */

    const estilosAnteriores =
        document.getElementById(
            "zaria-nuevo-pedido-styles"
        );

    if (estilosAnteriores) {
        estilosAnteriores.remove();
    }


    const style =
        document.createElement("style");

    style.id =
        "zaria-nuevo-pedido-styles";


    style.textContent = `

        /* =================================================
           VENTANA PRINCIPAL
           ================================================= */

        .pedido-nuevo-modal {
            position: fixed;
            inset: 0;
            z-index: 9999;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 24px;

            box-sizing: border-box;
        }


        /* =================================================
           FONDO OSCURO
           ================================================= */

        .pedido-nuevo-overlay {
            position: absolute;
            inset: 0;

            background: rgba(0, 0, 0, .55);
        }


        /* =================================================
           CONTENIDO
           ================================================= */

        .pedido-nuevo-contenido {
            position: relative;
            z-index: 1;

            width: 100%;
            max-width: 1000px;

            max-height: 92vh;

            overflow-y: auto;

            padding: 42px 46px;

            box-sizing: border-box;

            background: #fff;

            border-radius: 16px;

            box-shadow:
                0 20px 60px rgba(0,0,0,.22);
        }


        /* =================================================
           BOTÓN CERRAR
           ================================================= */

        .pedido-nuevo-cerrar {
            position: absolute;

            top: 18px;
            right: 20px;

            width: 38px;
            height: 38px;

            border: none;

            background: transparent;

            font-size: 28px;

            line-height: 1;

            color: #555;

            cursor: pointer;
        }


        /* =================================================
           ENCABEZADO
           ================================================= */

        .pedido-nuevo-header {
            padding-right: 50px;

            margin-bottom: 34px;
        }


        .pedido-nuevo-header > span {
            display: block;

            margin-bottom: 8px;

            font-size: 10px;

            font-weight: bold;

            letter-spacing: 2px;

            color: #888;
        }


        .pedido-nuevo-header h2 {
            margin: 0 0 7px;

            font-size: 30px;

            line-height: 1.15;

            color: #222;
        }


        .pedido-nuevo-header p {
            margin: 0;

            font-size: 14px;

            color: #777;
        }


        /* =================================================
           SECCIONES
           ================================================= */

        .pedido-seccion {
            margin-bottom: 34px;

            padding-top: 28px;

            border-top:
                1px solid #e5e5e5;
        }


        .pedido-seccion:first-of-type {
            padding-top: 0;

            border-top: none;
        }


        .pedido-seccion-titulo {
            margin-bottom: 20px;

            font-size: 10px;

            font-weight: bold;

            letter-spacing: 2px;

            color: #777;
        }


        /* =================================================
           GRILLAS
           ================================================= */

        .pedido-grid {
            display: grid;

            grid-template-columns:
                repeat(2, minmax(0, 1fr));

            column-gap: 28px;

            row-gap: 24px;
        }


        /* =================================================
           CAMPOS
           ================================================= */

        .pedido-campo {
            display: flex;

            flex-direction: column;

            gap: 8px;
        }


        .pedido-campo label {
            font-size: 10px;

            font-weight: bold;

            letter-spacing: 1.4px;

            color: #777;
        }


        .pedido-campo input,
        .pedido-campo select,
        .pedido-campo textarea {

            width: 100%;

            min-height: 48px;

            box-sizing: border-box;

            padding:
                12px 14px;

            border:
                1px solid #d8d8d8;

            border-radius: 9px;

            background: #fff;

            color: #222;

            font-size: 14px;

            outline: none;

            transition:
                border-color .2s ease,
                box-shadow .2s ease;
        }


        .pedido-campo input:focus,
        .pedido-campo select:focus,
        .pedido-campo textarea:focus {

            border-color: #999;

            box-shadow:
                0 0 0 2px
                rgba(0,0,0,.04);
        }


        .pedido-campo input[readonly] {

            background: #f6f6f6;

            color: #777;
        }


        .pedido-campo textarea {

            min-height: 110px;

            resize: vertical;
        }


        /* =================================================
           SELECTOR DE CLIENTE
           ================================================= */

        .pedido-cliente-selector {

            display: flex;

            flex-direction: column;

            gap: 14px;
        }


        /*
         * El buscador ocupa todo el ancho.
         */

        .pedido-cliente-selector input {

            width: 100%;
        }


        /* =================================================
           BOTÓN NUEVO CLIENTE
           ================================================= */

        .btn-nuevo-cliente-pedido {

            align-self: flex-start;

            height: 44px;

            margin-top: 4px;
            margin-bottom: 6px;

            padding:
                0 20px;

            border:
                1px solid #ccc;

            border-radius: 9px;

            background: #fff;

            color: #333;

            font-size: 10px;

            font-weight: bold;

            letter-spacing: 1px;

            cursor: pointer;

            transition:
                background .2s ease,
                border-color .2s ease;
        }


        .btn-nuevo-cliente-pedido:hover {

            background: #f5f5f5;

            border-color: #aaa;
        }


        /* =================================================
           CLIENTE SELECCIONADO
           ================================================= */

        .pedido-cliente-seleccionado {

            min-height: 58px;

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 15px;

            padding:
                12px 16px;

            box-sizing: border-box;

            border:
                1px solid #ddd;

            border-radius: 10px;

            background: #fafafa;
        }


        /* =================================================
           A MEDIDA
           ================================================= */

        .pedido-a-medida {

            margin-top: 22px;
        }


        .pedido-a-medida label {

            display: flex;

            align-items: center;

            gap: 9px;

            font-size: 13px;

            color: #444;

            cursor: pointer;
        }


        .pedido-a-medida input {

            width: 17px;

            height: 17px;
        }


        /* =================================================
           MEDIDAS
           ================================================= */

        .pedido-medidas {

            display: none;

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

            gap: 18px;

            margin-top: 20px;

            padding: 20px;

            background: #f7f7f7;

            border-radius: 10px;
        }


        .pedido-medidas.visible {

            display: grid;
        }


        /* =================================================
           MENSAJE
           ================================================= */

        .pedido-nuevo-mensaje {

            min-height: 22px;

            margin-top: 12px;

            font-size: 12px;
        }


        /* =================================================
           BOTONES FINALES
           ================================================= */

        .pedido-nuevo-botones {

            display: flex;

            justify-content: flex-end;

            gap: 12px;

            margin-top: 34px;

            padding-top: 24px;

            border-top:
                1px solid #e5e5e5;
        }


        .pedido-nuevo-botones button {

            height: 46px;

            padding:
                0 24px;

            border-radius: 9px;

            font-size: 10px;

            font-weight: bold;

            letter-spacing: 1px;

            cursor: pointer;
        }


        .btn-cancelar-pedido {

            border:
                1px solid #d8d8d8;

            background: #fff;

            color: #333;
        }


        .btn-guardar-pedido {

            border:
                1px solid #1d1a1a;

            background: #1d1a1a;

            color: #fff;
        }


        /* =================================================
           TABLET
           ================================================= */

        @media (max-width: 800px) {

            .pedido-nuevo-modal {

                padding: 12px;
            }


            .pedido-nuevo-contenido {

                max-height: 94vh;

                padding:
                    32px 28px;
            }


            .pedido-grid {

                column-gap: 20px;
            }


            .pedido-medidas {

                grid-template-columns:
                    repeat(2, 1fr);
            }
        }


        /* =================================================
           CELULAR
           ================================================= */

        @media (max-width: 600px) {

            .pedido-nuevo-contenido {

                padding:
                    28px 20px;

                border-radius: 12px;
            }


            .pedido-nuevo-header h2 {

                font-size: 24px;
            }


            .pedido-grid {

                grid-template-columns: 1fr;

                row-gap: 20px;
            }


            .pedido-medidas {

                grid-template-columns: 1fr;
            }


            .pedido-nuevo-botones {

                flex-direction: column;
            }


            .pedido-nuevo-botones button {

                width: 100%;
            }
        }

    `;


    document.head.appendChild(style);


    /*
     * Checkbox A MEDIDA
     */

    const checkbox =
        document.getElementById(
            "pedido-a-medida"
        );

    const medidas =
        document.getElementById(
            "pedido-medidas"
        );


    if (checkbox && medidas) {

        checkbox.addEventListener(
            "change",
            function() {

                medidas.classList.toggle(
                    "visible",
                    this.checked
                );

            }
        );

    }

}

/* =========================================================
   VISTA PEDIDOS
   ========================================================= */

function mostrarVistaPedidos() {
    cerrarModalesAbiertos();

    const dashboard = document.getElementById("dashboard-view");
    const modelos = document.getElementById("modelos-view");
    const pedidos = document.getElementById("pedidos-view");
    const clientes = document.getElementById("clientes-view");

    if (dashboard) {
        dashboard.style.display = "none";
    }

    if (modelos) {
        modelos.style.display = "none";
    }

    if (clientes) {
        clientes.style.display = "none";
    }

    if (pedidos) {
        pedidos.style.display = "block";
    }

    iniciarPedidos();
}

/* =========================================================
   FICHA DE PEDIDO
   ========================================================= */

function mostrarFichaPedido(id, pedidos) {
    const pedido = pedidos.find(
        item => String(item.id_pedido) === String(id)
    );

    if (!pedido) {
        alert("No se encontró el pedido.");
        return;
    }

    const nombreCliente =
        pedido.cliente_nombre || "Cliente sin nombre";

    const medidas = [
        pedido.cuello ? `Cuello: ${pedido.cuello} cm` : "",
        pedido.busto ? `Busto: ${pedido.busto} cm` : "",
        pedido.cintura ? `Cintura: ${pedido.cintura} cm` : "",
        pedido.alto ? `Alto: ${pedido.alto} cm` : ""
    ].filter(Boolean).join(" · ");

    const modal = document.createElement("div");
    modal.className = "pedido-ficha-modal";

    modal.innerHTML = `
        <div class="pedido-ficha-overlay"></div>

        <div class="pedido-ficha-contenido">

            <button
                type="button"
                class="pedido-ficha-cerrar"
            >
                ×
            </button>

            <div class="pedido-ficha-header">
                <span>PEDIDO #${escaparHTML(pedido.id_pedido || "-")}</span>

                <h2>
                    ${escaparHTML(nombreCliente)}
                </h2>

                    <p>
                        ${escaparHTML(
                                pedido.fecha
                                    ? formatearFecha(pedido.fecha)
                                    : "-"
                            )}
                    </p>
            </div>

            <div class="pedido-ficha-seccion">

                <div class="pedido-ficha-seccion-titulo">
                    ESTADO
                </div>

                <div class="pedido-ficha-estado">
                    ${escaparHTML(pedido.estado || "-")}
                </div>

            </div>

            <div class="pedido-ficha-seccion">

                <div class="pedido-ficha-seccion-titulo">
                    CLIENTE
                </div>

                <div class="pedido-ficha-grid">

                    <div class="pedido-ficha-dato">
                        <span>NOMBRE</span>
                        <strong>
                            ${escaparHTML(nombreCliente)}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>TELÉFONO</span>
                        <strong>
                            ${escaparHTML(pedido.telefono || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>INSTAGRAM</span>
                        <strong>
                            ${escaparHTML(pedido.instagram || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>CANAL DE VENTA</span>
                        <strong>
                            ${escaparHTML(pedido.canal_venta || "-")}
                        </strong>
                    </div>

                </div>

            </div>

            <div class="pedido-ficha-seccion">

                <div class="pedido-ficha-seccion-titulo">
                    PRODUCTO
                </div>

                <div class="pedido-ficha-grid">

                    <div class="pedido-ficha-dato">
                        <span>MODELO</span>
                        <strong>
                            ${escaparHTML(pedido.modelo || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>CÓDIGO</span>
                        <strong>
                            ${escaparHTML(pedido.codigo || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>MATERIAL</span>
                        <strong>
                            ${escaparHTML(pedido.material || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>COLOR CUERO</span>
                        <strong>
                            ${escaparHTML(pedido.color_cuero || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>COLOR HILO</span>
                        <strong>
                            ${escaparHTML(pedido.color_hilo || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>TALLE</span>
                        <strong>
                            ${escaparHTML(pedido.talle || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>A MEDIDA</span>
                        <strong>
                            ${pedido.a_medida ? "Sí" : "No"}
                        </strong>
                    </div>

                </div>

                <div class="pedido-ficha-subseccion">

                    <span>MEDIDAS</span>

                    <strong>
                        ${escaparHTML(medidas || "Sin medidas cargadas.")}
                    </strong>

                </div>

            </div>

            <div class="pedido-ficha-seccion">

                <div class="pedido-ficha-seccion-titulo">
                    VALORES Y COBRO
                </div>

                <div class="pedido-ficha-grid">

                    <div class="pedido-ficha-dato">
                        <span>PRECIO</span>
                        <strong>
                            $${escaparHTML(pedido.precio || "0")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>SEÑA</span>
                        <strong>
                            $${escaparHTML(pedido.sena || "0")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>SALDO</span>
                        <strong>
                            $${escaparHTML(pedido.saldo || "0")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>MÉTODO DE PAGO</span>
                        <strong>
                            ${escaparHTML(pedido.metodo_pago || "-")}
                        </strong>
                    </div>

                </div>

            </div>

            <div class="pedido-ficha-seccion">

                <div class="pedido-ficha-seccion-titulo">
                    ENTREGA
                </div>

                <div class="pedido-ficha-grid">

                    <div class="pedido-ficha-dato">
                        <span>TIPO DE ENTREGA</span>
                        <strong>
                            ${escaparHTML(pedido.tipo_entrega || "-")}
                        </strong>
                    </div>

                    <div class="pedido-ficha-dato">
                        <span>FECHA DE ENTREGA</span>
                        <strong>
                            ${escaparHTML(pedido.fecha_entrega || "-")}
                        </strong>
                    </div>

                </div>

            </div>

            <div class="pedido-ficha-seccion">

                <div class="pedido-ficha-seccion-titulo">
                    OBSERVACIONES
                </div>

                <div class="pedido-ficha-observaciones">
                    ${escaparHTML(
                        pedido.observaciones ||
                        "Sin observaciones."
                    )}
                </div>

            </div>

            <div class="pedido-ficha-botones">

                <button
                    type="button"
                    class="btn-pedido-ficha-cerrar"
                >
                    CERRAR
                </button>

                <button
                    type="button"
                    class="btn-pedido-ficha-nuevo"
                >
                    NUEVO PEDIDO
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);
    agregarEstilosFichaPedido();

    const cerrarModal = () => modal.remove();

    modal
        .querySelector(".pedido-ficha-cerrar")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".pedido-ficha-overlay")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".btn-pedido-ficha-cerrar")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".btn-pedido-ficha-nuevo")
        .addEventListener("click", function() {
            cerrarModal();
            mostrarNuevoPedido();
        });
}

/* =========================================================
   ESTILOS FICHA DE PEDIDO
   ========================================================= */

function agregarEstilosFichaPedido() {

    /*
     * Eliminamos estilos anteriores para que
     * siempre se aplique la versión actual.
     */

    const estilosAnteriores =
        document.getElementById(
            "zaria-ficha-pedido-styles"
        );

    if (estilosAnteriores) {
        estilosAnteriores.remove();
    }


    const style =
        document.createElement("style");

    style.id =
        "zaria-ficha-pedido-styles";


    style.textContent = `

        /* =================================================
           VENTANA
           ================================================= */

        .pedido-ficha-modal {

            position: fixed;

            inset: 0;

            z-index: 9999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 24px;

            box-sizing: border-box;

        }


        /* =================================================
           FONDO
           ================================================= */

        .pedido-ficha-overlay {

            position: absolute;

            inset: 0;

            background:
                rgba(0, 0, 0, .55);

        }


        /* =================================================
           CONTENIDO
           ================================================= */

        .pedido-ficha-contenido {

            position: relative;

            z-index: 1;

            width: 100%;

            max-width: 900px;

            max-height: 92vh;

            overflow-y: auto;

            padding: 42px 46px;

            box-sizing: border-box;

            background: #fff;

            border-radius: 16px;

            box-shadow:
                0 20px 60px
                rgba(0, 0, 0, .22);

        }


        /* =================================================
           BOTÓN CERRAR
           ================================================= */

        .pedido-ficha-cerrar {

            position: absolute;

            top: 18px;

            right: 20px;

            width: 38px;

            height: 38px;

            border: none;

            background: transparent;

            font-size: 28px;

            line-height: 1;

            color: #555;

            cursor: pointer;

        }


        .pedido-ficha-cerrar:hover {

            color: #111;

        }


        /* =================================================
           ENCABEZADO
           ================================================= */

        .pedido-ficha-header {

            padding-right: 50px;

            margin-bottom: 34px;

        }


        .pedido-ficha-header span {

            display: block;

            margin-bottom: 8px;

            font-size: 10px;

            font-weight: bold;

            letter-spacing: 2px;

            color: #888;

        }


        .pedido-ficha-header h2 {

            margin: 0 0 7px;

            font-size: 30px;

            line-height: 1.15;

            color: #222;

        }


        .pedido-ficha-header p {

            margin: 0;

            font-size: 14px;

            color: #777;

        }


        /* =================================================
           SECCIONES
           ================================================= */

        .pedido-ficha-seccion {

            margin-bottom: 34px;

            padding-top: 28px;

            border-top:
                1px solid #e5e5e5;

        }


        .pedido-ficha-seccion:first-of-type {

            padding-top: 0;

            border-top: none;

        }


        .pedido-ficha-seccion-titulo {

            margin-bottom: 20px;

            font-size: 10px;

            font-weight: bold;

            letter-spacing: 2px;

            color: #777;

        }


        /* =================================================
           ESTADO
           ================================================= */

        .pedido-ficha-estado {

            display: inline-flex;

            align-items: center;

            min-height: 38px;

            padding: 0 18px;

            box-sizing: border-box;

            border:
                1px solid #d8d8d8;

            border-radius: 20px;

            background: #f7f7f7;

            color: #333;

            font-size: 11px;

            font-weight: bold;

            letter-spacing: 1px;

        }


        /* =================================================
           GRILLA DE DATOS
           ================================================= */

        .pedido-ficha-grid {

            display: grid;

            grid-template-columns:
                repeat(3, minmax(0, 1fr));

            column-gap: 30px;

            row-gap: 24px;

        }


        /* =================================================
           DATO
           ================================================= */

        .pedido-ficha-dato {

            min-width: 0;

        }


        .pedido-ficha-dato span {

            display: block;

            margin-bottom: 7px;

            font-size: 9px;

            font-weight: bold;

            letter-spacing: 1.3px;

            color: #999;

        }


        .pedido-ficha-dato strong {

            display: block;

            font-size: 14px;

            line-height: 1.4;

            font-weight: 500;

            color: #333;

            word-break: break-word;

        }


        /* =================================================
           MEDIDAS
           ================================================= */

        .pedido-ficha-subseccion {

            display: flex;

            flex-direction: column;

            gap: 8px;

            margin-top: 24px;

            padding: 18px;

            background: #f7f7f7;

            border-radius: 10px;

        }


        .pedido-ficha-subseccion span {

            font-size: 9px;

            font-weight: bold;

            letter-spacing: 1.3px;

            color: #999;

        }


        .pedido-ficha-subseccion strong {

            font-size: 13px;

            line-height: 1.5;

            font-weight: 500;

            color: #444;

        }


        /* =================================================
           VALORES
           ================================================= */

        .pedido-ficha-seccion:nth-of-type(4)
        .pedido-ficha-grid {

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

        }


        .pedido-ficha-seccion:nth-of-type(4)
        .pedido-ficha-dato {

            padding: 18px;

            background: #f7f7f7;

            border-radius: 10px;

        }


        .pedido-ficha-seccion:nth-of-type(4)
        .pedido-ficha-dato strong {

            font-size: 17px;

            font-weight: 600;

            color: #222;

        }


        /* =================================================
           OBSERVACIONES
           ================================================= */

        .pedido-ficha-observaciones {

            padding: 18px;

            background: #f7f7f7;

            border-radius: 10px;

            font-size: 13px;

            line-height: 1.6;

            color: #555;

            white-space: pre-wrap;

        }


        /* =================================================
           BOTONES
           ================================================= */

        .pedido-ficha-botones {

            display: flex;

            justify-content: flex-end;

            gap: 12px;

            margin-top: 34px;

            padding-top: 24px;

            border-top:
                1px solid #e5e5e5;

        }


        .pedido-ficha-botones button {

            height: 46px;

            padding:
                0 24px;

            border-radius: 9px;

            font-size: 10px;

            font-weight: bold;

            letter-spacing: 1px;

            cursor: pointer;

        }


        /* =================================================
           CERRAR
           ================================================= */

        .btn-pedido-ficha-cerrar {

            border:
                1px solid #d8d8d8;

            background: #fff;

            color: #333;

        }


        .btn-pedido-ficha-cerrar:hover {

            background: #f5f5f5;

        }


        /* =================================================
           NUEVO PEDIDO
           ================================================= */

        .btn-pedido-ficha-nuevo {

            border:
                1px solid #1d1a1a;

            background: #1d1a1a;

            color: #fff;

        }


        .btn-pedido-ficha-nuevo:hover {

            background: #333;

        }


        /* =================================================
           TABLET
           ================================================= */

        @media (max-width: 800px) {

            .pedido-ficha-modal {

                padding: 12px;

            }


            .pedido-ficha-contenido {

                max-height: 94vh;

                padding:
                    32px 28px;

            }


            .pedido-ficha-grid {

                grid-template-columns:
                    repeat(2, minmax(0, 1fr));

                column-gap: 20px;

            }


            .pedido-ficha-seccion:nth-of-type(4)
            .pedido-ficha-grid {

                grid-template-columns:
                    repeat(2, minmax(0, 1fr));

            }

        }


        /* =================================================
           CELULAR
           ================================================= */

        @media (max-width: 600px) {

            .pedido-ficha-contenido {

                padding:
                    28px 20px;

                border-radius: 12px;

            }


            .pedido-ficha-header h2 {

                font-size: 24px;

            }


            .pedido-ficha-grid {

                grid-template-columns: 1fr;

                row-gap: 20px;

            }


            .pedido-ficha-seccion:nth-of-type(4)
            .pedido-ficha-grid {

                grid-template-columns: 1fr;

            }


            .pedido-ficha-botones {

                flex-direction: column;

            }


            .pedido-ficha-botones button {

                width: 100%;

            }

        }

    `;


    document.head.appendChild(style);

}

/* =========================================================
   INICIAR PEDIDOS
   ========================================================= */

async function iniciarPedidos() {
    const container = document.getElementById("pedidos-container");

    if (!container) {
        return;
    }

    if (!empresaActual) {
        container.innerHTML = "<p>No hay una empresa seleccionada.</p>";
        return;
    }

    container.innerHTML = `
        <div class="pedidos-toolbar">
            <div class="pedidos-buscador">
                <span>⌕</span>
                <input
                    type="search"
                    id="buscar-pedidos"
                    placeholder="Buscar por cliente, teléfono, Instagram, modelo o código..."
                    autocomplete="off"
                >
            </div>
            <button
                type="button"
                class="btn-nuevo-pedido"
                id="btn-nuevo-pedido"
            >
                + NUEVO PEDIDO
            </button>
        </div>

        <div class="pedidos-filtros">
            <button type="button" class="pedido-filtro activo" data-estado="">TODOS</button>
            <button type="button" class="pedido-filtro" data-estado="Consulta">CONSULTA</button>
            <button type="button" class="pedido-filtro" data-estado="Confirmado">CONFIRMADO</button>
            <button type="button" class="pedido-filtro" data-estado="En producción">EN PRODUCCIÓN</button>
            <button type="button" class="pedido-filtro" data-estado="Terminado">TERMINADO</button>
            <button type="button" class="pedido-filtro" data-estado="Entregado">ENTREGADO</button>
            <button type="button" class="pedido-filtro" data-estado="Cancelado">CANCELADO</button>
        </div>

        <div id="pedidos-lista">
            <p>Cargando pedidos...</p>
        </div>
    `;

    try {
        const pedidos = await llamarAPI(
            "pedidos",
            empresaActual.empresa_id
        );

        const pedidosEmpresa = filtrarPorEmpresa(pedidos);

        const lista = document.getElementById("pedidos-lista");
        const buscador = document.getElementById("buscar-pedidos");
        const filtros = document.querySelectorAll(".pedido-filtro");

        if (!lista) {
            return;
        }

        let estadoActual = "";

        function mostrarListaPedidos(pedidosMostrados) {
            if (!pedidosMostrados.length) {
                lista.innerHTML = `
                    <div class="pedidos-vacio">
                        <h3>No se encontraron pedidos</h3>
                        <p>Probá con otro cliente, teléfono, modelo, código o estado.</p>
                    </div>
                `;
                return;
            }

            lista.innerHTML = `
                <div class="pedidos-lista">
                    ${pedidosMostrados.map(pedido => `
                        <article class="pedido-fila">
                            <div class="pedido-principal">
                                <span>PEDIDO #${escaparHTML(pedido.id_pedido || "-")}</span>
                                <h3>
                                    ${escaparHTML(
                                        pedido.cliente_nombre ||
                                        "Cliente sin nombre"
                                    )}
                                </h3>
                            </div>

                            <div class="pedido-dato">
                                <span>FECHA</span>
                                <p>
                                    ${escaparHTML(
                                            pedido.fecha
                                                ? formatearFecha(pedido.fecha)
                                                : "-"
                                        )}
                                </p>
                            </div>

                            <div class="pedido-dato">
                                <span>MODELO</span>
                                <p>
                                    ${escaparHTML(pedido.modelo || "-")}
                                </p>
                            </div>

                            <div class="pedido-dato">
                                <span>CÓDIGO</span>
                                <p>
                                    ${escaparHTML(pedido.codigo || "-")}
                                </p>
                            </div>

                            <div class="pedido-dato">
                                <span>ESTADO</span>
                                <p class="pedido-estado">
                                    ${escaparHTML(pedido.estado || "-")}
                                </p>
                            </div>

                            <div class="pedido-dato pedido-dinero">
                                <span>TOTAL</span>
                                <p>
                                    $${escaparHTML(pedido.precio || "0")}
                                </p>
                            </div>

                                <div class="pedido-acciones">

                                    <button
                                        type="button"
                                        class="btn-ver-pedido"
                                        data-pedido-id="${escaparHTML(pedido.id_pedido)}"
                                    >
                                        VER
                                    </button>

                                    <button
                                        type="button"
                                        class="btn-editar-pedido"
                                        data-pedido-id="${escaparHTML(pedido.id_pedido)}"
                                    >
                                        EDITAR
                                    </button>

                                </div>                            
                        </article>
                    `).join("")}
                </div>
            `;

            lista.querySelectorAll(".btn-ver-pedido").forEach(boton => {
                boton.addEventListener("click", function() {
                    const pedidoId = this.dataset.pedidoId;
                    mostrarFichaPedido(pedidoId, pedidosEmpresa);
                });
            });

            lista.querySelectorAll(".btn-editar-pedido").forEach(boton => {
                boton.addEventListener("click", function() {

                    const pedidoId =
                        this.dataset.pedidoId;

                    const pedido =
                        pedidosEmpresa.find(
                            item =>
                                String(item.id_pedido) ===
                                String(pedidoId)
                        );

                    if (!pedido) {
                        alert("No se encontró el pedido.");
                        return;
                    }

                    editarPedido(
                        pedido,
                        pedidosEmpresa
                    );

                });
            });

        }

        function aplicarFiltros() {
            const texto = buscador
                ? buscador.value.trim().toLowerCase()
                : "";

            const filtrados = pedidosEmpresa.filter(pedido => {
                const cliente = String(pedido.cliente_nombre || "").toLowerCase();
                const telefono = String(pedido.telefono || "").toLowerCase();
                const instagram = String(pedido.instagram || "").toLowerCase();
                const modelo = String(pedido.modelo || "").toLowerCase();
                const codigo = String(pedido.codigo || "").toLowerCase();
                const estado = String(pedido.estado || "").toLowerCase();

                const coincideTexto =
                    !texto ||
                    cliente.includes(texto) ||
                    telefono.includes(texto) ||
                    instagram.includes(texto) ||
                    modelo.includes(texto) ||
                    codigo.includes(texto);

                const coincideEstado =
                    !estadoActual ||
                    estado === estadoActual.toLowerCase();

                return coincideTexto && coincideEstado;
            });

            mostrarListaPedidos(filtrados);
        }

        mostrarListaPedidos(pedidosEmpresa);

        if (buscador) {
            buscador.addEventListener("input", aplicarFiltros);
        }

        filtros.forEach(filtro => {
            filtro.addEventListener("click", function() {
                filtros.forEach(item => {
                    item.classList.remove("activo");
                });

                this.classList.add("activo");
                estadoActual = this.dataset.estado || "";
                aplicarFiltros();
            });
        });

        const botonNuevo = document.getElementById("btn-nuevo-pedido");

        if (botonNuevo) {
            botonNuevo.addEventListener("click", function() {
                mostrarNuevoPedido();
            });
        }

    } catch (error) {
        console.error("Error cargando pedidos:", error);

        container.innerHTML = `
            <div class="pedidos-error">
                <p>No se pudieron cargar los pedidos.</p>
            </div>
        `;
    }
}

/* =========================================================
   INICIAR MATERIALES
   ========================================================= */

async function iniciarMateriales() {

    const container =
        document.getElementById(
            "materiales-container"
        );


    if (!container) {
        return;
    }


    if (!empresaActual) {

        container.innerHTML =
            "<p>No hay una empresa seleccionada.</p>";

        return;

    }


    container.innerHTML = `

        <div class="materiales-toolbar">

            <div class="materiales-buscador">

                <span>⌕</span>

                <input
                    type="search"
                    id="buscar-materiales"
                    placeholder="Buscar por material o proveedor..."
                    autocomplete="off"
                >

            </div>


            <button
                type="button"
                class="btn-nuevo-material"
                id="btn-nuevo-material"
            >
                + NUEVO MATERIAL
            </button>

        </div>


        <div id="materiales-lista">

            <p>
                Cargando materiales...
            </p>

        </div>

    `;


    try {

        /* =====================================================
           CARGAR MATERIALES
           ===================================================== */

        const materiales =
            await llamarAPI(
                "materiales",
                empresaActual.empresa_id
            );


        /* =====================================================
           FILTRAR POR EMPRESA
           ===================================================== */

        const materialesEmpresa =
            filtrarPorEmpresa(
                materiales
            );


        const lista =
            document.getElementById(
                "materiales-lista"
            );


        const buscador =
            document.getElementById(
                "buscar-materiales"
            );


        if (!lista) {
            return;
        }


        /* =====================================================
           MOSTRAR LISTA
           ===================================================== */

        function mostrarListaMateriales(
            materialesMostrados
        ) {

            if (
                !materialesMostrados.length
            ) {

                lista.innerHTML = `

                    <div class="materiales-vacio">

                        <h3>
                            No se encontraron materiales
                        </h3>

                        <p>
                            Probá con otro material o proveedor.
                        </p>

                    </div>

                `;

                return;

            }


            lista.innerHTML = `

                <div class="materiales-lista">

                    ${materialesMostrados
                        .map(
                            material => {

                                const stockActual =
                                    Number(
                                        material.stock_actual || 0
                                    );


                                const stockMinimo =
                                    Number(
                                        material.stock_minimo || 0
                                    );


                                let estadoStock =
                                    "stock-normal";


                                let textoStock =
                                    "STOCK OK";


                                if (
                                    stockActual <= 0
                                ) {

                                    estadoStock =
                                        "stock-sin-stock";

                                    textoStock =
                                        "SIN STOCK";

                                }

                                else if (
                                    stockActual <=
                                    stockMinimo
                                ) {

                                    estadoStock =
                                        "stock-bajo";

                                    textoStock =
                                        "STOCK BAJO";

                                }


                                return `

                                    <article
                                        class="material-fila"
                                    >

                                        <div
                                            class="material-principal"
                                        >

                                            <span>
                                                MATERIAL
                                            </span>

                                            <h3>
                                                ${escaparHTML(
                                                    material.nombre || "-"
                                                )}
                                            </h3>

                                        </div>


                                        <div
                                            class="material-dato"
                                        >

                                            <span>
                                                UNIDAD
                                            </span>

                                            <p>
                                                ${escaparHTML(
                                                    material.unidad_compra || "-"
                                                )}
                                            </p>

                                        </div>


                                        <div
                                            class="material-dato"
                                        >

                                            <span>
                                                COSTO UNITARIO
                                            </span>

                                            <p>
                                                $${escaparHTML(
                                                    material.costo_unitario || "0"
                                                )}
                                            </p>

                                        </div>


                                        <div
                                            class="material-dato"
                                        >

                                            <span>
                                                PROVEEDOR
                                            </span>

                                            <p>
                                                ${escaparHTML(
                                                    material.proveedor || "-"
                                                )}
                                            </p>

                                        </div>


                                        <div
                                            class="material-dato material-stock"
                                        >

                                            <span>
                                                STOCK
                                            </span>

                                            <p>
                                                ${escaparHTML(
                                                    material.stock_actual || "0"
                                                )}
                                                ${escaparHTML(
                                                    material.unidad_compra || ""
                                                )}
                                            </p>

                                            <small
                                                class="${estadoStock}"
                                            >
                                                ${textoStock}
                                            </small>

                                        </div>


                                        <div
                                            class="material-dato"
                                        >

                                            <span>
                                                MÍNIMO
                                            </span>

                                            <p>
                                                ${escaparHTML(
                                                    material.stock_minimo || "0"
                                                )}
                                            </p>

                                        </div>


                                        <div
                                            class="material-acciones"
                                        >

                                            <button
                                                type="button"
                                                class="btn-ver-material"
                                                data-material-id="${escaparHTML(
                                                    material.material_id
                                                )}"
                                            >
                                                VER
                                            </button>


                                            <button
                                                type="button"
                                                class="btn-editar-material"
                                                data-material-id="${escaparHTML(
                                                    material.material_id
                                                )}"
                                            >
                                                EDITAR
                                            </button>

                                        </div>

                                    </article>

                                `;

                            }
                        )
                        .join("")
                    }

                </div>

            `;


            /* =================================================
               BOTÓN VER
               ================================================= */

            lista
                .querySelectorAll(
                    ".btn-ver-material"
                )
                .forEach(
                    boton => {

                        boton.addEventListener(
                            "click",
                            function() {

                                const materialId =
                                    this.dataset.materialId;


                                const material =
                                    materialesEmpresa.find(
                                        item =>
                                            String(
                                                item.material_id
                                            ) ===
                                            String(
                                                materialId
                                            )
                                    );


                                if (!material) {

                                    alert(
                                        "No se encontró el material."
                                    );

                                    return;

                                }


                                if (
                                    typeof mostrarFichaMaterial ===
                                    "function"
                                ) {

                                    mostrarFichaMaterial(
                                        materialId,
                                        materialesEmpresa
                                    );

                                }

                            }
                        );

                    }
                );


            /* =================================================
               BOTÓN EDITAR
               ================================================= */

            lista
                .querySelectorAll(
                    ".btn-editar-material"
                )
                .forEach(
                    boton => {

                        boton.addEventListener(
                            "click",
                            function() {

                                const materialId =
                                    this.dataset.materialId;


                                const material =
                                    materialesEmpresa.find(
                                        item =>
                                            String(
                                                item.material_id
                                            ) ===
                                            String(
                                                materialId
                                            )
                                    );


                                if (!material) {

                                    alert(
                                        "No se encontró el material."
                                    );

                                    return;

                                }


                                if (
                                    typeof editarMaterial ===
                                    "function"
                                ) {

                                    editarMaterial(
                                        material,
                                        materialesEmpresa
                                    );

                                }

                            }
                        );

                    }
                );

        }


        /* =====================================================
           BUSCADOR
           ===================================================== */

        function aplicarFiltroMateriales() {

            const texto =
                buscador
                    ? buscador.value
                        .trim()
                        .toLowerCase()
                    : "";


            const filtrados =
                materialesEmpresa.filter(
                    material => {

                        const nombre =
                            String(
                                material.nombre || ""
                            )
                            .toLowerCase();


                        const proveedor =
                            String(
                                material.proveedor || ""
                            )
                            .toLowerCase();


                        const unidad =
                            String(
                                material.unidad_compra || ""
                            )
                            .toLowerCase();


                        return (
                            !texto ||
                            nombre.includes(texto) ||
                            proveedor.includes(texto) ||
                            unidad.includes(texto)
                        );

                    }
                );


            mostrarListaMateriales(
                filtrados
            );

        }


        /* =====================================================
           MOSTRAR LISTA INICIAL
           ===================================================== */

        mostrarListaMateriales(
            materialesEmpresa
        );


        /* =====================================================
           ACTIVAR BUSCADOR
           ===================================================== */

        if (buscador) {

            buscador.addEventListener(
                "input",
                aplicarFiltroMateriales
            );

        }


        /* =====================================================
           NUEVO MATERIAL
           ===================================================== */

        const botonNuevo =
            document.getElementById(
                "btn-nuevo-material"
            );


        if (botonNuevo) {

            botonNuevo.addEventListener(
                "click",
                async function(event) {

                    event.preventDefault();


                    console.log(
                        "CLICK EN NUEVO MATERIAL"
                    );


                    console.log(
                        "mostrarNuevoMaterial:",
                        typeof mostrarNuevoMaterial
                    );


                    try {

                        await mostrarNuevoMaterial();

                    } catch (error) {

                        console.error(
                            "ERROR ABRIENDO NUEVO MATERIAL:",
                            error
                        );


                        alert(
                            "Error al abrir Nuevo Material:\n\n" +
                            error.message
                        );

                    }

                }
            );

        }

    } catch (error) {

        console.error(
            "Error cargando materiales:",
            error
        );


        container.innerHTML = `

            <div class="materiales-error">

                <p>
                    No se pudieron cargar los materiales.
                </p>

            </div>

        `;

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

function abrirNuevoCliente(alGuardar = null) {
    if (!empresaActual) {
        alert("No hay una empresa seleccionada.");
        return;
    }
    const modal = document.createElement("div");
    modal.className = "cliente-nuevo-modal";
    modal.innerHTML = `
        <div class="cliente-nuevo-overlay"></div>
        <div class="cliente-nuevo-contenido">
            <button type="button" class="cliente-nuevo-cerrar">×</button>
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
                        <input type="text" name="nombre" required>
                    </div>
                    <div class="cliente-campo">
                        <label>APELLIDO</label>
                        <input type="text" name="apellido" required>
                    </div>
                    <div class="cliente-campo">
                        <label>TELÉFONO</label>
                        <input type="tel" name="telefono">
                    </div>
                    <div class="cliente-campo">
                        <label>INSTAGRAM</label>
                        <input type="text" name="instagram" placeholder="@usuario">
                    </div>
                    <div class="cliente-campo">
                        <label>EMAIL</label>
                        <input type="email" name="email">
                    </div>
                    <div class="cliente-campo">
                        <label>DIRECCIÓN</label>
                        <input type="text" name="direccion">
                    </div>
                    <div class="cliente-campo">
                        <label>LOCALIDAD</label>
                        <input type="text" name="localidad">
                    </div>
                    <div class="cliente-campo">
                        <label>PROVINCIA</label>
                        <input type="text" name="provincia">
                    </div>
                    <div class="cliente-separador">
                        <span>MEDIDAS</span>
                    </div>
                    <div class="cliente-campo">
                        <label>CUELLO</label>
                        <input type="number" name="medidas_cuello" min="0" step="0.1" placeholder="cm">
                    </div>
                    <div class="cliente-campo">
                        <label>BUSTO</label>
                        <input type="number" name="medidas_busto" min="0" step="0.1" placeholder="cm">
                    </div>
                    <div class="cliente-campo">
                        <label>CINTURA</label>
                        <input type="number" name="medidas_cintura" min="0" step="0.1" placeholder="cm">
                    </div>
                    <div class="cliente-campo">
                        <label>ALTO</label>
                        <input type="number" name="medidas_alto" min="0" step="0.1" placeholder="cm">
                    </div>
                    <div class="cliente-campo cliente-campo-completo">
                        <label>OBSERVACIONES</label>
                        <textarea name="observaciones" rows="4" placeholder="Notas importantes sobre el cliente..."></textarea>
                    </div>
                </div>
                <div class="cliente-nuevo-mensaje" id="nuevo-cliente-mensaje"></div>
                <div class="cliente-nuevo-botones">
                    <button type="button" class="btn-cancelar-cliente">CANCELAR</button>
                    <button type="submit" class="btn-guardar-cliente">CREAR CLIENTE</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    agregarEstilosNuevoCliente();
    const formulario = modal.querySelector("#form-nuevo-cliente");
    const cerrarModal = () => modal.remove();
    modal.querySelector(".cliente-nuevo-cerrar").addEventListener("click", cerrarModal);
    modal.querySelector(".cliente-nuevo-overlay").addEventListener("click", cerrarModal);
    modal.querySelector(".btn-cancelar-cliente").addEventListener("click", cerrarModal);
    formulario.addEventListener("submit", async function(event) {
        event.preventDefault();
        await guardarNuevoCliente(
            formulario,
            modal,
            alGuardar
        );
    });
}

/* =========================================================
   EDITAR CLIENTE
   ========================================================= */

function editarCliente(id, clientes) {
    const cliente = clientes.find(
        item => String(item.cliente_id) === String(id)
    );

    if (!cliente) {
        alert("No se encontró el cliente.");
        return;
    }

    const modal = document.createElement("div");
    modal.className = "cliente-nuevo-modal";

    modal.innerHTML = `
        <div class="cliente-nuevo-overlay"></div>
        <div class="cliente-nuevo-contenido">
            <button type="button" class="cliente-nuevo-cerrar">×</button>

            <div class="cliente-nuevo-header">
                <span>EDITAR CLIENTE</span>
                <h2>${escaparHTML(
                    `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim()
                )}</h2>
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

            <form id="form-editar-cliente">
                <div class="cliente-form-grid">

                    <div class="cliente-campo">
                        <label>NOMBRE</label>
                        <input type="text" name="nombre" value="${escaparHTML(cliente.nombre || "")}" required>
                    </div>

                    <div class="cliente-campo">
                        <label>APELLIDO</label>
                        <input type="text" name="apellido" value="${escaparHTML(cliente.apellido || "")}" required>
                    </div>

                    <div class="cliente-campo">
                        <label>TELÉFONO</label>
                        <input type="tel" name="telefono" value="${escaparHTML(cliente.telefono || "")}">
                    </div>

                    <div class="cliente-campo">
                        <label>INSTAGRAM</label>
                        <input type="text" name="instagram" value="${escaparHTML(cliente.instagram || "")}" placeholder="@usuario">
                    </div>

                    <div class="cliente-campo">
                        <label>EMAIL</label>
                        <input type="email" name="email" value="${escaparHTML(cliente.email || "")}">
                    </div>

                    <div class="cliente-campo">
                        <label>DIRECCIÓN</label>
                        <input type="text" name="direccion" value="${escaparHTML(cliente.direccion || "")}">
                    </div>

                    <div class="cliente-campo">
                        <label>LOCALIDAD</label>
                        <input type="text" name="localidad" value="${escaparHTML(cliente.localidad || "")}">
                    </div>

                    <div class="cliente-campo">
                        <label>PROVINCIA</label>
                        <input type="text" name="provincia" value="${escaparHTML(cliente.provincia || "")}">
                    </div>

                    <div class="cliente-separador">
                        <span>MEDIDAS</span>
                    </div>

                    <div class="cliente-campo">
                        <label>CUELLO</label>
                        <input type="number" name="medidas_cuello" min="0" step="0.1" value="${escaparHTML(cliente.medidas_cuello ?? "")}" placeholder="cm">
                    </div>

                    <div class="cliente-campo">
                        <label>BUSTO</label>
                        <input type="number" name="medidas_busto" min="0" step="0.1" value="${escaparHTML(cliente.medidas_busto ?? "")}" placeholder="cm">
                    </div>

                    <div class="cliente-campo">
                        <label>CINTURA</label>
                        <input type="number" name="medidas_cintura" min="0" step="0.1" value="${escaparHTML(cliente.medidas_cintura ?? "")}" placeholder="cm">
                    </div>

                    <div class="cliente-campo">
                        <label>ALTO</label>
                        <input type="number" name="medidas_alto" min="0" step="0.1" value="${escaparHTML(cliente.medidas_alto ?? "")}" placeholder="cm">
                    </div>

                    <div class="cliente-campo cliente-campo-completo">
                        <label>OBSERVACIONES</label>
                        <textarea name="observaciones" rows="4" placeholder="Notas importantes sobre el cliente...">${escaparHTML(cliente.observaciones || "")}</textarea>
                    </div>

                </div>

                <div class="cliente-nuevo-mensaje" id="editar-cliente-mensaje"></div>

                <div class="cliente-nuevo-botones">
                    <button type="button" class="btn-cancelar-cliente">
                        CANCELAR
                    </button>
                    <button type="submit" class="btn-guardar-cliente">
                        GUARDAR CAMBIOS
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    agregarEstilosNuevoCliente();

    const formulario = modal.querySelector("#form-editar-cliente");
    const cerrarModal = () => modal.remove();

    modal.querySelector(".cliente-nuevo-cerrar")
        .addEventListener("click", cerrarModal);

    modal.querySelector(".cliente-nuevo-overlay")
        .addEventListener("click", cerrarModal);

    modal.querySelector(".btn-cancelar-cliente")
        .addEventListener("click", cerrarModal);

    formulario.addEventListener("submit", async function(event) {
        event.preventDefault();
        await guardarCambiosCliente(cliente, formulario, modal);
    });
}

/* =========================================================
   GUARDAR CAMBIOS CLIENTE
   ========================================================= */

async function guardarCambiosCliente(cliente, formulario, modal) {
    const boton = formulario.querySelector(".btn-guardar-cliente");
    const mensaje = formulario.querySelector("#editar-cliente-mensaje");
    const formData = new FormData(formulario);

    const nombre = String(formData.get("nombre") || "").trim();
    const apellido = String(formData.get("apellido") || "").trim();

    if (!nombre) {
        alert("Ingresá el nombre del cliente.");
        return;
    }

    if (!apellido) {
        alert("Ingresá el apellido del cliente.");
        return;
    }

    if (!empresaActual) {
        alert("No hay una empresa seleccionada.");
        return;
    }

    const convertirMedida = nombreCampo => {
        const valor = formData.get(nombreCampo);
        return valor === "" ? "" : Number(valor);
    };

    const data = {
        cliente_id: Number(cliente.cliente_id),
        empresa_id: Number(empresaActual.empresa_id),
        nombre: nombre,
        apellido: apellido,
        telefono: String(formData.get("telefono") || "").trim(),
        instagram: String(formData.get("instagram") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        direccion: String(formData.get("direccion") || "").trim(),
        localidad: String(formData.get("localidad") || "").trim(),
        provincia: String(formData.get("provincia") || "").trim(),
        medidas_cuello: convertirMedida("medidas_cuello"),
        medidas_busto: convertirMedida("medidas_busto"),
        medidas_cintura: convertirMedida("medidas_cintura"),
        medidas_alto: convertirMedida("medidas_alto"),
        observaciones: String(formData.get("observaciones") || "").trim()
    };

    boton.disabled = true;
    boton.textContent = "GUARDANDO...";
    mensaje.textContent = "Guardando cambios...";
    mensaje.className = "cliente-nuevo-mensaje";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "update",
                resource: "clientes",
                id: cliente.cliente_id,
                data: data
            })
        });

        const resultado = await response.json();

        if (!resultado.success) {
            throw new Error(
                resultado.error ||
                "No se pudieron guardar los cambios."
            );
        }

        mensaje.textContent = "Cliente actualizado correctamente.";
        mensaje.className = "cliente-nuevo-mensaje exito";

        setTimeout(async function() {
            modal.remove();

            try {
                await iniciarClientes();
            } catch (error) {
                console.error("Error actualizando clientes:", error);
            }
        }, 700);

    } catch (error) {
        console.error("Error editando cliente:", error);

        mensaje.textContent = "No se pudieron guardar los cambios.";
        mensaje.className = "cliente-nuevo-mensaje error";

        boton.disabled = false;
        boton.textContent = "GUARDAR CAMBIOS";

        alert(
            "No se pudieron guardar los cambios.\n\n" +
            error.message
        );
    }
}

/* =========================================================
   GUARDAR NUEVO CLIENTE
   ========================================================= */

async function guardarNuevoCliente(
    formulario,
    modal,
    alGuardar = null
) {
    const boton =
        formulario.querySelector(
            ".btn-guardar-cliente"
        );

    const mensaje =
        formulario.querySelector(
            "#nuevo-cliente-mensaje"
        );

    const formData =
        new FormData(formulario);

    const nombre =
        String(
            formData.get("nombre") || ""
        ).trim();

    const apellido =
        String(
            formData.get("apellido") || ""
        ).trim();

    if (!nombre) {
        alert("Ingresá el nombre.");
        return;
    }

    if (!apellido) {
        alert("Ingresá el apellido.");
        return;
    }

    if (!empresaActual) {
        alert("No hay una empresa seleccionada.");
        return;
    }

    const data = {
        empresa_id:
            Number(
                empresaActual.empresa_id
            ),

        nombre,

        apellido,

        telefono:
            String(
                formData.get("telefono") || ""
            ).trim(),

        instagram:
            String(
                formData.get("instagram") || ""
            ).trim(),

        email:
            String(
                formData.get("email") || ""
            ).trim(),

        direccion:
            String(
                formData.get("direccion") || ""
            ).trim(),

        localidad:
            String(
                formData.get("localidad") || ""
            ).trim(),

        provincia:
            String(
                formData.get("provincia") || ""
            ).trim(),

        medidas_cuello:
            formData.get("medidas_cuello") === ""
                ? ""
                : Number(
                    formData.get(
                        "medidas_cuello"
                    )
                ),

        medidas_busto:
            formData.get("medidas_busto") === ""
                ? ""
                : Number(
                    formData.get(
                        "medidas_busto"
                    )
                ),

        medidas_cintura:
            formData.get("medidas_cintura") === ""
                ? ""
                : Number(
                    formData.get(
                        "medidas_cintura"
                    )
                ),

        medidas_alto:
            formData.get("medidas_alto") === ""
                ? ""
                : Number(
                    formData.get(
                        "medidas_alto"
                    )
                ),

        observaciones:
            String(
                formData.get(
                    "observaciones"
                ) || ""
            ).trim()
    };

    boton.disabled = true;

    boton.textContent =
        "CREANDO...";

    mensaje.textContent =
        "Guardando cliente...";

    mensaje.className =
        "cliente-nuevo-mensaje";

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
                                "clientes",

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
                "No se pudo crear el cliente."
            );

        }

        mensaje.textContent =
            "Cliente creado correctamente.";

        mensaje.className =
            "cliente-nuevo-mensaje exito";

        setTimeout(
            async function() {

                modal.remove();

                /*
                 * Si el cliente fue creado
                 * desde NUEVO PEDIDO,
                 * volvemos al pedido.
                 */

                if (
                    typeof alGuardar ===
                    "function"
                ) {

                    try {

                        await alGuardar(
                            resultado.data ||
                            data
                        );

                    } catch (error) {

                        console.error(
                            "Error continuando después de crear cliente:",
                            error
                        );

                    }

                    return;

                }

                /*
                 * Comportamiento normal
                 * desde el módulo CLIENTES.
                 */

                try {

                    await iniciarClientes();

                    await iniciarDashboard();

                } catch (error) {

                    console.error(
                        "Error actualizando cliente y Dashboard:",
                        error
                    );

                }

            },
            700
        );

    } catch (error) {

        console.error(
            "Error creando cliente:",
            error
        );

        mensaje.textContent =
            "No se pudo crear el cliente.";

        mensaje.className =
            "cliente-nuevo-mensaje error";

        boton.disabled =
            false;

        boton.textContent =
            "CREAR CLIENTE";

        alert(
            "No se pudo crear el cliente.\n\n" +
            error.message
        );

    }
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

    const nombreCompleto =
        `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim();

    const modal = document.createElement("div");
    modal.className = "cliente-ficha-modal";

    modal.innerHTML = `
        <div class="cliente-ficha-overlay"></div>

        <div class="cliente-ficha-contenido">

            <button
                type="button"
                class="cliente-ficha-cerrar"
            >
                ×
            </button>

            <div class="cliente-ficha-header">
                <span>CLIENTE</span>
                <h2>${escaparHTML(nombreCompleto)}</h2>
                <p>Ficha del cliente</p>
            </div>

            <div class="cliente-ficha-seccion">
                <div class="cliente-ficha-seccion-titulo">
                    DATOS DE CONTACTO
                </div>

                <div class="cliente-ficha-grid">

                    <div class="cliente-ficha-dato">
                        <span>TELÉFONO</span>
                        <strong>${escaparHTML(cliente.telefono || "-")}</strong>
                    </div>

                    <div class="cliente-ficha-dato">
                        <span>INSTAGRAM</span>
                        <strong>${escaparHTML(cliente.instagram || "-")}</strong>
                    </div>

                    <div class="cliente-ficha-dato">
                        <span>EMAIL</span>
                        <strong>${escaparHTML(cliente.email || "-")}</strong>
                    </div>

                    <div class="cliente-ficha-dato">
                        <span>DIRECCIÓN</span>
                        <strong>${escaparHTML(cliente.direccion || "-")}</strong>
                    </div>

                    <div class="cliente-ficha-dato">
                        <span>LOCALIDAD</span>
                        <strong>${escaparHTML(cliente.localidad || "-")}</strong>
                    </div>

                    <div class="cliente-ficha-dato">
                        <span>PROVINCIA</span>
                        <strong>${escaparHTML(cliente.provincia || "-")}</strong>
                    </div>

                </div>
            </div>

            <div class="cliente-ficha-seccion">
                <div class="cliente-ficha-seccion-titulo">
                    MEDIDAS
                </div>

                <div class="cliente-ficha-medidas">

                    <div class="cliente-ficha-medida">
                        <span>CUELLO</span>
                        <strong>
                            ${escaparHTML(cliente.medidas_cuello || "-")}
                            ${cliente.medidas_cuello ? " cm" : ""}
                        </strong>
                    </div>

                    <div class="cliente-ficha-medida">
                        <span>BUSTO</span>
                        <strong>
                            ${escaparHTML(cliente.medidas_busto || "-")}
                            ${cliente.medidas_busto ? " cm" : ""}
                        </strong>
                    </div>

                    <div class="cliente-ficha-medida">
                        <span>CINTURA</span>
                        <strong>
                            ${escaparHTML(cliente.medidas_cintura || "-")}
                            ${cliente.medidas_cintura ? " cm" : ""}
                        </strong>
                    </div>

                    <div class="cliente-ficha-medida">
                        <span>ALTO</span>
                        <strong>
                            ${escaparHTML(cliente.medidas_alto || "-")}
                            ${cliente.medidas_alto ? " cm" : ""}
                        </strong>
                    </div>

                </div>
            </div>

            <div class="cliente-ficha-seccion">
                <div class="cliente-ficha-seccion-titulo">
                    OBSERVACIONES
                </div>

                <div class="cliente-ficha-observaciones">
                    ${escaparHTML(
                        cliente.observaciones ||
                        "Sin observaciones."
                    )}
                </div>
            </div>

            <div class="cliente-ficha-botones">

                <button
                    type="button"
                    class="btn-ficha-cerrar"
                >
                    CERRAR
                </button>

                <button
                    type="button"
                    class="btn-ficha-editar"
                >
                    EDITAR CLIENTE
                </button>

                <button
                    type="button"
                    class="btn-ficha-nuevo-pedido"
                    data-cliente-id="${escaparHTML(cliente.cliente_id)}"
                >
                    NUEVO PEDIDO
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);
    agregarEstilosFichaCliente();

    const cerrarModal = () => modal.remove();

    modal
        .querySelector(".cliente-ficha-cerrar")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".cliente-ficha-overlay")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".btn-ficha-cerrar")
        .addEventListener("click", cerrarModal);

    modal
        .querySelector(".btn-ficha-editar")
        .addEventListener("click", function() {
            modal.remove();
            editarCliente(cliente.cliente_id, clientes);
        });

    modal
        .querySelector(".btn-ficha-nuevo-pedido")
        .addEventListener("click", function() {
            alert(
                "La carga de pedidos la hacemos en el siguiente paso."
            );
        });
}

/* =========================================================
   MOSTRAR VISTA MATERIALES
   ========================================================= */

async function mostrarVistaMateriales() {

    const dashboard =
        document.getElementById(
            "dashboard-view"
        );

    const materialesView =
        document.getElementById(
            "materiales-view"
        );


    /*
     * Cambiamos la vista actual.
     */

    vistaActual =
        "materiales";


    /*
     * OCULTAR DASHBOARD
     */

    if (dashboard) {

        dashboard.style.display =
            "none";

        dashboard.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    /*
     * MOSTRAR MATERIALES
     */

    if (materialesView) {

        materialesView.style.display =
            "";

        materialesView.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    /*
     * CARGAR MATERIALES
     */

    if (
        typeof iniciarMateriales ===
        "function"
    ) {

        await iniciarMateriales();

    }

}

/* =========================================================
   NUEVO MATERIAL
   ========================================================= */

async function mostrarNuevoMaterial() {

    if (!empresaActual) {

        alert(
            "No hay una empresa seleccionada."
        );

        return;

    }


    cerrarModalesAbiertos();


    const modal =
        document.createElement("div");


    modal.className =
        "material-nuevo-modal";


    modal.innerHTML = `

        <div class="material-nuevo-overlay"></div>


        <div class="material-nuevo-contenido">

            <button
                type="button"
                class="material-nuevo-cerrar"
            >
                ×
            </button>


            <div class="material-nuevo-header">

                <span>
                    MATERIALES
                </span>

                <h2>
                    Nuevo material
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


            <form id="form-nuevo-material">


                <!-- =================================================
                     INFORMACIÓN DEL MATERIAL
                ================================================== -->

                <div class="material-seccion">

                    <div class="material-seccion-titulo">
                        INFORMACIÓN DEL MATERIAL
                    </div>


                    <div class="material-campo">

                        <label>
                            NOMBRE
                        </label>

                        <input
                            type="text"
                            name="nombre"
                            id="material-nombre"
                            placeholder="Ej: Cuero liso"
                            autocomplete="off"
                            required
                        >

                    </div>


                    <div class="material-grid">

                        <div class="material-campo">

                            <label>
                                UNIDAD DE COMPRA
                            </label>

                            <select
                                name="unidad_compra"
                                id="material-unidad"
                                required
                            >

                                <option value="">
                                    Seleccionar...
                                </option>

                                <option value="METRO">
                                    METRO
                                </option>

                                <option value="GRAMO">
                                    GRAMO
                                </option>

                                <option value="KILOGRAMO">
                                    KILOGRAMO
                                </option>

                                <option value="UNIDAD">
                                    UNIDAD
                                </option>

                                <option value="ROLLO">
                                    ROLLO
                                </option>

                                <option value="PAR">
                                    PAR
                                </option>

                            </select>

                        </div>


                        <div class="material-campo">

                            <label>
                                PROVEEDOR
                            </label>

                            <input
                                type="text"
                                name="proveedor"
                                id="material-proveedor"
                                placeholder="Nombre del proveedor"
                                autocomplete="off"
                            >

                        </div>

                    </div>

                </div>


                <!-- =================================================
                     COSTOS Y STOCK
                ================================================== -->

                <div class="material-seccion">

                    <div class="material-seccion-titulo">
                        COSTOS Y STOCK
                    </div>


                    <div class="material-grid">

                        <div class="material-campo">

                            <label>
                                COSTO UNITARIO PROMEDIO
                            </label>

                            <input
                                type="number"
                                name="costo_unitario"
                                id="material-costo"
                                min="0"
                                step="0.01"
                                placeholder="$ 0"
                            >

                            <small>
                                Podés actualizar este valor cuando cambie el costo de compra.
                            </small>

                        </div>


                        <div class="material-campo">

                            <label>
                                STOCK ACTUAL
                            </label>

                            <input
                                type="number"
                                name="stock_actual"
                                id="material-stock"
                                min="0"
                                step="0.01"
                                placeholder="0"
                            >

                        </div>


                        <div class="material-campo">

                            <label>
                                STOCK MÍNIMO
                            </label>

                            <input
                                type="number"
                                name="stock_minimo"
                                id="material-stock-minimo"
                                min="0"
                                step="0.01"
                                placeholder="0"
                            >

                            <small>
                                Te avisará cuando el stock llegue a este nivel.
                            </small>

                        </div>

                    </div>

                </div>


                <!-- =================================================
                     ESTADO
                ================================================== -->

                <div class="material-seccion">

                    <div class="material-seccion-titulo">
                        ESTADO
                    </div>


                    <div class="material-activo">

                        <label>

                            <input
                                type="checkbox"
                                name="activo"
                                id="material-activo"
                                checked
                            >

                            Material activo

                        </label>

                    </div>

                </div>


                <!-- =================================================
                     MENSAJE
                ================================================== -->

                <div
                    class="material-nuevo-mensaje"
                    id="nuevo-material-mensaje"
                ></div>


                <!-- =================================================
                     BOTONES
                ================================================== -->

                <div class="material-nuevo-botones">

                    <button
                        type="button"
                        class="btn-cancelar-material"
                    >
                        CANCELAR
                    </button>


                    <button
                        type="submit"
                        class="btn-guardar-material"
                    >
                        CREAR MATERIAL
                    </button>

                </div>


            </form>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    /*
     * ELEMENTOS
     */

    const formulario =
        modal.querySelector(
            "#form-nuevo-material"
        );


    const cerrarModal =
        () => modal.remove();


    /*
     * CERRAR
     */

    modal
        .querySelector(
            ".material-nuevo-cerrar"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    modal
        .querySelector(
            ".material-nuevo-overlay"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    modal
        .querySelector(
            ".btn-cancelar-material"
        )
        .addEventListener(
            "click",
            cerrarModal
        );


    /* =========================================================
       GUARDAR MATERIAL
    ========================================================= */

    formulario.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const boton =
                formulario.querySelector(
                    ".btn-guardar-material"
                );


            const mensaje =
                formulario.querySelector(
                    "#nuevo-material-mensaje"
                );


            const formData =
                new FormData(
                    formulario
                );


            const nombre =
                String(
                    formData.get(
                        "nombre"
                    ) || ""
                ).trim();


            const unidadCompra =
                String(
                    formData.get(
                        "unidad_compra"
                    ) || ""
                ).trim();


            const proveedor =
                String(
                    formData.get(
                        "proveedor"
                    ) || ""
                ).trim();


            const costo =
                Number(
                    formData.get(
                        "costo_unitario"
                    ) || 0
                );


            const stockActual =
                Number(
                    formData.get(
                        "stock_actual"
                    ) || 0
                );


            const stockMinimo =
                Number(
                    formData.get(
                        "stock_minimo"
                    ) || 0
                );


            const activo =
                formulario.querySelector(
                    "#material-activo"
                ).checked;


            /*
             * VALIDACIONES
             */

            if (!nombre) {

                alert(
                    "Ingresá el nombre del material."
                );

                return;

            }


            if (!unidadCompra) {

                alert(
                    "Seleccioná la unidad de compra."
                );

                return;

            }


            if (
                costo < 0 ||
                stockActual < 0 ||
                stockMinimo < 0
            ) {

                alert(
                    "El costo y el stock no pueden ser negativos."
                );

                return;

            }


            /*
             * DATOS
             */

            const data = {

                empresa_id:
                    Number(
                        empresaActual.empresa_id
                    ),

                nombre:
                    nombre,

                unidad_compra:
                    unidadCompra,

                costo_unitario:
                    costo,

                proveedor:
                    proveedor,

                stock_actual:
                    stockActual,

                stock_minimo:
                    stockMinimo,

                activo:
                    activo

            };


            boton.disabled =
                true;


            boton.textContent =
                "CREANDO...";


            mensaje.textContent =
                "Guardando material...";


            mensaje.className =
                "material-nuevo-mensaje";


            try {

                const response =
                    await fetch(
                        API_URL,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "text/plain;charset=utf-8"

                            },

                            body:
                                JSON.stringify({

                                    action:
                                        "insert",

                                    resource:
                                        "materiales",

                                    data:
                                        data

                                })

                        }
                    );


                const resultado =
                    await response.json();


                if (
                    !resultado.success
                ) {

                    throw new Error(
                        resultado.error ||
                        "No se pudo crear el material."
                    );

                }


                mensaje.textContent =
                    "Material creado correctamente.";


                mensaje.className =
                    "material-nuevo-mensaje exito";


                /*
                 * CERRAR Y ACTUALIZAR
                 */

                setTimeout(
                    async function() {

                        modal.remove();


                        try {

                            await iniciarMateriales();

                        } catch (error) {

                            console.error(
                                "Error actualizando materiales:",
                                error
                            );

                        }

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "Error creando material:",
                    error
                );


                mensaje.textContent =
                    "No se pudo crear el material.";


                mensaje.className =
                    "material-nuevo-mensaje error";


                boton.disabled =
                    false;


                boton.textContent =
                    "CREAR MATERIAL";


                alert(
                    "No se pudo crear el material.\n\n" +
                    error.message
                );

            }

        }
    );

}

/* =========================================================
   VER MATERIAL
   ========================================================= */

function mostrarFichaMaterial(
    materialId,
    materiales
) {

    const material =
        materiales.find(
            item =>
                String(
                    item.material_id
                ) ===
                String(
                    materialId
                )
        );


    if (!material) {

        alert(
            "No se encontró el material."
        );

        return;

    }


    cerrarModalesAbiertos();


    const modal =
        document.createElement(
            "div"
        );


    modal.className =
        "material-ver-modal";


    const activo =
        material.activo === true ||
        String(
            material.activo
        ).toUpperCase() === "TRUE";


    const stockActual =
        Number(
            material.stock_actual || 0
        );


    const stockMinimo =
        Number(
            material.stock_minimo || 0
        );


    let estadoStock =
        "STOCK OK";


    if (
        stockActual <= 0
    ) {

        estadoStock =
            "SIN STOCK";

    }

    else if (
        stockActual <=
        stockMinimo
    ) {

        estadoStock =
            "STOCK BAJO";

    }


    modal.innerHTML = `

        <div class="material-ver-overlay"></div>


        <div class="material-ver-contenido">

            <button
                type="button"
                class="material-ver-cerrar"
            >
                ×
            </button>


            <div class="material-ver-header">

                <span>
                    MATERIALES
                </span>

                <h2>
                    ${escaparHTML(
                        material.nombre || "-"
                    )}
                </h2>

                <p>
                    Ficha del material
                </p>

            </div>


            <div class="material-ver-seccion">

                <div class="material-ver-seccion-titulo">
                    INFORMACIÓN
                </div>


                <div class="material-ver-grid">

                    <div class="material-ver-dato">

                        <span>
                            ID MATERIAL
                        </span>

                        <strong>
                            ${escaparHTML(
                                material.material_id
                            )}
                        </strong>

                    </div>


                    <div class="material-ver-dato">

                        <span>
                            UNIDAD DE COMPRA
                        </span>

                        <strong>
                            ${escaparHTML(
                                material.unidad_compra || "-"
                            )}
                        </strong>

                    </div>


                    <div class="material-ver-dato">

                        <span>
                            PROVEEDOR
                        </span>

                        <strong>
                            ${escaparHTML(
                                material.proveedor || "-"
                            )}
                        </strong>

                    </div>


                    <div class="material-ver-dato">

                        <span>
                            ESTADO
                        </span>

                        <strong
                            class="${
                                activo
                                    ? "material-estado-activo"
                                    : "material-estado-inactivo"
                            }"
                        >
                            ${
                                activo
                                    ? "ACTIVO"
                                    : "INACTIVO"
                            }
                        </strong>

                    </div>

                </div>

            </div>


            <div class="material-ver-seccion">

                <div class="material-ver-seccion-titulo">
                    COSTOS Y STOCK
                </div>


                <div class="material-ver-grid">

                    <div class="material-ver-dato">

                        <span>
                            COSTO UNITARIO PROMEDIO
                        </span>

                        <strong>
                            $${escaparHTML(
                                material.costo_unitario || "0"
                            )}
                        </strong>

                    </div>


                    <div class="material-ver-dato">

                        <span>
                            STOCK ACTUAL
                        </span>

                        <strong>
                            ${escaparHTML(
                                material.stock_actual || "0"
                            )}
                            ${escaparHTML(
                                material.unidad_compra || ""
                            )}
                        </strong>

                    </div>


                    <div class="material-ver-dato">

                        <span>
                            STOCK MÍNIMO
                        </span>

                        <strong>
                            ${escaparHTML(
                                material.stock_minimo || "0"
                            )}
                        </strong>

                    </div>


                    <div class="material-ver-dato">

                        <span>
                            ESTADO DEL STOCK
                        </span>

                        <strong>
                            ${escaparHTML(
                                estadoStock
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="material-ver-botones">

                <button
                    type="button"
                    class="material-ver-cerrar-btn"
                >
                    CERRAR
                </button>

                <button
                    type="button"
                    class="material-ver-editar-btn"
                >
                    EDITAR MATERIAL
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const cerrar =
        () => modal.remove();


    modal
        .querySelector(
            ".material-ver-cerrar"
        )
        .addEventListener(
            "click",
            cerrar
        );


    modal
        .querySelector(
            ".material-ver-overlay"
        )
        .addEventListener(
            "click",
            cerrar
        );


    modal
        .querySelector(
            ".material-ver-cerrar-btn"
        )
        .addEventListener(
            "click",
            cerrar
        );


    modal
        .querySelector(
            ".material-ver-editar-btn"
        )
        .addEventListener(
            "click",
            function() {

                modal.remove();


                editarMaterial(
                    material,
                    materiales
                );

            }
        );

}

/* =========================================================
   EDITAR MATERIAL
   ========================================================= */

function editarMaterial(
    material,
    materiales
) {

    if (!material) {

        alert(
            "No se encontró el material."
        );

        return;

    }


    cerrarModalesAbiertos();


    const modal =
        document.createElement(
            "div"
        );


    modal.className =
        "material-editar-modal";


    const activo =
        material.activo === true ||
        String(
            material.activo
        ).toUpperCase() === "TRUE";


    modal.innerHTML = `

        <div class="material-editar-overlay"></div>


        <div class="material-editar-contenido">

            <button
                type="button"
                class="material-editar-cerrar"
            >
                ×
            </button>


            <div class="material-editar-header">

                <span>
                    MATERIALES
                </span>

                <h2>
                    Editar material
                </h2>

                <p>
                    ${escaparHTML(
                        material.nombre || "-"
                    )}
                </p>

            </div>


            <form
                id="form-editar-material"
            >


                <div class="material-editar-seccion">

                    <div class="material-editar-seccion-titulo">
                        INFORMACIÓN DEL MATERIAL
                    </div>


                    <div class="material-editar-campo">

                        <label>
                            NOMBRE
                        </label>

                        <input
                            type="text"
                            name="nombre"
                            value="${escaparHTML(
                                material.nombre || ""
                            )}"
                            required
                        >

                    </div>


                    <div class="material-editar-grid">

                        <div class="material-editar-campo">

                            <label>
                                UNIDAD DE COMPRA
                            </label>

                            <select
                                name="unidad_compra"
                                required
                            >

                                <option
                                    value="METRO"
                                    ${
                                        String(
                                            material.unidad_compra
                                        ).toUpperCase() ===
                                        "METRO"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    METRO
                                </option>

                                <option
                                    value="GRAMO"
                                    ${
                                        String(
                                            material.unidad_compra
                                        ).toUpperCase() ===
                                        "GRAMO"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    GRAMO
                                </option>

                                <option
                                    value="KILOGRAMO"
                                    ${
                                        String(
                                            material.unidad_compra
                                        ).toUpperCase() ===
                                        "KILOGRAMO"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    KILOGRAMO
                                </option>

                                <option
                                    value="UNIDAD"
                                    ${
                                        String(
                                            material.unidad_compra
                                        ).toUpperCase() ===
                                        "UNIDAD"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    UNIDAD
                                </option>

                                <option
                                    value="ROLLO"
                                    ${
                                        String(
                                            material.unidad_compra
                                        ).toUpperCase() ===
                                        "ROLLO"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ROLLO
                                </option>

                                <option
                                    value="PAR"
                                    ${
                                        String(
                                            material.unidad_compra
                                        ).toUpperCase() ===
                                        "PAR"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    PAR
                                </option>

                            </select>

                        </div>


                        <div class="material-editar-campo">

                            <label>
                                PROVEEDOR
                            </label>

                            <input
                                type="text"
                                name="proveedor"
                                value="${escaparHTML(
                                    material.proveedor || ""
                                )}"
                            >

                        </div>

                    </div>

                </div>


                <div class="material-editar-seccion">

                    <div class="material-editar-seccion-titulo">
                        COSTOS Y STOCK
                    </div>


                    <div class="material-editar-grid">

                        <div class="material-editar-campo">

                            <label>
                                COSTO UNITARIO PROMEDIO
                            </label>

                            <input
                                type="number"
                                name="costo_unitario"
                                min="0"
                                step="0.01"
                                value="${escaparHTML(
                                    material.costo_unitario || "0"
                                )}"
                            >

                        </div>


                        <div class="material-editar-campo">

                            <label>
                                STOCK ACTUAL
                            </label>

                            <input
                                type="number"
                                name="stock_actual"
                                min="0"
                                step="0.01"
                                value="${escaparHTML(
                                    material.stock_actual || "0"
                                )}"
                            >

                        </div>


                        <div class="material-editar-campo">

                            <label>
                                STOCK MÍNIMO
                            </label>

                            <input
                                type="number"
                                name="stock_minimo"
                                min="0"
                                step="0.01"
                                value="${escaparHTML(
                                    material.stock_minimo || "0"
                                )}"
                            >

                        </div>

                    </div>

                </div>


                <div class="material-editar-seccion">

                    <div class="material-editar-seccion-titulo">
                        ESTADO
                    </div>


                    <label class="material-editar-activo">

                        <input
                            type="checkbox"
                            name="activo"
                            ${
                                activo
                                    ? "checked"
                                    : ""
                            }
                        >

                        Material activo

                    </label>

                </div>


                <div
                    id="editar-material-mensaje"
                    class="material-editar-mensaje"
                ></div>


                <div class="material-editar-botones">

                    <button
                        type="button"
                        class="material-editar-cancelar"
                    >
                        CANCELAR
                    </button>


                    <button
                        type="submit"
                        class="material-editar-guardar"
                    >
                        GUARDAR CAMBIOS
                    </button>

                </div>

            </form>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const formulario =
        modal.querySelector(
            "#form-editar-material"
        );


    const cerrar =
        () => modal.remove();


    modal
        .querySelector(
            ".material-editar-cerrar"
        )
        .addEventListener(
            "click",
            cerrar
        );


    modal
        .querySelector(
            ".material-editar-overlay"
        )
        .addEventListener(
            "click",
            cerrar
        );


    modal
        .querySelector(
            ".material-editar-cancelar"
        )
        .addEventListener(
            "click",
            cerrar
        );


    formulario.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const boton =
                formulario.querySelector(
                    ".material-editar-guardar"
                );


            const mensaje =
                formulario.querySelector(
                    "#editar-material-mensaje"
                );


            const formData =
                new FormData(
                    formulario
                );


            const nombre =
                String(
                    formData.get(
                        "nombre"
                    ) || ""
                ).trim();


            const unidadCompra =
                String(
                    formData.get(
                        "unidad_compra"
                    ) || ""
                ).trim();


            const proveedor =
                String(
                    formData.get(
                        "proveedor"
                    ) || ""
                ).trim();


            const costo =
                Number(
                    formData.get(
                        "costo_unitario"
                    ) || 0
                );


            const stockActual =
                Number(
                    formData.get(
                        "stock_actual"
                    ) || 0
                );


            const stockMinimo =
                Number(
                    formData.get(
                        "stock_minimo"
                    ) || 0
                );


            const activoActual =
                formulario.querySelector(
                    'input[name="activo"]'
                ).checked;


            if (!nombre) {

                alert(
                    "Ingresá el nombre del material."
                );

                return;

            }


            if (!unidadCompra) {

                alert(
                    "Seleccioná la unidad de compra."
                );

                return;

            }


            if (
                costo < 0 ||
                stockActual < 0 ||
                stockMinimo < 0
            ) {

                alert(
                    "El costo y el stock no pueden ser negativos."
                );

                return;

            }


            const data = {

                nombre:
                    nombre,

                unidad_compra:
                    unidadCompra,

                proveedor:
                    proveedor,

                costo_unitario:
                    costo,

                stock_actual:
                    stockActual,

                stock_minimo:
                    stockMinimo,

                activo:
                    activoActual

            };


            boton.disabled =
                true;


            boton.textContent =
                "GUARDANDO...";


            mensaje.textContent =
                "Guardando cambios...";


            try {

                const response =
                    await fetch(
                        API_URL,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "text/plain;charset=utf-8"

                            },

                            body:
                                JSON.stringify({

                                    action:
                                        "update",

                                    resource:
                                        "materiales",

                                    id:
                                        material.material_id,

                                    data:
                                        data

                                })

                        }
                    );


                const resultado =
                    await response.json();


                if (
                    !resultado.success
                ) {

                    throw new Error(
                        resultado.error ||
                        "No se pudieron guardar los cambios."
                    );

                }


                mensaje.textContent =
                    "Material actualizado correctamente.";


                mensaje.className =
                    "material-editar-mensaje exito";


                setTimeout(
                    async function() {

                        modal.remove();


                        try {

                            await iniciarMateriales();

                        } catch (error) {

                            console.error(
                                "Error actualizando materiales:",
                                error
                            );

                        }

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "Error editando material:",
                    error
                );


                mensaje.textContent =
                    "No se pudieron guardar los cambios.";


                mensaje.className =
                    "material-editar-mensaje error";


                boton.disabled =
                    false;


                boton.textContent =
                    "GUARDAR CAMBIOS";


                alert(
                    "No se pudieron guardar los cambios.\n\n" +
                    error.message
                );

            }

        }
    );

}

/* =========================================================
   ESTILOS FICHA DE CLIENTE
   ========================================================= */

function agregarEstilosFichaCliente() {
    if (document.getElementById("zaria-ficha-cliente-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "zaria-ficha-cliente-styles";

    style.textContent = `
        .cliente-ficha-modal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 25px;
        }

        .cliente-ficha-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.65);
            backdrop-filter: blur(3px);
        }

        .cliente-ficha-contenido {
            position: relative;
            z-index: 2;
            width: min(800px, 100%);
            max-height: 92vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 16px;
            padding: 35px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }

        .cliente-ficha-cerrar {
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

        .cliente-ficha-header {
            margin-bottom: 28px;
            padding-right: 35px;
        }

        .cliente-ficha-header span {
            font-size: 11px;
            letter-spacing: 2px;
            color: #777;
        }

        .cliente-ficha-header h2 {
            margin: 6px 0 4px;
            font-size: 28px;
            color: #222;
        }

        .cliente-ficha-header p {
            margin: 0;
            color: #777;
            font-size: 13px;
        }

        .cliente-ficha-seccion {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        .cliente-ficha-seccion:first-of-type {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
        }

        .cliente-ficha-seccion-titulo {
            margin-bottom: 15px;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1.5px;
            color: #777;
        }

        .cliente-ficha-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 25px;
        }

        .cliente-ficha-dato span,
        .cliente-ficha-medida span {
            display: block;
            margin-bottom: 5px;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1px;
            color: #999;
        }

        .cliente-ficha-dato strong {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #333;
            word-break: break-word;
        }

        .cliente-ficha-medidas {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }

        .cliente-ficha-medida {
            padding: 15px 12px;
            background: #f7f7f7;
            border-radius: 9px;
            text-align: center;
        }

        .cliente-ficha-medida strong {
            font-size: 16px;
            font-weight: 600;
            color: #222;
        }

        .cliente-ficha-observaciones {
            min-height: 55px;
            padding: 14px 15px;
            background: #f7f7f7;
            border-radius: 9px;
            font-size: 13px;
            line-height: 1.5;
            color: #555;
            white-space: pre-wrap;
        }

        .cliente-ficha-botones {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        .cliente-ficha-botones button {
            height: 42px;
            padding: 0 20px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: .5px;
            cursor: pointer;
        }

        .btn-ficha-cerrar {
            background: #fff;
            color: #1d1a1a;
            border: 1px solid #1d1a1a;
        }

        .btn-ficha-nuevo-pedido {
            background: #1d1a1a;
            color: #fff;
            border: 1px solid #1d1a1a;
        }

        .cliente-ficha-botones button:hover {
            opacity: .85;
        }

        @media (max-width: 700px) {
            .cliente-ficha-modal {
                padding: 10px;
            }

            .cliente-ficha-contenido {
                padding: 25px 20px;
                max-height: 95vh;
            }

            .cliente-ficha-grid {
                grid-template-columns: 1fr;
                gap: 14px;
            }

            .cliente-ficha-medidas {
                grid-template-columns: repeat(2, 1fr);
            }

            .cliente-ficha-botones {
                flex-direction: column;
            }

            .cliente-ficha-botones button {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(style);
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
