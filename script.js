const form = document.getElementById('ogledzinyForm');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const progressFill = document.getElementById('progressFill');
    const saveIndicator = document.getElementById('saveIndicator');
    const successMessage = document.getElementById('successMessage');
    let currentSlot = 1;

    function checkFormCleanliness() {
        const inputs = form.querySelectorAll('input, select, textarea');
        let filledCount = 0;
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                if (input.checked) {
                    filledCount++;
                }
            } else if (input.value && input.value.trim() !== '') {
                filledCount++;
            }
        });

        const jsonLoaderContainer = document.getElementById('jsonLoaderContainer');
        if (filledCount === 0) {
            jsonLoaderContainer.style.display = 'block';
        } else {
            jsonLoaderContainer.style.display = 'none';
        }
    }

    // Obsługa przycisków oceny
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const fieldName = btn.dataset.field;
            const value = btn.dataset.value;

            // Usuń klasę active z wszystkich przycisków dla tego pola
            document.querySelectorAll(`[data-field="${fieldName}"]`).forEach(b => {
                b.classList.remove('active');
            });

            // Dodaj klasę active do klikniętego przycisku
            btn.classList.add('active');

            // Ustaw wartość w ukrytym polu input
            document.getElementById(fieldName).value = value;

            updateProgress();
            saveFormData();
            checkFormCleanliness();
        });
    });

    // Pobranie danych z formularza
    function getFormData() {
        const formData = new FormData(form);
        const data = {
            timestamp: new Date().toISOString(),
            formularz: {}
        };

        // Zbierz wszystkie dane
        for (let [key, value] of formData.entries()) {
            if (key.startsWith('typOkien') || key.startsWith('komorOkien')) {
                // Dla checkboxów - zbierz wszystkie wartości
                if (!data.formularz[key]) {
                    data.formularz[key] = [];
                }
                data.formularz[key].push(value);
            } else if (data.formularz[key]) {
                // Jeśli już istnieje, zamień na tablicę
                if (!Array.isArray(data.formularz[key])) {
                    data.formularz[key] = [data.formularz[key]];
                }
                data.formularz[key].push(value);
            } else {
                data.formularz[key] = value;
            }
        }

        return data;
    }

    // Aktualizuj pasek postępu
    function updateProgress() {
        const inputs = form.querySelectorAll('input, select, textarea');
        let filled = 0;

        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                if (input.checked) filled++;
            } else if (input.value && input.value.trim() !== '') {
                filled++;
            }
        });

        const percentage = Math.round((filled / inputs.length) * 100);
        progressFill.style.width = percentage + '%';

        // Pokażł wiadomość o powodzeniu jeśli wypełnione powyżej 50%
        if (percentage > 50) {
            successMessage.classList.add('show');
        }
    }

    // Zapisz dane w localStorage
    function saveFormData() {
        const data = getFormData();
        localStorage.setItem(`ogledzinyFormData_${currentSlot}`, JSON.stringify(data));

        // Pokaż wskaźnik zapisania
        saveIndicator.classList.add('show');
        setTimeout(() => {
            saveIndicator.classList.remove('show');
        }, 2000);
    }

    // Załaduj dane z localStorage
    function loadFormData(slot = currentSlot) {
        const saved = localStorage.getItem(`ogledzinyFormData_${slot}`);
        form.reset(); // Najpierw wyczyść formularz
        document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('input[type="hidden"]').forEach(input => input.value = '');

        if (saved) {
            try {
                const data = JSON.parse(saved);

                // Załaduj dane do formularza
                for (let [key, value] of Object.entries(data.formularz)) {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox' || input.type === 'radio') {
                            if (Array.isArray(value)) {
                                value.forEach(v => {
                                    const elem = form.querySelector(`[name="${key}"][value="${v}"]`);
                                    if (elem) elem.checked = true;
                                });
                            } else {
                                if (input.value === value) input.checked = true;
                            }
                        } else {
                            input.value = value;
                        }
                    }
                }

                // Przywróć oceny
                for (let i = 1; i <= 5; i++) {
                    const fields = ['ocenaStan', 'ocenaMetraż', 'ocenaOświetlenie', 'ocenaTransport', 'ocenaBezpieczeństwo', 'ocenaFinałowa'];
                    fields.forEach(field => {
                        const hiddenInput = form.querySelector(`#${field}`);
                        if (hiddenInput && hiddenInput.value) {
                            const btn = form.querySelector(`[data-field="${field}"][data-value="${hiddenInput.value}"]`);
                            if (btn) btn.classList.add('active');
                        }
                    });
                }

                updateProgress();
            } catch (e) {
                console.error('Błąd przy wczytywaniu danych:', e);
            }
        }
        updateProgress();
        checkFormCleanliness();
        updateKosztZaMetr();
    }

    // Pobierz formularz jako JSON
    downloadBtn.addEventListener('click', () => {
        const data = getFormData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ogledziny_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // Wyczyść formularz
    resetBtn.addEventListener('click', () => {
        if (confirm(`Czy na pewno chcesz wyczyścić dane w Zapisie ${currentSlot}?`)) {
            form.reset();
            document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('input[type="hidden"]').forEach(input => input.value = '');
            localStorage.removeItem(`ogledzinyFormData_${currentSlot}`);
            progressFill.style.width = '0%';
            successMessage.classList.remove('show');
            checkFormCleanliness();
            updateKosztZaMetr();
        }
    });

    // Dodaj automatyczny zapis po każdej zmianie w polach formularza
    form.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('change', () => {
            updateProgress();
            saveFormData();
            checkFormCleanliness();
        });
    });

    // Automatyczne liczenie kosztu za metr kwadratowy
    function updateKosztZaMetr() {
        const cena = parseFloat(document.getElementById('cena').value.replace(',', '.'));
        const metraz = parseFloat(document.getElementById('metrażPodany').value.replace(',', '.'));
        const kosztInput = document.getElementById('kosztZaMetr');
        if (!isNaN(cena) && !isNaN(metraz) && metraz > 0) {
            kosztInput.value = Math.round((cena / metraz) * 100) / 100;
        } else {
            kosztInput.value = '';
        }
    }
    document.getElementById('cena').addEventListener('input', updateKosztZaMetr);
    document.getElementById('metrażPodany').addEventListener('input', updateKosztZaMetr);

    // Obsługa przełączania slotów
    document.querySelectorAll('.slot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const slotNumber = btn.id.replace('slotBtn', '');
            currentSlot = parseInt(slotNumber, 10);

            document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            loadFormData(currentSlot);
        });
    });

    // Załaduj dane przy starcie
    window.addEventListener('load', () => {
        loadFormData(currentSlot);
        checkFormCleanliness();
        updateKosztZaMetr();
    });

    // Aktualizuj pasek postępu na starcie
    updateProgress();

    // Ładowanie danych z pliku JSON
    document.getElementById('loadJsonBtn').addEventListener('click', function() {
        const fileInput = document.getElementById('jsonLoader');
        if (!fileInput.files.length) {
            alert('Wybierz plik JSON!');
            return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            const formData = data.formularz || data; // Handle both structures

            function populateForm(obj, prefix = '') {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        const newKey = prefix ? `${prefix}_${key}` : key;
                        const value = obj[key];

                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            populateForm(value, newKey);
                        } else {
                            const elements = document.getElementsByName(newKey);
                            if (elements.length > 0) {
                                if (elements[0].type === 'radio') {
                                    document.querySelector(`input[name="${newKey}"][value="${value}"]`).checked = true;
                                } else if (elements[0].type === 'checkbox') {
                                    if (Array.isArray(value)) {
                                        value.forEach(v => {
                                            const el = document.querySelector(`input[name="${newKey}"][value="${v}"]`);
                                            if (el) el.checked = true;
                                        });
                                    } else {
                                        const el = document.querySelector(`input[name="${newKey}"][value="${value}"]`);
                                        if (el) el.checked = true;
                                    }
                                } else {
                                    elements[0].value = value;
                                }
                            } else {
                                const element = document.getElementById(newKey);
                                if (element) {
                                    if (element.type === 'hidden' && element.name.startsWith('ocena')) {
                                        element.value = value;
                                        const ratingButtons = document.querySelectorAll(`[data-field="${element.id}"]`);
                                        ratingButtons.forEach(btn => {
                                            btn.classList.remove('active');
                                            if (btn.dataset.value === value) {
                                                btn.classList.add('active');
                                            }
                                        });
                                    } else {
                                        element.value = value;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            form.reset();
            document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('active'));
            populateForm(formData);
            updateProgress();
            saveFormData();
            successMessage.classList.add('show');
            checkFormCleanliness();
            updateKosztZaMetr();
        };
        reader.readAsText(file);
    });

    // Collapsible sections
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', function() {
            const section = header.parentElement;
            const expanded = section.classList.toggle('collapsed');
            header.setAttribute('aria-expanded', !expanded);
        });
        header.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });