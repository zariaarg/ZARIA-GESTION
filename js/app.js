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
                <p>
                    No se pudieron cargar los modelos.
                </p>
            `;

        } finally {

            delete window[callbackName];

            script.remove();

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
            <p>
                No se pudieron cargar los modelos.
            </p>
        `;

        delete window[callbackName];

        script.remove();

    };


    document.body.appendChild(script);

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


        card.innerHTML = `
            <div class="modelo-codigo">
                ${modelo.codigo}
            </div>

            <div class="modelo-nombre">
                ${modelo.nombre}
            </div>

            <div class="modelo-tipo">
                ${modelo.tipo}
            </div>
        `;


        container.appendChild(card);

    });

}


cargarModelos();
