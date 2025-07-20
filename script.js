// script.js

const passwordInput = document.getElementById('passwordInput');
const decryptionTimeSpan = document.getElementById('decryptionTime');
const timeChartCanvas = document.getElementById('timeChart');

// Referencias a los checkboxes de tipo de carácter
const chkLowercase = document.getElementById('chkLowercase');
const chkUppercase = document.getElementById('chkUppercase');
const chkNumbers = document.getElementById('chkNumbers');
const chkSymbols = document.getElementById('chkSymbols');

// --- Configuración Global ---

// Definición de los tamaños de los alfabetos individuales
const ALPHABET_SIZES = {
    lowercase: 26, // a-z
    uppercase: 26, // A-Z
    numbers: 10,   // 0-9
    symbols: 32    // Caracteres especiales comunes (puedes ajustar esta cantidad si lo deseas)
};

// Velocidad de intentos por segundo que asumimos para el atacante.
// Un billón (10^9) de intentos por segundo, común para GPUs modernas o botnets.
const attemptsPerSecond = 1_000_000_000;

let chart; // Variable global para almacenar la instancia del gráfico de Chart.js

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

    // Asegura que el tamaño del alfabeto sea al menos 1 para evitar Math.pow(0, X)
    // Esto es importante si el usuario desmarca todas las opciones.
    return Math.max(size, 1);
}

/**
 * Calcula el tiempo estimado de desencriptación por fuerza bruta.
 * @param {number} passwordLength - La longitud de la contraseña.
 * @param {number} currentCharacterSetSize - El tamaño actual del alfabeto combinado.
 * @returns {number} Tiempo en segundos.
 */
function calculateDecryptionTime(passwordLength, currentCharacterSetSize) {
    if (passwordLength === 0) {
        return 0; // Si no hay contraseña, el tiempo es 0.
    }

    // Calcula el número total de combinaciones posibles.
    // Fórmula: (Tamaño del Alfabeto) ^ (Longitud de la Contraseña)
    const numberOfCombinations = Math.pow(currentCharacterSetSize, passwordLength);

    // Calcula el tiempo dividiendo las combinaciones por la velocidad de intento.
    const timeInSeconds = numberOfCombinations / attemptsPerSecond;

    return timeInSeconds;
}

/**
 * Formatea un tiempo dado en segundos a una cadena legible (ms, s, min, h, días, años, etc.).
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
    if (seconds < 31536000000) return `${(seconds / 31536000).toFixed(2)} años`;

    // Para tiempos extremadamente largos (billones de años o más), usar notación científica o simplificada
    const trillionYears = 31536000000000; // 1 billón de años en segundos
    if (seconds < trillionYears) {
        return `${(seconds / 31536000).toPrecision(3)} años`; // Muestra con 3 cifras significativas
    }
    return `${seconds.toExponential(2)} segundos (¡incalculable!)`;
}

// --- Funciones de Renderizado del Gráfico ---

/**
 * Actualiza o inicializa el gráfico de tiempo de desencriptación.
 * @param {number} currentPasswordLength - La longitud actual de la contraseña ingresada.
 * @param {number} charSetSizeForChart - El tamaño del alfabeto usado para los cálculos del gráfico.
 */
