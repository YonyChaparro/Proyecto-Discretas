const passwordInput = document.getElementById('passwordInput');
const decryptionTimeHumanSpan = document.getElementById('decryptionTimeHuman');
const decryptionTimeComputerSpan = document.getElementById('decryptionTimeComputer');

const chkLowercase = document.getElementById('chkLowercase');
const chkUppercase = document.getElementById('chkUppercase');
const chkNumbers = document.getElementById('chkNumbers');
const chkSymbols = document.getElementById('chkSymbols');

const characterCheckboxes = [chkLowercase, chkUppercase, chkNumbers, chkSymbols];

const alphabetSizeSpan = document.getElementById('alphabetSize');
const passwordLengthSpan = document.getElementById('passwordLength');
const totalCombinationsSpan = document.getElementById('totalCombinations');

const ALPHABETS = {
    lowercase: 'abcdefghijklmnñopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()-_+=[]{}|;:,.<>?/~`"\'\\'
};

const ALPHABET_SIZES = {
    lowercase: ALPHABETS.lowercase.length,
    uppercase: ALPHABETS.uppercase.length,
    numbers: ALPHABETS.numbers.length,
    symbols: ALPHABETS.symbols.length
};

const attemptsPerSecondHuman = 0.5;
const attemptsPerSecondComputer = 1_000_000_000;

let humanChart;
let computerChart;

let historicalDataHuman = [];
let historicalDataComputer = [];

let previousPasswordLength = 0;

function getPermittedCharacterSet() {
    let permittedChars = '';
    if (chkLowercase.checked) permittedChars += ALPHABETS.lowercase;
    if (chkUppercase.checked) permittedChars += ALPHABETS.uppercase;
    if (chkNumbers.checked) permittedChars += ALPHABETS.numbers;
    if (chkSymbols.checked) permittedChars += ALPHABETS.symbols;
    return permittedChars;
}

function getCharacterSetSize() {
    let size = 0;
    if (chkLowercase.checked) size += ALPHABET_SIZES.lowercase;
    if (chkUppercase.checked) size += ALPHABET_SIZES.uppercase;
    if (chkNumbers.checked) size += ALPHABET_SIZES.numbers;
    if (chkSymbols.checked) size += ALPHABET_SIZES.symbols;
    return Math.max(size, 1);
}

function calculateDecryptionTime(passwordLength, currentCharacterSetSize, attemptsPerSec) {
    if (passwordLength === 0) {
        return 0;
    }
    const numberOfCombinations = Math.pow(currentCharacterSetSize, passwordLength);
    const timeInSeconds = numberOfCombinations / attemptsPerSec;
    return timeInSeconds;
}

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

function updateDecryptionAnalysis() {
    const permittedCharacterSet = getPermittedCharacterSet();
    let password = passwordInput.value;
    let newPassword = '';
    for (let i = 0; i < password.length; i++) {
        const char = password[i];
        if (permittedCharacterSet.includes(char)) {
            newPassword += char;
        }
    }
    passwordInput.value = newPassword;
    password = newPassword;

    const currentPasswordLength = password.length;
    const currentCharacterSetSize = getCharacterSetSize();
    const totalCombinations = Math.pow(currentCharacterSetSize, currentPasswordLength);

    const disableCheckboxes = currentPasswordLength > 0;
    characterCheckboxes.forEach(checkbox => {
        checkbox.disabled = disableCheckboxes;
    });

    const lengthChanged = currentPasswordLength !== previousPasswordLength;
    const charSetChanged = !disableCheckboxes && historicalDataHuman.length > 0 && historicalDataHuman[historicalDataHuman.length - 1].charSetSize !== currentCharacterSetSize;

    if (lengthChanged || charSetChanged) {
        if (currentPasswordLength < previousPasswordLength || charSetChanged) {
            historicalDataHuman = [];
            historicalDataComputer = [];
        }
        
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
        previousPasswordLength = currentPasswordLength;
    }

    const currentTimeHuman = calculateDecryptionTime(currentPasswordLength, currentCharacterSetSize, attemptsPerSecondHuman);
    const currentTimeComputer = calculateDecryptionTime(currentPasswordLength, currentCharacterSetSize, attemptsPerSecondComputer);
    
    decryptionTimeHumanSpan.textContent = formatTime(currentTimeHuman);
    decryptionTimeComputerSpan.textContent = formatTime(currentTimeComputer);

    alphabetSizeSpan.textContent = currentCharacterSetSize;
    passwordLengthSpan.textContent = currentPasswordLength;
    totalCombinationsSpan.textContent = totalCombinations.toLocaleString('en-US', {useGrouping: true, maximumFractionDigits: 0});

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

passwordInput.addEventListener('input', updateDecryptionAnalysis);

characterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        historicalDataHuman = [];
        historicalDataComputer = [];
        previousPasswordLength = 0;
        updateDecryptionAnalysis();
    });
});

updateDecryptionAnalysis();