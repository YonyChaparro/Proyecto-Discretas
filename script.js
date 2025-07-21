// script.js

// --- Referencias a elementos del DOM ---
const passwordInput = document.getElementById('passwordInput');
const decryptionTimeHumanSpan = document.getElementById('decryptionTimeHuman');
const decryptionTimeComputerSpan = document.getElementById('decryptionTimeComputer');

// Referencias a los checkboxes de tipo de carácter
const chkLowercase = document.getElementById('chkLowercase');
const chkUppercase = document.getElementById('chkUppercase');
const chkNumbers = document.getElementById('chkNumbers');
const chkSymbols = document.getElementById('chkSymbols');

// Agrupar los checkboxes para facilitar su manejo
const characterCheckboxes = [chkLowercase, chkUppercase, chkNumbers, chkSymbols];

// --- Configuración Global de la Simulación ---

// Definición de los tamaños y JUEGOS de los alfabetos individuales
const ALPHABETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()-_+=[]{}|;:,.<>?/~`"\'\\'
};

// Obtenemos los tamaños directamente de la longitud de las cadenas de caracteres
const ALPHABET_SIZES = {
    lowercase: ALPHABETS.lowercase.length,
    uppercase: ALPHABETS.uppercase.length,
    numbers: ALPHABETS.numbers.length,
    symbols: ALPHABETS.symbols.length
};


// Velocidades de intento por segundo para cada tipo de atacante
const attemptsPerSecondHuman = 0.5; // 1 intento cada 2 segundos
const attemptsPerSecondComputer = 1_000_000_000; // 1 billón (10^9) de intentos por segundo

// --- Variables para los Gráficos y el Historial ---
let humanChart;    // Instancia del gráfico para ataque humano
let computerChart; // Instancia del gráfico para ataque de computadora

// Almacena los puntos históricos para cada gráfico
let historicalDataHuman = [];
let historicalDataComputer = [];

let previousPasswordLength = 0; // Para detectar cambios en la longitud de la contraseña

// --- Funciones de Lógica de Negocio ---

/**
 * Construye la cadena de caracteres permitidos basada en los checkboxes seleccionados.
 * @returns {string} Una cadena que contiene todos los caracteres permitidos.
 */
function getPermittedCharacterSet() {
    let permittedChars = '';
    if (chkLowercase.checked) permittedChars += ALPHABETS.lowercase;
    if (chkUppercase.checked) permittedChars += ALPHABETS.uppercase;
    if (chkNumbers.checked) permittedChars += ALPHABETS.numbers;
    if (chkSymbols.checked) permittedChars += ALPHABETS.symbols;
    return permittedChars;
}

/**
 * Calcula el tamaño del alfabeto combinado basado en los checkboxes seleccionados.
 * Es crucial para la fórmula de combinaciones.
 * @returns {number} El tamaño total del alfabeto.
 */
function getCharacterSetSize() {
    let size = 0;
    if (chkLowercase.checked) size += ALPHABET_SIZES.lowercase;
    if (chkUppercase.checked) size += ALPHABET_SIZES.uppercase;
    if (chkNumbers.checked) size += ALPHABET_SIZES.numbers;
    if (chkSymbols.checked) size += ALPHABET_SIZES.symbols;
    return Math.max(size, 1);
}

/**
 * Calcula el tiempo estimado de desencriptación por fuerza bruta.
 * @param {number} passwordLength - La longitud de la contraseña.
 * @param {number} currentCharacterSetSize - El tamaño actual del alfabeto combinado.
 * @param {number} attemptsPerSec - La velocidad de intentos para este cálculo (humano o máquina).
 * @returns {number} Tiempo en segundos.
 */
function calculateDecryptionTime(passwordLength, currentCharacterSetSize, attemptsPerSec) {
    if (passwordLength === 0) {
        return 0;
    }
    const numberOfCombinations = Math.pow(currentCharacterSetSize, passwordLength);
    const timeInSeconds = numberOfCombinations / attemptsPerSec;
    return timeInSeconds;
}

/**
 * Formatea un tiempo dado en segundos a una cadena legible.
 * @param {number} seconds - El tiempo en segundos.
 * @returns {string} El tiempo formateado.
 */
function formatTime(seconds) {
    if (seconds < 0.001) return `menos de 1 milisegundo`;
    if (seconds < 1) return `${(seconds * 1000).toFixed(2)} milisegundos`;
    if (seconds < 60) return `${seconds.toFixed(2)} segundos`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(2)} minutos`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(2)} horas`;
    if (seconds < 31536000) return `${(seconds / 86400).toFixed(2)} días`;
    if (seconds < 31536000000) return `${(seconds / 31536000).toPrecision(3)} años`;

    const trillionYears = 31536000000000;
    if (seconds < trillionYears) {
        return `${(seconds / 31536000).toPrecision(3)} años`;
    }
    return `${seconds.toExponential(2)} segundos (¡incalculable!)`;
}

// --- Funciones de Renderizado de Gráficos ---

/**
 * Inicializa o actualiza un gráfico específico.
 * @param {HTMLCanvasElement} canvasElement - El elemento canvas para el gráfico.
 * @param {object} chartInstance - La instancia actual del gráfico (null si no existe).
 * @param {Array<object>} historicalData - Los datos históricos para este gráfico.
 * @param {string} chartTitle - Título del gráfico.
 * @param {string} yAxisLabel - Etiqueta para el eje Y.
 * @param {string} yAxisType - Tipo de escala para el eje Y ('linear' o 'logarithmic').
 * @returns {Chart} La instancia actualizada o nueva del gráfico.
 */
function createOrUpdateChart(canvasElement, chartInstance, historicalData, chartTitle, yAxisLabel, yAxisType) {
    const labels = historicalData.map(d => `${d.length} car.`);
    const data = historicalData.map(d => d.time);

    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.options.scales.y.title.text = yAxisLabel;
        if (yAxisType === 'linear' && data.length > 0) {
            chartInstance.options.scales.y.max = Math.max(...data) * 1.1;
            if (chartInstance.options.scales.y.max === 0) chartInstance.options.scales.y.max = 1;
        } else if (yAxisType === 'logarithmic') {
            chartInstance.options.scales.y.suggestedMax = 1e15;
        }
        chartInstance.update();
    } else {
        chartInstance = new Chart(canvasElement, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tiempo de Desencriptación',
                    data: data,
                    borderColor: 'rgb(52, 152, 219)',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    tension: 0.3,
                    fill: false,
                    pointBackgroundColor: 'rgb(52, 152, 219)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(52, 152, 219)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: chartTitle,
                        font: { size: 16 },
                        color: '#333'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += formatTime(context.parsed.y);
                                }
                                return label;
                            },
                            title: function(context) {
                                return `Longitud: ${context[0].label}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Longitud de la Contraseña',
                            font: { size: 14 },
                            color: '#555'
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: { display: false }
                    },
                    y: {
                        type: yAxisType,
                        title: {
                            display: true,
                            text: yAxisLabel,
                            font: { size: 14 },
                            color: '#555'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                if (yAxisType === 'logarithmic') {
                                    if (value === 0) return '0';
                                    if (value === 1) return '1 seg.';
                                    if (value === 0.001) return '1 ms';
                                    if (value === 0.01) return '10 ms';
                                    if (value === 0.1) return '100 ms';
                                    if (Math.log10(value) % 1 === 0) {
                                        return value.toLocaleString() + ' seg.';
                                    }
                                }
                                return formatTime(value);
                            },
                            color: '#666'
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        min: (yAxisType === 'linear' ? 0 : 0.001),
                        suggestedMax: (yAxisType === 'logarithmic' ? 1e15 : undefined)
                    }
                }
            }
        });
    }
    return chartInstance;
}