function updateChart(currentPasswordLength, charSetSizeForChart) {
    const labels = [];
    const data = [];

    // Determina la longitud máxima de contraseña a mostrar en el gráfico.
    // Esto asegura que el gráfico siempre tenga un rango visible (min 15 caracteres),
    // y se extienda un poco más allá de la longitud actual para mostrar la tendencia.
    const maxLen = Math.max(currentPasswordLength + 5, 15);

    // Genera los puntos de datos para el gráfico usando el tamaño de alfabeto actual.
    for (let i = 1; i <= maxLen; i++) {
        labels.push(`${i} car.`); // Etiqueta para el eje X (ej: "5 car.")
        data.push(calculateDecryptionTime(i, charSetSizeForChart)); // Tiempo de desencriptación
    }

    // Si el gráfico ya ha sido inicializado, solo actualiza sus datos y redibuja.
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.options.scales.y.title.text = `Tiempo Estimado de Desencriptación (alfabeto de ${charSetSizeForChart} car.)`;
        chart.update(); // Manda a Chart.js a redibujar el gráfico con los nuevos datos.
    } else {
        // Si es la primera vez, inicializa el gráfico.
        chart = new Chart(timeChartCanvas, {
            type: 'line', // Gráfico de línea
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tiempo de Desencriptación',
                    data: data,
                    borderColor: 'rgb(52, 152, 219)', // Color de la línea (azul vibrante)
                    backgroundColor: 'rgba(52, 152, 219, 0.2)', // Color del área bajo la línea
                    tension: 0.3, // Curvatura de la línea
                    fill: false, // No rellenar el área bajo la línea
                    pointBackgroundColor: 'rgb(52, 152, 219)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(52, 152, 219)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Permite que el gráfico se adapte a su contenedor.
                plugins: {
                    title: {
                        display: true,
                        text: 'Impacto de la Longitud y Complejidad en el Tiempo de Desencriptación',
                        font: {
                            size: 16
                        },
                        color: '#333'
                    },
                    tooltip: {
                        callbacks: {
                            // Personaliza la información que aparece al pasar el ratón por los puntos.
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatTime(context.parsed.y); // Usa la función formatTime
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
                            font: {
                                size: 14
                            },
                            color: '#555'
                        },
                        grid: {
                            display: false // Oculta las líneas de la cuadrícula en el eje X
                        }
                    },
                    y: {
                        type: 'logarithmic', // ¡ESENCIAL! Usa escala logarítmica para ver el crecimiento exponencial.
                        title: {
                            display: true,
                            // Este texto será actualizado dinámicamente
                            text: `Tiempo Estimado de Desencriptación (asumiendo ${attemptsPerSecond.toExponential(0)} intentos/segundo)`,
                            font: {
                                size: 14
                            },
                            color: '#555'
                        },
                        ticks: {
                            // Personaliza los ticks del eje Y para que sean más legibles en escala logarítmica.
                            callback: function(value, index, values) {
                                if (value >= 1e12) return (value / 1e12).toFixed(0) + ' billones de seg.';
                                if (value >= 1e9) return (value / 1e9).toFixed(0) + ' mil millones de seg.';
                                if (value >= 1e6) return (value / 1e6).toFixed(0) + ' M seg.';
                                if (value >= 1e3) return (value / 1e3).toFixed(0) + ' K seg.';
                                if (value < 1 && value !== 0) return (value * 1000).toFixed(0) + ' ms';
                                if (value === 0) return '0'; // Manejar el caso de 0 segundos
                                return value.toFixed(0) + ' seg.';
                            },
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)' // Líneas de cuadrícula sutiles
                        }
                    }
                }
            }
        });
    }
}

// --- Función de Actualización Central ---

/**
 * Función principal que se llama cada vez que hay un cambio en el input o en los checkboxes.
 * Recalcula y actualiza la interfaz y el gráfico.
 */
function updateDecryptionAnalysis() {
    const passwordLength = passwordInput.value.length;
    const currentCharacterSetSize = getCharacterSetSize();

    // Recalcula el tiempo con el nuevo tamaño del alfabeto
    const time = calculateDecryptionTime(passwordLength, currentCharacterSetSize);
    decryptionTimeSpan.textContent = formatTime(time);

    // Actualiza el gráfico con la nueva longitud y el tamaño del alfabeto
    updateChart(passwordLength, currentCharacterSetSize);
}

// --- Event Listeners ---

// Escucha el evento 'input' en el campo de la contraseña.
passwordInput.addEventListener('input', updateDecryptionAnalysis);

// Escucha el evento 'change' en cada checkbox para actualizar el cálculo cuando cambian.
chkLowercase.addEventListener('change', updateDecryptionAnalysis);
chkUppercase.addEventListener('change', updateDecryptionAnalysis);
chkNumbers.addEventListener('change', updateDecryptionAnalysis);
chkSymbols.addEventListener('change', updateDecryptionAnalysis);

// --- Inicialización ---

// Llama a la función principal de actualización al cargar la página
// para mostrar el estado inicial del gráfico y los cálculos.
updateDecryptionAnalysis();