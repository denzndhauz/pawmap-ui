let map;
let markers = [];
let petShopMarkers = [];
let infoWindow;
let savedLocations = [];
let nearestLocations = [];
let allPlaces = []; // Store all loaded places for filtering

function initMap() {
    // Prevent double initialization
    if (window.mapInitialized) {
        return;
    }
    window.mapInitialized = true;

    try {
        console.log('Initializing Google Maps...');
        
        // Check if Google Maps API is available
        if (typeof google === 'undefined' || !google.maps) {
            throw new Error('Google Maps API not loaded');
        }

        console.log('Google Maps API loaded successfully');

        // Get user's location first
        getCurrentLocation()
            .then(position => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Initialize map with traditional API
                map = new google.maps.Map(document.getElementById('map'), {
                    center: userLocation,
                    zoom: 14,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    streetViewControl: false,
                    zoomControlOptions: {
                        position: google.maps.ControlPosition.RIGHT_CENTER
                    }
                });

                infoWindow = new google.maps.InfoWindow();
                const service = new google.maps.places.PlacesService(map);

                // Add user location marker
                const userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Your Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#4FB3E8',
                        fillOpacity: 0.8,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 10
                    },
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

                // Store user location globally
                window.userLocation = userLocation;

                // Search for nearby places
                searchNearbyPlaces(service, userLocation);

                // Setup search functionality
                setupSearch(service);
            })
            .catch(error => {
                console.error('Geolocation error:', error);
                initMapWithFallback();
            });
        
    } catch (error) {
        console.error('Error initializing map:', error);
        showMapError(error.message);
    }
}

function showMapError(message) {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; text-align: center; padding: 20px;">
                <div>
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: #ff6b6b;"></i>
                    <h3>Map Loading Error</h3>
                    <p>${message}</p>
                    <div style="margin-top: 20px; font-size: 14px; text-align: left; background: #fff; padding: 15px; border-radius: 5px;">
                        <strong>Troubleshooting steps:</strong><br>
                        1. Check Google Cloud Console for API key status<br>
                        2. Verify that Maps JavaScript API is enabled<br>
                        3. Verify that Places API is enabled<br>
                        4. Check API key restrictions (allow your domain)<br>
                        5. Ensure billing is enabled and within quota limits<br>
                        6. Try refreshing the page
                    </div>
                </div>
            </div>
        `;
    }
}

async function initMapWithFallback() {
    // Default location (you can change this to any default coordinates)
    const defaultLocation = { lat: 40.7128, lng: -74.0060 }; // New York City
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 14,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
        }
    });

    infoWindow = new google.maps.InfoWindow();
    const service = new google.maps.places.PlacesService(map);
    
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
    
    // Set up the map initializer for the callback
    window.mapInitializer = function() {
        console.log('Map initializer called');
        initMap();
    };
    
    // Fallback in case callback doesn't work
    setTimeout(() => {
        if (typeof google !== 'undefined' && google.maps && !window.mapInitialized) {
            console.log('Fallback: Google Maps ready, initializing...');
            initMap();
        }
    }, 2000);
    
    // Add filter functionality
    setTimeout(() => {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                switch(type) {
                    case 'all':
                        showAllLocations();
                        break;
                    case 'saved':
                        showSavedLocations();
                        break;
                    case 'nearest':
                        showNearestLocations();
                        break;
                    case 'vet':
                        filterPlacesByType('vet');
                        break;
                    case 'petshop':
                        filterPlacesByType('petshop');
                        break;
                    default:
                        showAllLocations();
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

function createMarker(place, type) {
    const marker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: place.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: type === 'vet' ? '#4FB3E8' : '#FF8C00',
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: 8
        }
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
                    allPlaces = places; // Store all places for filtering
                    
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
                    allPlaces = [];
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
    // Handle cases where geometry might not be available
    let location = null;
    
    if (place.geometry && place.geometry.location) {
        location = {
            lat: typeof place.geometry.location.lat === 'function' 
                ? place.geometry.location.lat() 
                : place.geometry.location.lat,
            lng: typeof place.geometry.location.lng === 'function' 
                ? place.geometry.location.lng() 
                : place.geometry.location.lng
        };
    } else if (place.location) {
        // Fallback to direct location property if available
        location = place.location;
    }
    
    const placeData = {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        type: place.type,
        location: location
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
            // Add type to place object before saving
            place.type = type;
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
        // Add type to place object before saving
        place.type = type;
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
    
    if (nearestLocations.length === 0) {
        placesList.innerHTML = '<div style="padding: 20px; text-align: center;">No nearest locations saved yet.</div>';
        return;
    }
    
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
            <div class="place-actions">
                <button class="directions-btn" data-lat="${place.location.lat}" data-lng="${place.location.lng}" data-name="${place.name}">
                    <i class="fas fa-directions"></i> Get Directions
                </button>
                <button class="call-btn" ${place.phone ? `data-phone="${place.phone}"` : 'disabled'}>
                    <i class="fas fa-phone"></i> ${place.phone ? 'Call' : 'No Phone'}
                </button>
            </div>
        `;
        
        // Add directions button functionality
        const directionsBtn = item.querySelector('.directions-btn');
        directionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lat = e.target.closest('.directions-btn').dataset.lat;
            const lng = e.target.closest('.directions-btn').dataset.lng;
            const name = e.target.closest('.directions-btn').dataset.name;
            openDirections(lat, lng, name);
        });
        
        // Add call button functionality
        const callBtn = item.querySelector('.call-btn');
        if (place.phone) {
            callBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const phone = e.target.closest('.call-btn').dataset.phone;
                window.open(`tel:${phone}`, '_self');
            });
        }
        
        // Add click to center on map
        item.addEventListener('click', () => {
            if (place.location) {
                map.setCenter(place.location);
                map.setZoom(15);
                
                // Create info window content
                infoWindow.setContent(`
                    <div class="info-window">
                        <h3>${place.name}</h3>
                        <p>${place.address}</p>
                        <p>Distance: ${place.distance.toFixed(1)} km</p>
                        ${place.phone ? `<p>Phone: ${place.phone}</p>` : ''}
                    </div>
                `);
                infoWindow.setPosition(place.location);
                infoWindow.open(map);
            }
        });
        
        placesList.appendChild(item);
    });
}

function openDirections(lat, lng, placeName) {
    // Get user's current location for directions
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Create Google Maps directions URL
                const directionsUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${lat},${lng}/@${lat},${lng},15z/data=!4m2!4m1!3e0`;
                
                // Open in new tab/window
                window.open(directionsUrl, '_blank');
            },
            (error) => {
                console.error('Error getting current location:', error);
                // Fallback: open directions without start location
                const directionsUrl = `https://www.google.com/maps/dir//${lat},${lng}/@${lat},${lng},15z`;
                window.open(directionsUrl, '_blank');
            }
        );
    } else {
        // Fallback for browsers without geolocation
        const directionsUrl = `https://www.google.com/maps/dir//${lat},${lng}/@${lat},${lng},15z`;
        window.open(directionsUrl, '_blank');
    }
}

// ...existing code...
