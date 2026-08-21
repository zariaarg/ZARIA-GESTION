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
            "zariaCallback_" + Date.now() + "_" +
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


        /*
         * Cargamos modelos y configuración
         * al mismo tiempo.
         */

        const [
            modelosData,
            configuracion
        ] = await Promise.all([

            llamarAPI("modelos"),

            llamarAPI("configuracion")

        ]);


        modelos = modelosData;


        /*
         * Buscamos solamente los registros
         * de categoría TIPO y activos.
         */

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

    /*
     * Si ya existen controles,
     * no los duplicamos.
     */

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
                    "Formulario NUEVO MODELO: lo conectaremos en el próximo paso."
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


            /*
             * Filtro por tipo
             */

            const coincideTipo =
                filtroActual === "TODOS" ||
                String(modelo.tipo)
                    .toUpperCase() ===
                String(filtroActual)
                    .toUpperCase();


            /*
             * Filtro por búsqueda
             */

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
                        <span>Sin imagen</span>
                    </div>
                `;


            card.innerHTML = `

                ${imagenHTML}


                <div class="modelo-contenido">


                    <div class="modelo-superior">

                        <span class="modelo-codigo">
                            ${escaparHTML(modelo.codigo)}
                        </span>


                        <span class="modelo-tipo">
                            ${escaparHTML(modelo.tipo)}
                        </span>

                    </div>


                    <h3 class="modelo-nombre">
                        ${escaparHTML(modelo.nombre)}
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
     * Eventos VER
     */

    document
        .querySelectorAll(".btn-ver")
        .forEach(btn => {

            btn.addEventListener(
                "click",
                function() {

                    const id =
                        this.dataset.id;

                    verModelo(id);

                }
            );

        });


    /*
     * Eventos EDITAR
     */

    document
        .querySelectorAll(".btn-editar")
        .forEach(btn => {

            btn.addEventListener(
                "click",
                function() {

                    const id =
                        this.dataset.id;

                    editarModelo(id);

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

    const imagenPrincipal =
        convertirImagenDrive(modelo.imagen);

    const imagenSecundaria =
        convertirImagenDrive(modelo.imagen_2);

    const modal =
        document.createElement("div");

    modal.className = "modelo-modal";

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


                <!-- IMÁGENES -->

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


                <!-- INFORMACIÓN -->

                <div class="modelo-detalle-info">


                    <div class="modelo-detalle-codigo">

                        ${escaparHTML(modelo.codigo)}

                    </div>


                    <div class="modelo-detalle-tipo">

                        ${escaparHTML(modelo.tipo)}

                    </div>


                    <h2>

                        ${escaparHTML(modelo.nombre)}

                    </h2>


                    <div class="modelo-detalle-material">

                        ${escaparHTML(modelo.material_base)}

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
     * Cerrar con X
     */

    const botonCerrar =
        modal.querySelector(
            ".modelo-modal-cerrar"
        );

    botonCerrar.addEventListener(
        "click",
        cerrarModal
    );


    /*
     * Cerrar haciendo click
     * fuera de la ficha
     */

    const overlay =
        modal.querySelector(
            ".modelo-modal-overlay"
        );

    overlay.addEventListener(
        "click",
        cerrarModal
    );


    /*
     * Cerrar con ESC
     */

    document.addEventListener(
        "keydown",
        function cerrarConEscape(event) {

            if (event.key === "Escape") {

                cerrarModal();

                document.removeEventListener(
                    "keydown",
                    cerrarConEscape
                );

            }

        }
    );


    function cerrarModal() {

        modal.remove();

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
        return;
    }


    alert(
        `EDITAR MODELO\n\n` +
        `${modelo.nombre} (${modelo.codigo})\n\n` +
        `El formulario de edición lo conectaremos después.`
    );

}


/* =========================
   IMAGEN DRIVE
========================= */

function convertirImagenDrive(url) {

    if (!url) {
        return "";
    }


    const match =
        url.match(
            /\/d\/([^/]+)/
        );


    if (!match) {
        return url;
    }


    const fileId =
        match[1];


    return `
        https://drive.google.com/thumbnail
        ?id=${fileId}&sz=w1000
    `.replace(/\s/g, "");

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
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================
   ARRANCAR
========================= */

iniciarAplicacion();
