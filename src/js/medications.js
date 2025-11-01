const modal = document.getElementById('medModal');
const petNameSpan = document.getElementById('petName');
const closeBtn = document.querySelector('.close-modal');

function openMedModal(petName) {
    modal.style.display = 'block';
    petNameSpan.textContent = petName;
}

function closeMedModal() {
    modal.style.display = 'none';
}

// Close modal when clicking close button or outside
closeBtn.addEventListener('click', closeMedModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeMedModal();
    }
});

// Example data structure for medications
const medications = {
    'Max': [
        {
            name: 'Heartworm Prevention',
            schedule: 'Monthly, Every 1st of the month',
            nextDose: '2024-02-01'
        }
    ]
};

const medFormModal = document.getElementById('medFormModal');
const medForm = document.getElementById('medForm');
const addMedBtn = document.querySelector('.add-med-btn');

function openMedFormModal() {
    medFormModal.style.display = 'block';
    medModal.style.display = 'none';
}

function closeMedFormModal() {
    medFormModal.style.display = 'none';
    medModal.style.display = 'block';
}

addMedBtn.addEventListener('click', openMedFormModal);

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        document.getElementById(modalId).style.display = 'none';
    });
});

medForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newMed = {
        name: document.getElementById('medName').value,
        dosage: document.getElementById('medDosage').value,
        frequency: document.getElementById('medFrequency').value,
        duration: document.getElementById('medDuration').value,
        startDate: document.getElementById('medStartDate').value,
        notes: document.getElementById('medNotes').value
    };
    
    // Add to medications array
    if (!medications[currentPet]) {
        medications[currentPet] = [];
    }
    medications[currentPet].push(newMed);
    
    // Update UI and close form
    updateMedicationsList();
    closeMedFormModal();
    medForm.reset();
});

function updateMedicationsList() {
    const medList = document.querySelector('.med-list');
    const medCount = medications[currentPet]?.length || 0;
    
    // Update medication count badge
    const medBtn = document.querySelector(`[onclick="openMedModal('${currentPet}')"]`);
    const countBadge = medBtn.querySelector('.med-count');
    countBadge.textContent = medCount;
    
    // Update medication list
    medList.innerHTML = '';
    
    medications[currentPet]?.forEach((med, index) => {
        const medItem = document.createElement('div');
        medItem.className = 'med-item';
        medItem.innerHTML = `
            <div class="med-info">
                <h4>${med.name}</h4>
                <p>${med.dosage} - ${med.frequency}x daily for ${med.duration} days</p>
                <p>Starting: ${med.startDate}</p>
            </div>
            <div class="med-actions">
                <button class="edit-med" onclick="editMedication(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-med" onclick="deleteMedication(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        medList.appendChild(medItem);
    });
}
