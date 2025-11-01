const imageInput = document.getElementById('petImage');
const imagePreview = document.getElementById('imagePreview');
const addPetForm = document.getElementById('addPetForm');

// Handle image upload and preview
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Handle form submission
addPetForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const petData = {
        name: document.getElementById('petName').value,
        species: document.getElementById('petSpecies').value,
        breed: document.getElementById('petBreed').value,
        age: document.getElementById('petAge').value,
        weight: document.getElementById('petWeight').value,
        gender: document.getElementById('petGender').value,
        medicalHistory: document.getElementById('petMedicalHistory').value,
        image: imagePreview.src
    };

    // Here you would typically send the data to your backend
    console.log('Pet Data:', petData);
    
    // Redirect to dashboard or show success message
    alert('Pet added successfully!');
    window.location.href = 'dashboard.html';
});
