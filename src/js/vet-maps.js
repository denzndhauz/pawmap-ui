let map;
let markers = [];
let petShopMarkers = [];
let infoWindow;

function initMap() {
    // Initialize map with a default center (will be updated with user's location)
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 14
    });

    infoWindow = new google.maps.InfoWindow();
    const service = new google.maps.places.PlacesService(map);

    // Get user's location immediately
    getCurrentLocation()
        .then(position => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // Add user location marker
            new google.maps.Marker({
                position: userLocation,
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#4FB3E8",
                    fillOpacity: 0.8,
                    strokeWeight: 2,
                    strokeColor: "#FFFFFF"
                },
                title: "Your Location"
            });

            map.setCenter(userLocation);
            
            // Search for both vets and pet shops
            searchNearbyPlaces(service, userLocation);
        })
        .catch(error => {
            console.error('Error getting location:', error);
            handleLocationError(true, infoWindow, map.getCenter());
        });

    // Initialize Places service
    const searchInput = document.getElementById('search-input');
    const searchBox = new google.maps.places.SearchBox(searchInput);

    map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener('places_changed', () => {
        searchNearbyVets(service, searchBox.getPlaces()[0].geometry.location);
    });

    // Locate me button
    document.getElementById('locate-me').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    map.setCenter(pos);
                    searchNearbyVets(service, pos);
                },
                () => {
                    handleLocationError(true, infoWindow, map.getCenter());
                }
            );
        }
    });
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
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

function searchNearbyPlaces(service, userLocation) {
    clearMarkers();
    const placesList = document.querySelector('.places-list');
    placesList.innerHTML = '';
    
    const places = [];

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

                // Sort and display places after all results are gathered
                if (places.length > 0) {
                    places.sort((a, b) => a.distance - b.distance);
                    places.forEach(place => {
                        createMarker(place, place.type);
                        getPlaceDetails(service, place, place.type);
                    });
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
            createPlaceListItem(details, type);
        }
    });
}

function createPlaceListItem(place, type) {
    const placesList = document.querySelector('.places-list');
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
            <p><i class="fas fa-road"></i> ${place.distance.toFixed(1)} km away</p>
            ${place.opening_hours ? `
                <p><i class="fas fa-clock"></i> ${place.opening_hours.open_now ? 'Open now' : 'Closed'}</p>
            ` : ''}
        </div>
    `;

    item.addEventListener('click', () => {
        map.setCenter(place.geometry.location);
        map.setZoom(15);
        infoWindow.setContent(item.innerHTML);
        const marker = markers.find(m => m.title === place.name);
        if (marker) infoWindow.open(map, marker);
    });

    placesList.appendChild(item);
}

// Add filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.place-item').forEach(item => {
            if (type === 'all' || item.querySelector(`.place-type.${type}`)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    petShopMarkers.forEach(marker => marker.setMap(null));
    petShopMarkers = [];
}

// Initialize map when the page loads
document.addEventListener('DOMContentLoaded', initMap);
