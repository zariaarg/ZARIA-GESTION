const API_URL = "https://script.google.com/macros/s/AKfycbyZzZQhIyQAdZv2G4YqUqvb_wThnq_S_PPq81YET8W-vBVs7O9No7KOb1_stS2XbMvO/exec";


function cargarModelos() {

    const container =
        document.getElementById("modelos-container");

    const callbackName =
        "zariaCallback_" + Date.now();


    window[callbackName] = function(result) {

        try {

            if (!result.success) {
                throw new Error(
                    result.error || "Error en la API"
                );
            }

            mostrarModelos(result.data);

        } catch (error) {

            console.error(error);

            container.innerHTML = `
                <p class="error">
                    No se pudieron cargar los modelos.
                </p>
            `;

        } finally {

            delete window[callbackName];

            if (script) {
                script.remove();
            }

        }

    };


    const script =
        document.createElement("script");


    script.src =
        `${API_URL}?resource=modelos&callback=${callbackName}`;


    script.onerror = function() {

        console.error(
            "Error al conectar con la API"
        );

        container.innerHTML = `
            <p class="error">
                No se pudieron cargar los modelos.
            </p>
        `;

        delete window[callbackName];

        script.remove();

    };


    document.body.appendChild(script);

}


function convertirImagenDrive(url) {

    if (!url) {
        return "";
    }

    const match =
        url.match(/\/d\/([^/]+)/);

    if (!match) {
        return url;
    }

    const fileId = match[1];

    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}


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


function mostrarMedidas(medidas) {

    if (!medidas) {
        return "";
    }

    return escaparHTML(medidas)
        .replace(/\n/g, "<br>");
}


function mostrarModelos(modelos) {

    const container =
        document.getElementById(
            "modelos-container"
        );

    container.innerHTML = "";


    modelos.forEach(modelo => {

        const card =
            document.createElement("article");

        card.className =
            "modelo-card";


        const imagen =
            convertirImagenDrive(
                modelo.imagen
            );


        const imagenHTML = imagen
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
                    ${escaparHTML(modelo.material_base)}
                </p>


                <div class="modelo-precio">
                    ${formatearPrecio(modelo.precio_venta)}
                </div>


                <div class="modelo-detalle">

                    <h4>DETALLE</h4>

                    <p>
                        ${escaparHTML(modelo.descripcion)}
                    </p>

                </div>


                <div class="modelo-medidas">

                    <h4>MEDIDAS</h4>

                    <p>
                        ${mostrarMedidas(modelo.medidas)}
                    </p>

                </div>


                <div class="modelo-info">

                    <div>
                        <strong>Material</strong>
                        <span>
                            ${escaparHTML(modelo.material_base)}
                        </span>
                    </div>

                    <div>
                        <strong>Personalización</strong>
                        <span>
                            Según disponibilidad
                        </span>
                    </div>

                </div>

            </div>

        `;


        container.appendChild(card);

    });

}


cargarModelos();
