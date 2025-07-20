const passwordInput = document.getElementById('passwordInput');
const decryptionTimeSpan = document.getElementById('decryptionTime');
const timeChartCanvas = document.getElementById('timeChart');

// Definir el tamaño del alfabeto (ej: minúsculas, mayúsculas, números y símbolos comunes)
const characterSetSize = 94; // a-z, A-Z, 0-9, y ~32 símbolos comunes
// Velocidad de intentos por segundo (ej: 10^9 intentos/segundo para una GPU moderna)
const attemptsPerSecond = 1_000_000_000; // 1 billón de intentos por segundo

let chart; // Variable para almacenar la instancia del gráfico

function calculateDecryptionTime(passwordLength) {
    if (passwordLength === 0) return 0;

    const numberOfCombinations = Math.pow(characterSetSize, passwordLength);
    const timeInSeconds = numberOfCombinations / attemptsPerSecond;
    return timeInSeconds;
}

function formatTime(seconds) {
    if (seconds < 1) return `${(seconds * 1000).toFixed(2)} milisegundos`;
    if (seconds < 60) return `${seconds.toFixed(2)} segundos`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(2)} minutos`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(2)} horas`;
    if (seconds < 31536000) return `${(seconds / 86400).toFixed(2)} días`;
    if (seconds < 31536000000) return `${(seconds / 31536000).toFixed(2)} años`;
    return `más de ${Math.floor(seconds / 31536000000)} billones de años`; // Para tiempos extremadamente largos
}

function updateChart(currentPasswordLength) {
    const labels = [];
    const data = [];

    // Generar datos para el gráfico: desde 1 hasta la longitud actual + un poco más
    const maxLen = Math.max(currentPasswordLength + 5, 10); // Asegura que el gráfico tenga al menos 10 puntos

    for (let i = 1; i <= maxLen; i++) {
        labels.push(`${i} car.`);
        data.push(calculateDecryptionTime(i));
    }

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    } else {
        chart = new Chart(timeChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tiempo de Desencriptación (segundos)',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'logarithmic', // ¡Muy importante para ver la exponencialidad!
                        title: {
                            display: true,
                            text: 'Tiempo (segundos, escala logarítmica)'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                // Formatear los ticks del eje Y para que sean legibles
                                if (value >= 1000000000000) return (value / 1000000000000).toFixed(0) + 'T';
                                if (value >= 1000000000) return (value / 1000000000).toFixed(0) + 'B';
                                if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                                return value.toFixed(0);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Longitud de la Contraseña'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatTime(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
}

passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const passwordLength = password.length;
    const time = calculateDecryptionTime(passwordLength);
    decryptionTimeSpan.textContent = formatTime(time);
    updateChart(passwordLength);
});

// Inicializar el gráfico al cargar la página
updateChart(0);