// --- Función Principal de Actualización ---

/**
 * Función principal que se activa con cada cambio en el input de contraseña o en los checkboxes.
 * Calcula y actualiza ambos gráficos y los textos de tiempo.
 */
function updateDecryptionAnalysis() {
    // Obtener la cadena de caracteres permitidos basada en la selección actual
    const permittedCharacterSet = getPermittedCharacterSet();
    let password = passwordInput.value;
    let newPassword = '';
    // --- NUEVA LÓGICA DE VALIDACIÓN DE CARACTERES ---
    // Recorre la contraseña ingresada, caracter por caracter
    for (let i = 0; i < password.length; i++) {
        const char = password[i];
        // Si el caracter está en el conjunto de caracteres permitidos, lo añade
        if (permittedCharacterSet.includes(char)) {
            newPassword += char;
        }
    }
    // Actualiza el campo de entrada con la contraseña "limpia"
    passwordInput.value = newPassword;
    password = newPassword; // Asegúrate de que la variable 'password' refleje el valor limpio
    // --- FIN NUEVA LÓGICA ---

    const currentPasswordLength = password.length;
    const currentCharacterSetSize = getCharacterSetSize();

    // Lógica para habilitar/deshabilitar checkboxes
    const disableCheckboxes = currentPasswordLength > 0;
    characterCheckboxes.forEach(checkbox => {
        checkbox.disabled = disableCheckboxes;
    });

    // Determina si la longitud de la contraseña ha cambiado o si el set de caracteres ha cambiado
    const lengthChanged = currentPasswordLength !== previousPasswordLength;
    // La condición para charSetChanged debe verificar si el último punto en el historial
    // tiene un tamaño de alfabeto diferente al actual.
    // Solo se chequea si hay historial y si los checkboxes están habilitados (cuando currentPasswordLength es 0)
    // o si el cambio de set de caracteres ocurre antes de escribir.
    const charSetChanged = !disableCheckboxes && historicalDataHuman.length > 0 && historicalDataHuman[historicalDataHuman.length - 1].charSetSize !== currentCharacterSetSize;


    if (lengthChanged || charSetChanged) {
        // Si la longitud disminuye o el set de caracteres cambia (y no hay password), reinicia ambos historiales
        if (currentPasswordLength < previousPasswordLength || charSetChanged) {
            historicalDataHuman = [];
            historicalDataComputer = [];
        }
        
        // Añade un nuevo punto al historial si la longitud actual es mayor que 0
        if (currentPasswordLength > 0) {
            const timeHuman = calculateDecryptionTime(currentPasswordLength, currentCharacterSetSize, attemptsPerSecondHuman);
            const timeComputer = calculateDecryptionTime(currentPasswordLength, currentCharacterSetSize, attemptsPerSecondComputer);

            historicalDataHuman.push({
                length: currentPasswordLength,
                time: timeHuman,
                charSetSize: currentCharacterSetSize
            });
            historicalDataComputer.push({
                length: currentPasswordLength,
                time: timeComputer,
                charSetSize: currentCharacterSetSize
            });
        }
        previousPasswordLength = currentPasswordLength; // Actualiza la longitud previa
    }

    // Actualiza el texto de tiempo actual para ambos escenarios
    const currentTimeHuman = calculateDecryptionTime(currentPasswordLength, currentCharacterSetSize, attemptsPerSecondHuman);
    const currentTimeComputer = calculateDecryptionTime(currentPasswordLength, currentCharacterSetSize, attemptsPerSecondComputer);
    
    decryptionTimeHumanSpan.textContent = `${formatTime(currentTimeHuman)} (Humano)`;
    decryptionTimeComputerSpan.textContent = `${formatTime(currentTimeComputer)} (Computadora)`;

    // Renderiza (o actualiza) ambos gráficos
    humanChart = createOrUpdateChart(
        document.getElementById('humanTimeChart'),
        humanChart,
        historicalDataHuman,
        `Tiempo de Desencriptación (${attemptsPerSecondHuman} int./seg.)`,
        `Tiempo Estimado (segundos)`,
        'linear'
    );

    computerChart = createOrUpdateChart(
        document.getElementById('computerTimeChart'),
        computerChart,
        historicalDataComputer,
        `Tiempo de Desencriptación (Computadora)`,
        `Tiempo Estimado (segundos)`,
        'linear'
    );
}

// --- Event Listeners (Detectores de Eventos) ---

// Escucha cada cambio en el campo de entrada de la contraseña.
passwordInput.addEventListener('input', updateDecryptionAnalysis);

// Escucha cada cambio en los checkboxes de tipo de carácter.
characterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Al cambiar las opciones de caracteres, reiniciamos el historial para ambos gráficos
        // y también volvemos a validar la contraseña actual con las nuevas reglas.
        historicalDataHuman = [];
        historicalDataComputer = [];
        previousPasswordLength = 0; // Reinicia la longitud previa para una nueva secuencia.
        updateDecryptionAnalysis(); // Dispara la actualización y la validación.
    });
});

// --- Inicialización del Proyecto ---

// Llama a la función de análisis al cargar la página por primera vez.
// Esto asegura que los checkboxes estén habilitados al inicio si el campo está vacío
// y que cualquier contraseña preexistente se valide.
updateDecryptionAnalysis();