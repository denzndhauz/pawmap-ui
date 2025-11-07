let map;
let markers = [];
let petShopMarkers = [];
let infoWindow;
let savedLocations = [];
let nearestLocations = [];

async function initMap() {
    try {
        // Load required libraries
        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
        const { PlacesService } = await google.maps.importLibrary("places");
        
        // Get user's location first
        const position = await getCurrentLocation();
        const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        // Initialize map centered on user's location
        map = new Map(document.getElementById('map'), {
            center: userLocation,
            zoom: 14,
            mapId: 'PAWMAP_MAP_ID',
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            },
            restriction: {
                strictBounds: false,
            }
        });

        infoWindow = new google.maps.InfoWindow();
        const service = new PlacesService(map);

        // Add user location marker
        const userMarker = new AdvancedMarkerElement({
            map,
            position: userLocation,
            title: 'Your Location',
            content: new PinElement({
                background: '#4FB3E8',
                borderColor: '#ffffff',
                glyphColor: '#ffffff',
                scale: 1.2
            }).element,
            zIndex: 999
        });

        // Add accuracy circle
        new google.maps.Circle({
            map: map,
            center: userLocation,
            radius: position.coords.accuracy || 100,
            strokeColor: '#4FB3E8',
            strokeOpacity: 0.2,
            strokeWeight: 1,
            fillColor: '#4FB3E8',
            fillOpacity: 0.1
        });

        // Store user location globally for reference
        window.userLocation = userLocation;

        // Search for nearby places immediately
        searchNearbyPlaces(service, userLocation);

        // Initialize search functionality
        setupSearch(service);
        
    } catch (error) {
        console.error('Error getting location:', error);
        // Fallback to default location if geolocation fails
        await initMapWithFallback();
    }
}

async function initMapWithFallback() {
    const { Map } = await google.maps.importLibrary("maps");
    const { PlacesService } = await google.maps.importLibrary("places");
    
    // Default location (you can change this to any default coordinates)
    const defaultLocation = { lat: 40.7128, lng: -74.0060 }; // New York City
    
    map = new Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 14,
        mapId: 'PAWMAP_MAP_ID',
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
        }
    });

    infoWindow = new google.maps.InfoWindow();
    const service = new PlacesService(map);
    
    setupSearch(service);
    handleLocationError(true, infoWindow, defaultLocation);
}

function setupSearch(service) {
    // Initialize Places service
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const searchBox = new google.maps.places.SearchBox(searchInput);

        map.addListener('bounds_changed', () => {
            searchBox.setBounds(map.getBounds());
        });

        searchBox.addListener('places_changed', () => {
            const places = searchBox.getPlaces();
            if (places.length > 0) {
                searchNearbyPlaces(service, places[0].geometry.location);
            }
        });
    }

    // Locate me button
    const locateBtn = document.getElementById('locate-me');
    if (locateBtn) {
        locateBtn.addEventListener('click', async () => {
            try {
                const position = await getCurrentLocation();
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(pos);
                map.setZoom(14);
                searchNearbyPlaces(service, pos);
            } catch (error) {
                handleLocationError(true, infoWindow, map.getCenter());
            }
        });
    }
}

// Load saved locations when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSavedLocations();
    loadNearestLocations();
    
    // Initialize map when Google Maps is ready
    if (typeof google !== 'undefined' && google.maps && google.maps.importLibrary) {
        initMap().catch(error => {
            console.error('Error initializing map:', error);
        });
    } else {
        // Wait for Google Maps to load
        window.addEventListener('load', () => {
            initMap().catch(error => {
                console.error('Error initializing map:', error);
            });
        });
    }
    
    // Add filter functionality
    setTimeout(() => {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (type === 'saved') {
                    showSavedLocations();
                } else if (type === 'nearest') {
                    showNearestLocations();
                } else {
                    document.querySelectorAll('.place-item').forEach(item => {
                        if (type === 'all' || item.querySelector(`.place-type.${type}`)) {
                            item.style.display = 'block';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                }
            });
        });
    }, 100);
});

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? "Error: The Geolocation service failed."
            : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

function clearMarkers() {
    // Clear all existing markers from the map
    if (markers) {
        markers.forEach(marker => marker.setMap(null));
        markers = [];
    }
}

