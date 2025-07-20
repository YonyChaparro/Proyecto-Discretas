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

// --- Configuración Global de la Simulación ---

// Definición de los tamaños de los alfabetos individuales
const ALPHABET_SIZES = {
    lowercase: 26, // a-z
    uppercase: 26, // A-Z
    numbers: 10,   // 0-9
    symbols: 32    // Caracteres especiales comunes
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
 * Calcula el tamaño del alfabeto combinado basado en los checkboxes seleccionados.
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
        // Ajustar el límite máximo del eje Y dinámicamente para escala lineal
        if (yAxisType === 'linear' && data.length > 0) {
            // Establece un máximo que sea un poco más grande que el valor más alto actual.
            // Esto ayudará a que la curva se vea, pero se disparará rápidamente.
            chartInstance.options.scales.y.max = Math.max(...data) * 1.1;
            // Si el valor máximo es 0 (contraseña vacía), asegura que el max sea razonable para empezar.
            if (chartInstance.options.scales.y.max === 0) chartInstance.options.scales.y.max = 1;
        } else if (yAxisType === 'logarithmic') {
            // Para logarítmica, mantenemos un suggestedMax alto.
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
                        type: yAxisType, // Dinámico: 'linear' o 'logarithmic'
                        title: {
                            display: true,
                            text: yAxisLabel,
                            font: { size: 14 },
                            color: '#555'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                // Para escala lineal, solo usa formatTime.
                                // Para logarítmica, usa la lógica específica de potencias de 10.
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
                        min: (yAxisType === 'linear' ? 0 : 0.001), // Mínimo diferente para lineal/logarítmica
                        // suggestedMax se maneja en la lógica de actualización para lineal
                        // y se mantiene en la creación para logarítmica.
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
    const password = passwordInput.value;
    const currentPasswordLength = password.length;
    const currentCharacterSetSize = getCharacterSetSize();

    // Determina si la longitud de la contraseña ha cambiado o si el set de caracteres ha cambiado
    const lengthChanged = currentPasswordLength !== previousPasswordLength;
    // La condición para charSetChanged debe verificar si el último punto en el historial
    // tiene un tamaño de alfabeto diferente al actual.
    const charSetChanged = historicalDataHuman.length > 0 && historicalDataHuman[historicalDataHuman.length - 1].charSetSize !== currentCharacterSetSize;

    if (lengthChanged || charSetChanged) {
        // Si la longitud disminuye o el set de caracteres cambia, reinicia ambos historiales
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
        `Tiempo Estimado (segundos)`, // Eje Y para Humano
        'linear' // Escala lineal para el humano
    );

    computerChart = createOrUpdateChart(
        document.getElementById('computerTimeChart'),
        computerChart,
        historicalDataComputer,
        `Tiempo de Desencriptación (Computadora)`, // Título más simple para computadora
        `Tiempo Estimado (segundos)`, // Eje Y para Computadora
        'linear' // ¡AHORA ES LINEAL PARA LA COMPUTADORA TAMBIÉN!
    );
}

// --- Event Listeners (Detectores de Eventos) ---

// Escucha cada cambio en el campo de entrada de la contraseña.
passwordInput.addEventListener('input', updateDecryptionAnalysis);

// Escucha cada cambio en los checkboxes de tipo de carácter.
[chkLowercase, chkUppercase, chkNumbers, chkSymbols].forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Al cambiar las opciones de caracteres, reiniciamos el historial para ambos gráficos
        historicalDataHuman = [];
        historicalDataComputer = [];
        previousPasswordLength = 0; // Reinicia la longitud previa para una nueva secuencia.
        updateDecryptionAnalysis(); // Dispara la actualización.
    });
});

// --- Inicialización del Proyecto ---

// Llama a la función de análisis al cargar la página por primera vez.
updateDecryptionAnalysis();