async function createMarker(place, type) {
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
    
    const marker = new AdvancedMarkerElement({
        map,
        position: place.geometry.location,
        title: place.name,
        content: new PinElement({
            background: type === 'vet' ? '#4FB3E8' : '#FF8C00',
            borderColor: '#FFFFFF',
            scale: 1
        }).element
    });

    markers.push(marker);

    marker.addListener('click', () => {
        const content = `
            <div class="info-window">
                <h3>${place.name}</h3>
                <p>${place.vicinity || place.formatted_address}</p>
                ${place.rating ? `<p>Rating: ${place.rating}/5</p>` : ''}
                ${place.distance ? `<p>Distance: ${place.distance.toFixed(1)} km</p>` : ''}
            </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
    });

    return marker;
}

function searchNearbyPlaces(service, userLocation) {
    clearMarkers();
    const placesList = document.querySelector('.places-list');
    placesList.innerHTML = '<div style="padding: 20px; text-align: center;">Loading nearby places...</div>';
    
    const places = [];
    let completedSearches = 0;
    const totalSearches = 2;

    const searchTypes = [
        { type: 'veterinary_care', label: 'vet' },
        { type: 'pet_store', label: 'petshop' }
    ];

    searchTypes.forEach(({ type, label }) => {
        const request = {
            location: userLocation,
            radius: '5000',
            type: type
        };

        service.nearbySearch(request, (results, status) => {
            completedSearches++;
            
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                results.forEach(place => {
                    // Calculate distance from user
                    const distance = calculateDistance(
                        userLocation.lat, 
                        userLocation.lng,
                        place.geometry.location.lat(),
                        place.geometry.location.lng()
                    );
                    
                    places.push({
                        ...place,
                        distance,
                        type: label
                    });
                });
            }

            // Process results only after all searches complete
            if (completedSearches === totalSearches) {
                placesList.innerHTML = '';
                
                if (places.length > 0) {
                    places.sort((a, b) => a.distance - b.distance);
                    places.forEach(place => {
                        createMarker(place, place.type);
                        getPlaceDetails(service, place, place.type);
                    });
                    
                    // Ensure map stays centered on user location after markers are added
                    setTimeout(() => {
                        map.setCenter(userLocation);
                        map.setZoom(14);
                    }, 500);
                } else {
                    placesList.innerHTML = '<div style="padding: 20px; text-align: center;">No nearby places found.</div>';
                }
            }
        });
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(value) {
    return value * Math.PI / 180;
}

function getPlaceDetails(service, place, type) {
    const request = {
        placeId: place.place_id,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'opening_hours']
    };

    service.getDetails(request, (details, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Add distance to details object
            details.distance = place.distance;
            createPlaceListItem(details, type);
        }
    });
}

function loadSavedLocations() {
    const saved = localStorage.getItem('pawmapSavedLocations');
    if (saved) {
        savedLocations = JSON.parse(saved);
    }
}

function savePlaceToStorage(place) {
    const placeData = {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        type: place.type,
        location: {
            lat: typeof place.geometry.location.lat === 'function' 
                ? place.geometry.location.lat() 
                : place.geometry.location.lat,
            lng: typeof place.geometry.location.lng === 'function' 
                ? place.geometry.location.lng() 
                : place.geometry.location.lng
        }
    };

    if (!savedLocations.some(loc => loc.id === placeData.id)) {
        savedLocations.push(placeData);
        localStorage.setItem('pawmapSavedLocations', JSON.stringify(savedLocations));
    }
}

function removeSavedPlace(placeId) {
    savedLocations = savedLocations.filter(loc => loc.id !== placeId);
    localStorage.setItem('pawmapSavedLocations', JSON.stringify(savedLocations));
}

function loadNearestLocations() {
    const nearest = localStorage.getItem('pawmapNearestLocations');
    if (nearest) {
        nearestLocations = JSON.parse(nearest);
    }
}

function saveToNearest(place) {
    const placeData = {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        type: place.type,
        distance: place.distance,
        location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        }
    };

    if (!nearestLocations.some(loc => loc.id === placeData.id)) {
        nearestLocations.push(placeData);
        nearestLocations.sort((a, b) => a.distance - b.distance);
        localStorage.setItem('pawmapNearestLocations', JSON.stringify(nearestLocations));
    }
}

function createPlaceListItem(place, type) {
    const placesList = document.querySelector('.places-list');
    const isSaved = savedLocations.some(loc => loc.id === place.place_id);
    
    const item = document.createElement('div');
    item.className = 'place-item';
    item.innerHTML = `
        <span class="place-type ${type}">${type === 'vet' ? 'Veterinary' : 'Pet Shop'}</span>
        <h3>${place.name}</h3>
        <div class="place-contact">
            ${place.formatted_phone_number ? `
                <p><i class="fas fa-phone"></i> ${place.formatted_phone_number}</p>
            ` : ''}
            <p><i class="fas fa-map-marker-alt"></i> ${place.formatted_address}</p>
            ${place.rating ? `
                <p><i class="fas fa-star"></i> ${place.rating}/5</p>
            ` : ''}
            ${place.distance ? `
                <p><i class="fas fa-road"></i> ${place.distance.toFixed(1)} km away</p>
            ` : ''}
        </div>
        <div class="place-actions">
            <button class="save-location-btn ${isSaved ? 'saved' : ''}" data-place-id="${place.place_id}">
                <i class="fas ${isSaved ? 'fa-bookmark' : 'fa-bookmark-o'}"></i>
                ${isSaved ? 'Saved' : 'Save Location'}
            </button>
            <button class="nearest-btn" data-place-id="${place.place_id}">
                <i class="fas fa-star"></i> Add to Nearest
            </button>
        </div>
    `;

    const saveBtn = item.querySelector('.save-location-btn');
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isSaved) {
            savePlaceToStorage(place);
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
        } else {
            removeSavedPlace(place.place_id);
            saveBtn.classList.remove('saved');
            saveBtn.innerHTML = '<i class="fas fa-bookmark-o"></i> Save Location';
        }
    });

    const nearestBtn = item.querySelector('.nearest-btn');
    nearestBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveToNearest(place);
        nearestBtn.disabled = true;
        nearestBtn.innerHTML = '<i class="fas fa-check"></i> Added to Nearest';
    });

    item.addEventListener('click', () => {
        if (place.geometry && place.geometry.location) {
            const location = typeof place.geometry.location.lat === 'function'
                ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
                : place.geometry.location;
            
            map.setCenter(location);
            map.setZoom(15);
            
            const marker = markers.find(m => m.title === place.name);
            if (marker) {
                infoWindow.setContent(item.innerHTML);
                infoWindow.open(map, marker);
            }
        }
    });

    placesList.appendChild(item);
}

// Add missing functions for filter functionality
function showSavedLocations() {
    const placesList = document.querySelector('.places-list');
    placesList.innerHTML = '';
    
    savedLocations.forEach(place => {
        const item = document.createElement('div');
        item.className = 'place-item';
        item.innerHTML = `
            <span class="place-type ${place.type}">${place.type === 'vet' ? 'Veterinary' : 'Pet Shop'}</span>
            <h3>${place.name}</h3>
            <div class="place-contact">
                ${place.phone ? `<p><i class="fas fa-phone"></i> ${place.phone}</p>` : ''}
                <p><i class="fas fa-map-marker-alt"></i> ${place.address}</p>
            </div>
            <button class="save-location-btn saved" data-place-id="${place.id}">
                <i class="fas fa-bookmark"></i> Saved
            </button>
        `;
        placesList.appendChild(item);
    });
}

function showNearestLocations() {
    const placesList = document.querySelector('.places-list');
    placesList.innerHTML = '';
    
    nearestLocations.forEach(place => {
        const item = document.createElement('div');
        item.className = 'place-item';
        item.innerHTML = `
            <span class="place-type ${place.type}">${place.type === 'vet' ? 'Veterinary' : 'Pet Shop'}</span>
            <h3>${place.name}</h3>
            <div class="place-contact">
                ${place.phone ? `<p><i class="fas fa-phone"></i> ${place.phone}</p>` : ''}
                <p><i class="fas fa-map-marker-alt"></i> ${place.address}</p>
                <p><i class="fas fa-road"></i> ${place.distance.toFixed(1)} km away</p>
            </div>
        `;
        placesList.appendChild(item);
    });
}
